import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { KotStatus, TableStatus, PaymentMode, PaymentStatus, StockLogType } from "@prisma/client";
import { GstCalculator } from "@/lib/gst";
import { UpiService } from "@/lib/upi";
import { generateNextInvoiceNumber } from "@/lib/invoice-sequence";

export const dynamic = "force-dynamic";

// POST /api/restaurant/settle - Settle table, generate invoice, backflush recipes, reset table
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      tableId,
      customerName = "Dine-in Guest",
      customerPhone = "9999999999",
      paymentMode = "UPI",
    } = body;

    if (!tableId) {
      return NextResponse.json({ error: "Table ID is required" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, tenantId },
      include: {
        kots: {
          where: { status: { in: ["PREPARING", "SERVED"] } },
          include: {
            items: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Collect all items across active KOTs
    const aggregatedItems: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }[] = [];

    table.kots.forEach((kot) => {
      kot.items.forEach((item) => {
        const existing = aggregatedItems.find((x) => x.productId === item.productId);
        if (existing) {
          existing.quantity += Number(item.quantity);
        } else {
          aggregatedItems.push({
            productId: item.productId,
            productName: item.productName,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          });
        }
      });
    });

    if (aggregatedItems.length === 0) {
      // Empty table, just mark as VACANT
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.VACANT,
          currentTotal: 0,
          occupiedAt: null,
        },
      });
      return NextResponse.json({ success: true, message: "Table marked as vacant" });
    }

    const invoiceResult = await prisma.$transaction(async (tx) => {
      // Generate Invoice Number atomically inside transaction (race-condition safe)
      const { invoiceNumber } = await generateNextInvoiceNumber(tx, { tenantId });

      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const processedItems = [];

      for (const item of aggregatedItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            recipeIngredients: {
              include: { ingredient: true },
            },
          },
        });

        if (!product) continue;

        const qty = item.quantity;
        const lineTaxable = item.unitPrice * qty;
        subtotal += lineTaxable;

        const tax = GstCalculator.calculate(
          lineTaxable,
          Number(product.gstRate),
          tenant.stateCode,
          tenant.stateCode, // Dine-in is intra-state
          tenant.isComposition
        );

        totalCgst += tax.cgstAmount;
        totalSgst += tax.sgstAmount;

        processedItems.push({
          productId: product.id,
          productName: product.name,
          hsnCode: product.hsnCode,
          unitSold: product.baseUnit,
          quantity: qty,
          conversionFactor: 1,
          baseQuantity: qty,
          unitPrice: item.unitPrice,
          gstRate: Number(product.gstRate),
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: 0,
          lineTotal: tax.totalAmount,
        });

        // Backflushing: If product has recipe ingredients (e.g. Biryani -> Raw Chicken, Rice, Oil)
        if (product.recipeIngredients && product.recipeIngredients.length > 0) {
          for (const recipeItem of product.recipeIngredients) {
            const rawReqPerPortion = Number(recipeItem.quantityRequired);
            const wasteFactor = 1 + Number(recipeItem.wastePercentage || 0) / 100;
            const totalRawConsumed = Number((qty * rawReqPerPortion * wasteFactor).toFixed(3));

            await tx.product.update({
              where: { id: recipeItem.ingredientId },
              data: {
                currentStock: { decrement: totalRawConsumed },
              },
            });

            await tx.stockLog.create({
              data: {
                tenantId,
                productId: recipeItem.ingredientId,
                changeQty: -totalRawConsumed,
                type: StockLogType.CONSUMPTION_OUT,
                referenceId: invoiceNumber,
                note: `Restaurant Dine-in: ${totalRawConsumed} ${recipeItem.ingredient.baseUnit} consumed for Table ${table.name} (${qty}x ${product.name})`,
              },
            });
          }
        } else {
          // Finished goods / Beverage direct stock deduction
          await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: { decrement: qty },
            },
          });

          await tx.stockLog.create({
            data: {
              tenantId,
              productId: product.id,
              changeQty: -qty,
              type: StockLogType.SALE_OUT,
              referenceId: invoiceNumber,
              note: `Table ${table.name} Dine-in Sale: ${qty}x ${product.name}`,
            },
          });
        }
      }

      const totalTax = totalCgst + totalSgst + totalIgst;
      const totalAmount = Number((subtotal + totalTax).toFixed(2));

      const upiUri = UpiService.generateUpiUri({
        upiId: tenant.upiId,
        payeeName: tenant.businessName,
        amount: totalAmount,
        invoiceNumber,
        note: `Table ${table.name} Bill ${invoiceNumber}`,
      });

      // Create Customer Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          invoiceDate: new Date(),
          customerName: `${customerName} (${table.name})`,
          customerPhone: customerPhone || "9999999999",
          customerStateCode: tenant.stateCode,
          isInterState: false,
          subtotal,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: 0,
          totalTax,
          totalAmount,
          paidAmount: totalAmount,
          dueAmount: 0,
          paymentStatus: PaymentStatus.PAID,
          paymentMode: paymentMode as PaymentMode,
          upiUri,
          notes: `Settled from Table ${table.name} (${table.section})`,
          items: {
            create: processedItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Mark all KOTs as SETTLED
      await tx.kitchenOrderTicket.updateMany({
        where: {
          tableId,
          status: { in: [KotStatus.PREPARING, KotStatus.SERVED] },
        },
        data: {
          status: KotStatus.SETTLED,
          invoiceId: createdInvoice.id,
        },
      });

      // Free Table to VACANT
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.VACANT,
          currentTotal: 0,
          occupiedAt: null,
        },
      });

      return createdInvoice;
    });

    return NextResponse.json({
      success: true,
      invoice: invoiceResult,
      tableName: table.name,
      tenant: {
        businessName: tenant.businessName,
        gstin: tenant.gstin,
        phone: tenant.phone,
        address: tenant.address,
        upiId: tenant.upiId,
      },
    });
  } catch (error: any) {
    console.error("Error settling table:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
