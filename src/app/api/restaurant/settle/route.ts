import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { KotStatus, TableStatus, PaymentMode, PaymentStatus, StockLogType } from "@prisma/client";
import { GstCalculator } from "@/lib/gst";
import { UpiService } from "@/lib/upi";
import { generateNextInvoiceNumber } from "@/lib/invoice-sequence";

export const dynamic = "force-dynamic";

// POST /api/restaurant/settle
// Body: { tableId, customerName?, customerPhone?, paymentMode?, itemIds?: string[] }
//  - itemIds omitted  -> settle everything still open on the table
//  - itemIds provided -> SPLIT BILL: settle only those KOT lines; the rest stay on the table
// Voided lines and already-paid lines are always skipped. Discounts and
// complimentary lines are honoured (complimentary = billed at 0, stock still consumed).
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      tableId,
      customerName = "Dine-in Guest",
      customerPhone = "",
      paymentMode = "UPI",
      itemIds,
    } = body;

    if (!tableId) {
      return NextResponse.json({ error: "Table ID is required" }, { status: 400 });
    }
    const ALLOWED_MODES = ["CASH", "UPI", "CARD", "BANK_TRANSFER"];
    if (!ALLOWED_MODES.includes(paymentMode)) {
      return NextResponse.json({ error: `Unsupported payment mode: ${paymentMode}` }, { status: 400 });
    }
    const isSplit = Array.isArray(itemIds) && itemIds.length > 0;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, tenantId },
      include: {
        kots: {
          where: { status: { in: ["PREPARING", "READY", "SERVED"] } },
          include: { items: true },
        },
      },
    });
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Open lines = not voided, not yet paid (and, for split, in the selected set)
    const openLines = table.kots
      .flatMap((k) => k.items)
      .filter((i) => !i.isVoided && !i.settledInvoiceId)
      .filter((i) => (isSplit ? itemIds.includes(i.id) : true));

    if (isSplit && openLines.length !== itemIds.length) {
      return NextResponse.json(
        { error: "Some selected items are voided, already paid, or not on this table" },
        { status: 400 }
      );
    }

    if (openLines.length === 0) {
      // Nothing billable: free the table and close out any (fully voided) KOTs
      await prisma.$transaction([
        prisma.kitchenOrderTicket.updateMany({
          where: { tableId, tenantId, status: { in: [KotStatus.PREPARING, KotStatus.READY, KotStatus.SERVED] } },
          data: { status: KotStatus.CANCELLED },
        }),
        prisma.restaurantTable.update({
          where: { id: tableId },
          data: { status: TableStatus.VACANT, currentTotal: 0, occupiedAt: null, assignedWaiter: null },
        }),
      ]);
      return NextResponse.json({ success: true, message: "Table marked as vacant" });
    }

    // Aggregate by product. Billable amount per line = qty*price - discount (0 if complimentary).
    type Agg = {
      productId: string;
      productName: string;
      quantity: number; // physical qty (for stock)
      billedGross: number; // sum of qty*price for NON-complimentary lines
      discount: number;
    };
    const agg = new Map<string, Agg>();
    for (const l of openLines) {
      const qty = Number(l.quantity);
      const gross = qty * Number(l.unitPrice);
      const a = agg.get(l.productId) || {
        productId: l.productId,
        productName: l.productName,
        quantity: 0,
        billedGross: 0,
        discount: 0,
      };
      a.quantity += qty;
      if (!l.isComplimentary) {
        a.billedGross += gross;
        a.discount += Number(l.discountAmount || 0);
      }
      agg.set(l.productId, a);
    }
    const aggregatedItems = Array.from(agg.values());

    const invoiceResult = await prisma.$transaction(async (tx) => {
      const { invoiceNumber } = await generateNextInvoiceNumber(tx, { tenantId });

      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      const processedItems: any[] = [];

      for (const item of aggregatedItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { recipeIngredients: { include: { ingredient: true } } },
        });
        if (!product) continue;

        const qty = item.quantity;
        const lineTaxable = Math.max(0, item.billedGross - item.discount);
        subtotal += lineTaxable;

        // Stock is always consumed, even for complimentary food
        if (product.recipeIngredients && product.recipeIngredients.length > 0) {
          for (const recipeItem of product.recipeIngredients) {
            const rawReqPerPortion = Number(recipeItem.quantityRequired);
            const wasteFactor = 1 + Number(recipeItem.wastePercentage || 0) / 100;
            const totalRawConsumed = Number((qty * rawReqPerPortion * wasteFactor).toFixed(3));

            await tx.product.update({
              where: { id: recipeItem.ingredientId },
              data: { currentStock: { decrement: totalRawConsumed } },
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
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: { decrement: qty } },
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

        // Fully complimentary product -> no invoice line / no tax
        if (lineTaxable <= 0) continue;

        const tax = GstCalculator.calculate(
          lineTaxable,
          Number(product.gstRate),
          tenant.stateCode,
          tenant.stateCode, // dine-in is intra-state
          tenant.isComposition
        );
        totalCgst += tax.cgstAmount;
        totalSgst += tax.sgstAmount;

        // Billed quantity is derived so unitPrice*quantity == taxable value
        processedItems.push({
          productId: product.id,
          productName: product.name,
          hsnCode: product.hsnCode,
          unitSold: product.baseUnit,
          quantity: qty,
          conversionFactor: 1,
          baseQuantity: qty,
          unitPrice: Number((lineTaxable / qty).toFixed(4)),
          gstRate: Number(product.gstRate),
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: 0,
          lineTotal: tax.totalAmount,
        });
      }

      const totalTax = totalCgst + totalSgst;
      const totalAmount = Number((subtotal + totalTax).toFixed(2));

      const upiUri = UpiService.generateUpiUri({
        upiId: tenant.upiId,
        payeeName: tenant.businessName,
        amount: totalAmount,
        invoiceNumber,
        note: `Table ${table.name} Bill ${invoiceNumber}`,
      });

      const createdInvoice = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          invoiceDate: new Date(),
          customerName: `${customerName} (${table.name})`,
          customerPhone: customerPhone || "",
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
          notes: `${isSplit ? "Split bill — " : ""}Settled from Table ${table.name} (${table.section})`,
          items: { create: processedItems },
        },
        include: { items: true },
      });

      // Mark the paid lines
      await tx.kotItem.updateMany({
        where: { id: { in: openLines.map((l) => l.id) } },
        data: { settledInvoiceId: createdInvoice.id },
      });

      // Anything left unpaid on the table?
      const remaining = await tx.kotItem.findMany({
        where: {
          kot: { tableId, tenantId, status: { in: [KotStatus.PREPARING, KotStatus.READY, KotStatus.SERVED] } },
          isVoided: false,
          settledInvoiceId: null,
        },
      });

      if (remaining.length === 0) {
        await tx.kitchenOrderTicket.updateMany({
          where: { tableId, tenantId, status: { in: [KotStatus.PREPARING, KotStatus.READY, KotStatus.SERVED] } },
          data: { status: KotStatus.SETTLED, invoiceId: createdInvoice.id },
        });
        await tx.restaurantTable.update({
          where: { id: tableId },
          data: { status: TableStatus.VACANT, currentTotal: 0, occupiedAt: null, assignedWaiter: null },
        });
      } else {
        const remainingTotal = remaining.reduce((a, i) => {
          if (i.isComplimentary) return a;
          return a + Math.max(0, Number(i.quantity) * Number(i.unitPrice) - Number(i.discountAmount || 0));
        }, 0);
        await tx.restaurantTable.update({
          where: { id: tableId },
          data: { currentTotal: remainingTotal },
        });
      }

      return { invoice: createdInvoice, tableFreed: remaining.length === 0 };
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      invoice: invoiceResult.invoice,
      tableFreed: invoiceResult.tableFreed,
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
