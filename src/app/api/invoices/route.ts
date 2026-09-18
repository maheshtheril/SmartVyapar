import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GstCalculator } from "@/lib/gst";
import { UpiService } from "@/lib/upi";
import { PaymentStatus, PaymentMode, StockLogType } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { generateNextInvoiceNumber } from "@/lib/invoice-sequence";
import { validateBody } from "@/lib/validation";
import { CreateInvoiceSchema } from "@/lib/schemas/invoice";

export const dynamic = "force-dynamic";

// GET /api/invoices - Fetch real invoices from Neon DB
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();
    const status = searchParams.get("status")?.toUpperCase();

    const where: any = {
      tenantId,
    };

    if (status && (status === "PAID" || status === "PARTIAL" || status === "UNPAID")) {
      where.paymentStatus = status as PaymentStatus;
    }

    if (query) {
      where.OR = [
        { invoiceNumber: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } },
        { customerPhone: { contains: query } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute live metrics from real database
    const allInvoices = await prisma.invoice.findMany({
      where: { tenantId },
    });

    const todayStr = new Date().toISOString().split("T")[0];
    let todaySales = 0;
    let totalUdhar = 0;
    let totalOutputCgst = 0;
    let totalOutputSgst = 0;
    let totalOutputIgst = 0;

    for (const inv of allInvoices) {
      const invDateStr = inv.invoiceDate.toISOString().split("T")[0];
      if (invDateStr === todayStr) {
        todaySales += Number(inv.totalAmount);
      }
      totalUdhar += Number(inv.dueAmount);
      totalOutputCgst += Number(inv.cgstAmount);
      totalOutputSgst += Number(inv.sgstAmount);
      totalOutputIgst += Number(inv.igstAmount);
    }

    const lowStockCount = await prisma.product.count({
      where: {
        tenantId,
        currentStock: { lte: prisma.product.fields.minStockAlert },
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        businessName: true,
        legalName: true,
        gstin: true,
        stateCode: true,
        phone: true,
        address: true,
        upiId: true,
      },
    });

    return NextResponse.json({
      success: true,
      tenant,
      invoices,
      metrics: {
        todaySales,
        totalUdhar,
        netGstOutput: totalOutputCgst + totalOutputSgst + totalOutputIgst,
        lowStockCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/invoices - Create real invoice & perform atomic stock deduction
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const validation = validateBody(CreateInvoiceSchema, body);
    if (!validation.success) {
      return validation.response;
    }
    const data = validation.data;

    // Fetch tenant for stateCode (needed for GST jurisdiction)
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const isInterState = data.customerStateCode !== tenant.stateCode;

    // Fetch product details for all items to verify stock, prices & recipes
    const productIds = data.items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      include: {
        recipeIngredients: {
          include: { ingredient: true },
        },
      },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Atomic transaction: Create Invoice, Line Items, Deduct Stock, Record Stock Logs
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate Invoice Number atomically (race-condition safe)
      const { invoiceNumber } = await generateNextInvoiceNumber(tx, { tenantId });

      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const processedItems = [];

      for (const item of data.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product ID ${item.productId} not found`);
        }

        const qty = Number(item.quantity);
        const unitSold = item.unitSold || product.baseUnit;
        const isAlt = product.hasAltUnit && product.altUnit && unitSold === product.altUnit;
        const conversionFactor = isAlt && product.conversionFactor ? Number(product.conversionFactor) : 1.0;
        const baseQty = Number((qty * conversionFactor).toFixed(3));

        const defaultPrice = isAlt && product.sellingPricePerAlt
          ? Number(product.sellingPricePerAlt)
          : Number(product.sellingPrice) * (isAlt ? conversionFactor : 1);
        
        const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : defaultPrice;
        const lineTaxable = unitPrice * qty;
        subtotal += lineTaxable;

        const tax = GstCalculator.calculate(
          lineTaxable,
          Number(product.gstRate),
          tenant.stateCode,
          data.customerStateCode,
          tenant.isComposition
        );

        totalCgst += tax.cgstAmount;
        totalSgst += tax.sgstAmount;
        totalIgst += tax.igstAmount;

        processedItems.push({
          productId: product.id,
          productName: product.name,
          hsnCode: product.hsnCode,
          unitSold,
          quantity: qty,
          conversionFactor,
          baseQuantity: baseQty,
          unitPrice,
          gstRate: Number(product.gstRate),
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: tax.igstAmount,
          batchId: item.batchId || null,
          batchNumber: item.batchNumber || null,
          lineTotal: tax.totalAmount,
        });

        // Batch Stock Depletion: If specific batch was selected
        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: {
              currentStock: { decrement: baseQty },
            },
          });
        }

        // Stock Depletion: Check if Product has Recipe Items (Finished Good / Restaurant Dish)
        if (product.recipeIngredients && product.recipeIngredients.length > 0) {
          // Recipe Item: Auto-deplete raw ingredients (Backflushing)
          for (const recipeItem of product.recipeIngredients) {
            const rawReqPerPortion = Number(recipeItem.quantityRequired);
            const wasteFactor = 1 + (Number(recipeItem.wastePercentage || 0) / 100);
            const totalRawConsumed = Number((qty * rawReqPerPortion * wasteFactor).toFixed(3));

            // Decrement raw material stock
            await tx.product.update({
              where: { id: recipeItem.ingredientId },
              data: {
                currentStock: { decrement: totalRawConsumed },
              },
            });

            // Log raw material consumption audit
            await tx.stockLog.create({
              data: {
                tenantId,
                productId: recipeItem.ingredientId,
                changeQty: -totalRawConsumed,
                type: StockLogType.CONSUMPTION_OUT,
                referenceId: invoiceNumber,
                note: `Recipe Depletion: ${totalRawConsumed} ${recipeItem.ingredient.baseUnit} consumed for ${qty} ${product.name} (Bill #${invoiceNumber})`,
              },
            });
          }
        } else {
          // Standard Retail Item: Direct stock deduction
          await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: { decrement: baseQty },
            },
          });

          // Audit Stock Log
          await tx.stockLog.create({
            data: {
              tenantId,
              productId: product.id,
              changeQty: -baseQty,
              type: StockLogType.SALE_OUT,
              referenceId: invoiceNumber,
              note: `Sold ${qty} ${unitSold} (${baseQty} ${product.baseUnit}) to ${data.customerName}${item.batchNumber ? ` [Batch: ${item.batchNumber}]` : ''} (Bill #${invoiceNumber})`,
            },
          });
        }
      }

      const totalTax = totalCgst + totalSgst + totalIgst;
      const totalAmount = Number((subtotal + totalTax).toFixed(2));
      const finalPaid = data.paymentStatus === "PAID" ? totalAmount : Number(data.paidAmount || 0);
      const dueAmount = Number(Math.max(0, totalAmount - finalPaid).toFixed(2));

      const upiUri = UpiService.generateUpiUri({
        upiId: tenant.upiId,
        payeeName: tenant.businessName,
        amount: dueAmount > 0 ? dueAmount : totalAmount,
        invoiceNumber,
        note: `Invoice ${invoiceNumber} for ${data.customerName}`,
      });

      // Upsert Customer
      let customer = await tx.customer.findFirst({
        where: { tenantId, phone: data.customerPhone },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            tenantId,
            name: data.customerName,
            phone: data.customerPhone,
            stateCode: data.customerStateCode,
            outstandingBalance: dueAmount,
          },
        });
      } else if (dueAmount > 0) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            outstandingBalance: { increment: dueAmount },
          },
        });
      }

      // Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          customerId: customer.id,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerStateCode: data.customerStateCode,
          isInterState,
          subtotal,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          totalTax,
          totalAmount,
          paidAmount: finalPaid,
          dueAmount,
          paymentStatus: data.paymentStatus as PaymentStatus,
          paymentMode: data.paymentMode as PaymentMode,
          upiUri,
          notes: data.notes,
          items: {
            create: processedItems,
          },
        },
        include: {
          items: true,
        },
      });

      return invoice;
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
