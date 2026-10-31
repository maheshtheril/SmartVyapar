import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/lab/tests - List all diagnostic tests with their parameters and reference ranges
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tests = await prisma.labTest.findMany({
      where: { tenantId: session.tenantId },
      include: {
        parameters: {
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, tests });
  } catch (error: any) {
    console.error("Error in GET /api/lab/tests:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/lab/tests - Create a new diagnostic test and parameters
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const body = await req.json();
    const {
      code,
      name,
      department,
      specimenType = "Serum",
      price = 0,
      tatHours = 4,
      method,
      instructions,
      parameters = [],
    } = body;

    if (!code || !name || !department) {
      return NextResponse.json({ error: "Code, Name, and Department are required" }, { status: 400 });
    }

    // Create corresponding POS Product so test can be billed directly
    let product = await prisma.product.findFirst({
      where: { tenantId, sku: `LAB-${code.toUpperCase().trim()}` },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          tenantId,
          name: name.trim(),
          displayName: `${code.toUpperCase()} - ${name.trim()}`,
          sku: `LAB-${code.toUpperCase().trim()}`,
          barcode: `TEST-${code.toUpperCase().trim()}`,
          hsnCode: "999312",
          category: "DIAGNOSTIC_TEST",
          sellingPrice: Number(price) || 0,
          purchasePrice: 0,
          currentStock: 9999,
          gstRate: 0.0,
          isLabTest: true,
        },
      });
    }

    const test = await prisma.labTest.create({
      data: {
        tenantId,
        code: code.toUpperCase().trim(),
        name: name.trim(),
        department,
        specimenType,
        price: Number(price) || 0,
        tatHours: Number(tatHours) || 4,
        method: method?.trim() || null,
        instructions: instructions?.trim() || null,
        productId: product.id,
        parameters: {
          create: parameters.map((p: any, idx: number) => ({
            tenantId,
            name: p.name.trim(),
            code: p.code?.trim() || null,
            unit: p.unit?.trim() || null,
            orderIndex: idx + 1,
            maleMin: p.maleMin !== undefined && p.maleMin !== "" ? Number(p.maleMin) : null,
            maleMax: p.maleMax !== undefined && p.maleMax !== "" ? Number(p.maleMax) : null,
            femaleMin: p.femaleMin !== undefined && p.femaleMin !== "" ? Number(p.femaleMin) : null,
            femaleMax: p.femaleMax !== undefined && p.femaleMax !== "" ? Number(p.femaleMax) : null,
            childMin: p.childMin !== undefined && p.childMin !== "" ? Number(p.childMin) : null,
            childMax: p.childMax !== undefined && p.childMax !== "" ? Number(p.childMax) : null,
            generalMin: p.generalMin !== undefined && p.generalMin !== "" ? Number(p.generalMin) : null,
            generalMax: p.generalMax !== undefined && p.generalMax !== "" ? Number(p.generalMax) : null,
            criticalLow: p.criticalLow !== undefined && p.criticalLow !== "" ? Number(p.criticalLow) : null,
            criticalHigh: p.criticalHigh !== undefined && p.criticalHigh !== "" ? Number(p.criticalHigh) : null,
            referenceText: p.referenceText?.trim() || null,
            calculationFormula: p.calculationFormula?.trim() || null,
          })),
        },
      },
      include: {
        parameters: true,
      },
    });

    return NextResponse.json({ success: true, test });
  } catch (error: any) {
    console.error("Error in POST /api/lab/tests:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
