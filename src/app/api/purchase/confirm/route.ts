import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { StockLogType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      supplierName,
      supplierGstin,
      billNumber,
      billDate,
      items,
      totalTaxable,
      cgstAmount = 0,
      sgstAmount = 0,
      igstAmount = 0,
      totalAmount,
      confidenceScore,
    } = body;

    if (!supplierName || !billNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required purchase bill fields" }, { status: 400 });
    }

    const purchaseResult = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase Bill
      const bill = await tx.purchaseBill.create({
        data: {
          tenantId,
          billNumber,
          billDate: billDate ? new Date(billDate) : new Date(),
          supplierName,
          supplierGstin,
          totalTaxable: Number(totalTaxable || 0),
          cgstAmount: Number(cgstAmount || 0),
          sgstAmount: Number(sgstAmount || 0),
          igstAmount: Number(igstAmount || 0),
          totalAmount: Number(totalAmount || 0),
          aiConfidenceScore: confidenceScore ? Number(confidenceScore) : null,
          isConfirmed: true,
        },
      });

      // 2. Process each item
      for (const item of items) {
        const billedQty = Number(item.quantity || 1);
        const packageSize = Number(item.packageSize || 1);
        const billedUnit = (item.unit || "PCS").toUpperCase();
        const baseUnit = (item.baseUnit || "PCS").toUpperCase();
        const isPackaging = packageSize > 1 || (billedUnit !== baseUnit && billedUnit !== "PCS");

        // Base quantity entering inventory
        const effectiveBaseQty = Number(item.baseQuantity || (billedQty * packageSize));
        const purchasePrice = Number(item.purchasePrice || 0);
        const baseCost = Number(item.baseCostPrice || (purchasePrice / packageSize));
        const mrp = item.mrp ? Number(item.mrp) : null;
        const gstRate = Number(item.gstRate || 18);
        const lineTotal = Number(item.lineTotal || (purchasePrice * billedQty));

        // Find or create product
        let product = await tx.product.findFirst({
          where: {
            tenantId,
            name: { equals: item.productName, mode: "insensitive" },
          },
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              tenantId,
              name: item.productName,
              hsnCode: item.hsnCode || "9983",
              baseUnit: baseUnit,
              hasAltUnit: isPackaging,
              altUnit: isPackaging ? billedUnit : null,
              conversionFactor: isPackaging ? packageSize : 1.0,
              purchasePrice: baseCost,
              purchasePricePerAlt: isPackaging ? purchasePrice : null,
              sellingPrice: mrp ? mrp : Number((baseCost * 1.25).toFixed(2)),
              sellingPricePerAlt: isPackaging ? (mrp ? mrp * packageSize : Number((purchasePrice * 1.25).toFixed(2))) : null,
              mrp: mrp,
              gstRate: gstRate,
              currentStock: effectiveBaseQty,
              minStockAlert: 5,
            },
          });
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: { increment: effectiveBaseQty },
              purchasePrice: baseCost,
              ...(isPackaging && {
                hasAltUnit: true,
                altUnit: billedUnit,
                conversionFactor: packageSize,
                purchasePricePerAlt: purchasePrice,
              }),
              ...(mrp && { mrp: mrp }),
            },
          });
        }

        // 3. Create Purchase Bill Item
        await tx.purchaseBillItem.create({
          data: {
            purchaseBillId: bill.id,
            productId: product.id,
            productName: item.productName,
            hsnCode: item.hsnCode,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            unit: billedUnit,
            quantity: billedQty,
            packageSize: packageSize,
            baseQuantity: effectiveBaseQty,
            purchasePrice: purchasePrice,
            baseCostPrice: baseCost,
            mrp: mrp,
            gstRate: gstRate,
            lineTotal: lineTotal,
          },
        });

        // 4. Record Stock Log (Audit trail)
        await tx.stockLog.create({
          data: {
            tenantId,
            productId: product.id,
            changeQty: effectiveBaseQty,
            type: StockLogType.PURCHASE_IN,
            referenceId: billNumber,
            note: "AI Purchase In: " + billedQty + " " + billedUnit + " (" + effectiveBaseQty + " " + baseUnit + ") from " + supplierName + " (Bill #" + billNumber + ")",
          },
        });
      }

      // 5. Automated Double-Entry Accounting
      const { postPurchaseJournalEntry } = await import("@/lib/accounting-mapper");
      await postPurchaseJournalEntry(tx, tenantId, bill);

      return bill;
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      message: "Purchase bill verified and stock successfully updated in Neon DB!",
      bill: purchaseResult,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error confirming purchase bill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
