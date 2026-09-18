import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ProductType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/recipes - Fetch all menu items with their recipes & real food costs
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    // Fetch finished goods (dishes) with their recipe ingredients
    const recipes = await prisma.product.findMany({
      where: {
        tenantId,
        OR: [
          { productType: ProductType.FINISHED_GOOD },
          { recipeIngredients: { some: {} } },
        ],
      },
      include: {
        recipeIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Fetch available raw materials (ingredients) for the recipe builder
    const rawMaterials = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    // Calculate food cost for each recipe
    const recipesWithCost = recipes.map((dish) => {
      let totalFoodCost = 0;
      const ingredients = dish.recipeIngredients.map((r) => {
        const qtyReq = Number(r.quantityRequired);
        const waste = Number(r.wastePercentage || 0);
        const rawCostPerUnit = Number(r.ingredient.purchasePrice || 0);
        const lineCost = qtyReq * (1 + waste / 100) * rawCostPerUnit;
        totalFoodCost += lineCost;

        return {
          id: r.id,
          ingredientId: r.ingredientId,
          ingredientName: r.ingredient.name,
          baseUnit: r.ingredient.baseUnit,
          quantityRequired: qtyReq,
          wastePercentage: waste,
          unitCost: rawCostPerUnit,
          lineCost: Number(lineCost.toFixed(2)),
          currentRawStock: Number(r.ingredient.currentStock),
        };
      });

      const sellingPrice = Number(dish.sellingPrice);
      const grossMargin = sellingPrice > 0 ? Number((sellingPrice - totalFoodCost).toFixed(2)) : 0;
      const foodCostPercentage = sellingPrice > 0 ? Number(((totalFoodCost / sellingPrice) * 100).toFixed(1)) : 0;

      return {
        id: dish.id,
        name: dish.name,
        category: dish.category,
        sellingPrice,
        totalFoodCost: Number(totalFoodCost.toFixed(2)),
        grossMargin,
        foodCostPercentage,
        ingredients,
      };
    });

    return NextResponse.json({
      success: true,
      recipes: recipesWithCost,
      rawMaterials,
    });
  } catch (error: any) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/recipes - Save or update recipe ingredients for a dish
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      menuProductId,
      ingredients, // Array of { ingredientId, quantityRequired, wastePercentage }
    } = body;

    if (!menuProductId || !ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: "Missing menuProductId or ingredients list" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark menu product as FINISHED_GOOD
      await tx.product.update({
        where: { id: menuProductId },
        data: { productType: ProductType.FINISHED_GOOD },
      });

      // 2. Remove existing recipe items for this dish
      await tx.recipeItem.deleteMany({
        where: { tenantId, menuProductId },
      });

      // 3. Insert updated recipe items
      const createdItems = [];
      for (const ing of ingredients) {
        if (!ing.ingredientId || Number(ing.quantityRequired) <= 0) continue;

        const item = await tx.recipeItem.create({
          data: {
            tenantId,
            menuProductId,
            ingredientId: ing.ingredientId,
            quantityRequired: Number(ing.quantityRequired),
            wastePercentage: Number(ing.wastePercentage || 0),
          },
        });
        createdItems.push(item);
      }

      return createdItems;
    });

    return NextResponse.json({
      success: true,
      message: "Recipe saved successfully!",
      recipeItems: result,
    });
  } catch (error: any) {
    console.error("Error saving recipe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
