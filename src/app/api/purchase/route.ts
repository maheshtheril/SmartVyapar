import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { StockLogType, AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/purchase - Fetch all purchase bills and summary metrics
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: any = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: "insensitive" } },
        { grnNumber: { contains: search, mode: "insensitive" } },
        { supplierName: { contains: search, mode: "insensitive" } },
        { supplierGstin: { contains: search, mode: "insensitive" } },
      ];
    }

    const [bills, totalCount] = await Promise.all([
      prisma.purchaseBill.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { billDate: "desc" },
        take: 100,
      }),
      prisma.purchaseBill.count({ where }),
    ]);

    // Calculate aggregated summary metrics
    const allTenantBills = await prisma.purchaseBill.findMany({
      where: { tenantId },
      select: {
        totalAmount: true,
        totalTaxable: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        paymentTerms: true,
      },
    });

    let totalPurchaseValue = 0;
    let totalTaxableValue = 0;
    let totalItcClaimed = 0;
    let totalUnpaidPayables = 0;

    for (const b of allTenantBills) {
      const amt = Number(b.totalAmount);
      totalPurchaseValue += amt;
      totalTaxableValue += Number(b.totalTaxable);
      totalItcClaimed += Number(b.cgstAmount) + Number(b.sgstAmount) + Number(b.igstAmount);
      if (b.paymentTerms === "CREDIT") {
        totalUnpaidPayables += amt;
      }
    }

    // Extract distinct suppliers from purchase bills for instant search/selection
    const uniqueSuppliersMap = new Map<string, { name: string; gstin: string | null; billsCount: number }>();
    const pastBillsWithSuppliers = await prisma.purchaseBill.findMany({
      where: { tenantId },
      select: {
        supplierName: true,
        supplierGstin: true,
      },
      orderBy: { createdAt: "desc" },
    });

    for (const b of pastBillsWithSuppliers) {
      const key = b.supplierName.trim().toLowerCase();
      if (!uniqueSuppliersMap.has(key)) {
        uniqueSuppliersMap.set(key, {
          name: b.supplierName,
          gstin: b.supplierGstin || null,
          billsCount: 1,
        });
      } else {
        const existing = uniqueSuppliersMap.get(key)!;
        existing.billsCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      bills,
      totalCount,
      suppliers: Array.from(uniqueSuppliersMap.values()),
      summary: {
        totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
        totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
        totalItcClaimed: Math.round(totalItcClaimed * 100) / 100,
        totalUnpaidPayables: Math.round(totalUnpaidPayables * 100) / 100,
        totalBillsCount: allTenantBills.length,
      },
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching purchase bills:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/purchase - Manual Purchase Bill & GRN Inward with Batchwise Margins
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
      warehouseId,
      paymentTerms = "CREDIT",
      notes,
      items,
    } = body;

    if (!supplierName || !billNumber) {
      return NextResponse.json(
        { error: "Supplier Name and Supplier Bill Number are required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one purchase item is required" },
        { status: 400 }
      );
    }

    // Fetch tenant to determine tax jurisdiction
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Inter-state detection: if supplier GSTIN first 2 digits differ from tenant.stateCode -> IGST
    let isInterState = false;
    if (supplierGstin && supplierGstin.length >= 2 && tenant.stateCode) {
      const supplierStateCode = supplierGstin.substring(0, 2);
      isInterState = supplierStateCode !== tenant.stateCode;
    }

    // Target warehouse
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const defaultWh = await prisma.warehouse.findFirst({
        where: { tenantId, isDefault: true },
      });
      if (defaultWh) {
        targetWarehouseId = defaultWh.id;
      } else {
        const anyWh = await prisma.warehouse.findFirst({
          where: { tenantId },
        });
        if (anyWh) targetWarehouseId = anyWh.id;
      }
    }

    // Generate sequential GRN Number
    const year = new Date().getFullYear();
    const grnCount = await prisma.purchaseBill.count({
      where: { tenantId },
    });
    const grnNumber = `GRN-${year}-${(grnCount + 1).toString().padStart(4, "0")}`;

    // Compute bill level tax totals
    let totalTaxable = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalAmount = 0;

    const processedItems = items.map((item: any) => {
      const qty = Number(item.quantity || 1);
      const pkgSize = Number(item.packageSize || 1);
      const effectiveBaseQty = qty * pkgSize;
      const rate = Number(item.purchasePrice || 0);
      const discountPct = Number(item.discountPercent || 0);
      const discountedRate = rate * (1 - discountPct / 100);
      const baseCost = discountedRate / pkgSize;

      const taxable = Math.round(discountedRate * qty * 100) / 100;
      const gstRate = Number(item.gstRate || 18);

      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;

      if (isInterState) {
        itemIgst = Math.round((taxable * gstRate) / 100 * 100) / 100;
      } else {
        itemCgst = Math.round((taxable * (gstRate / 2)) / 100 * 100) / 100;
        itemSgst = Math.round((taxable * (gstRate / 2)) / 100 * 100) / 100;
      }

      const lineTotal = Math.round((taxable + itemCgst + itemSgst + itemIgst) * 100) / 100;

      totalTaxable += taxable;
      cgstAmount += itemCgst;
      sgstAmount += itemSgst;
      igstAmount += itemIgst;
      totalAmount += lineTotal;

      // Sales Margin Calculation
      let marginPct = item.marginPercent ? Number(item.marginPercent) : undefined;
      let sellingPrice = item.sellingPrice ? Number(item.sellingPrice) : undefined;

      if (sellingPrice && !marginPct && baseCost > 0) {
        marginPct = Math.round(((sellingPrice - baseCost) / baseCost) * 1000) / 10;
      } else if (marginPct && !sellingPrice) {
        sellingPrice = Math.round(baseCost * (1 + marginPct / 100) * 100) / 100;
      } else if (!sellingPrice) {
        marginPct = 25;
        sellingPrice = Math.round(baseCost * 1.25 * 100) / 100;
      }

      return {
        productId: item.productId,
        productName: item.productName,
        batchNumber: item.batchNumber?.trim() || null,
        mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        hsnCode: item.hsnCode?.trim() || null,
        unit: (item.unit || "PCS").toUpperCase(),
        quantity: qty,
        packageSize: pkgSize,
        baseQuantity: effectiveBaseQty,
        purchasePrice: rate,
        discountPercent: discountPct,
        baseCostPrice: Math.round(baseCost * 100) / 100,
        sellingPrice: sellingPrice,
        marginPercent: marginPct,
        mrp: item.mrp ? Number(item.mrp) : sellingPrice,
        gstRate: gstRate,
        lineTotal: lineTotal,
      };
    });

    totalTaxable = Math.round(totalTaxable * 100) / 100;
    cgstAmount = Math.round(cgstAmount * 100) / 100;
    sgstAmount = Math.round(sgstAmount * 100) / 100;
    igstAmount = Math.round(igstAmount * 100) / 100;
    totalAmount = Math.round(totalAmount * 100) / 100;

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase Bill Header
      const bill = await tx.purchaseBill.create({
        data: {
          tenantId,
          billNumber,
          grnNumber,
          billDate: billDate ? new Date(billDate) : new Date(),
          supplierName,
          supplierGstin,
          warehouseId: targetWarehouseId,
          paymentTerms,
          notes,
          totalTaxable,
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalAmount,
          isConfirmed: true,
        },
      });

      // 2. Create Items, Batches & Update Stock
      for (const item of processedItems) {
        // Find or create product
        let product: any = null;
        if (item.productId) {
          product = await tx.product.findUnique({
            where: { id: item.productId },
          });
        }
        if (!product) {
          product = await tx.product.findFirst({
            where: {
              tenantId,
              name: { equals: item.productName, mode: "insensitive" },
            },
          });
        }

        if (!product) {
          product = await tx.product.create({
            data: {
              tenantId,
              name: item.productName,
              hsnCode: item.hsnCode,
              baseUnit: item.unit,
              purchasePrice: item.baseCostPrice,
              sellingPrice: item.sellingPrice,
              mrp: item.mrp,
              gstRate: item.gstRate,
              currentStock: item.baseQuantity,
              minStockAlert: 5,
            },
          });
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: { increment: item.baseQuantity },
              purchasePrice: item.baseCostPrice,
              sellingPrice: item.sellingPrice,
              mrp: item.mrp,
            },
          });
        }

        // Create PurchaseBillItem
        await tx.purchaseBillItem.create({
          data: {
            purchaseBillId: bill.id,
            productId: product.id,
            productName: item.productName,
            batchNumber: item.batchNumber,
            mfgDate: item.mfgDate,
            expiryDate: item.expiryDate,
            hsnCode: item.hsnCode,
            unit: item.unit,
            quantity: item.quantity,
            packageSize: item.packageSize,
            baseQuantity: item.baseQuantity,
            purchasePrice: item.purchasePrice,
            discountPercent: item.discountPercent,
            baseCostPrice: item.baseCostPrice,
            sellingPrice: item.sellingPrice,
            marginPercent: item.marginPercent,
            mrp: item.mrp,
            gstRate: item.gstRate,
            lineTotal: item.lineTotal,
          },
        });

        // Upsert Batch if batchNumber is provided
        if (item.batchNumber) {
          const existingBatch = await tx.batch.findUnique({
            where: {
              tenantId_productId_batchNumber: {
                tenantId,
                productId: product.id,
                batchNumber: item.batchNumber,
              },
            },
          });

          if (existingBatch) {
            await tx.batch.update({
              where: { id: existingBatch.id },
              data: {
                currentStock: { increment: item.baseQuantity },
                costPrice: item.baseCostPrice,
                sellingPrice: item.sellingPrice,
                mrp: item.mrp,
                mfgDate: item.mfgDate || existingBatch.mfgDate,
                expiryDate: item.expiryDate || existingBatch.expiryDate,
              },
            });
          } else {
            await tx.batch.create({
              data: {
                tenantId,
                productId: product.id,
                batchNumber: item.batchNumber,
                mfgDate: item.mfgDate,
                expiryDate: item.expiryDate,
                costPrice: item.baseCostPrice,
                sellingPrice: item.sellingPrice,
                mrp: item.mrp,
                currentStock: item.baseQuantity,
                isActive: true,
              },
            });
          }
        }

        // Update WarehouseStock if warehouse is targeted
        if (targetWarehouseId) {
          const existingWhStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: targetWarehouseId,
                productId: product.id,
              },
            },
          });

          if (existingWhStock) {
            await tx.warehouseStock.update({
              where: { id: existingWhStock.id },
              data: { quantity: { increment: item.baseQuantity } },
            });
          } else {
            await tx.warehouseStock.create({
              data: {
                warehouseId: targetWarehouseId,
                productId: product.id,
                quantity: item.baseQuantity,
              },
            });
          }
        }

        // Record audit StockLog
        await tx.stockLog.create({
          data: {
            tenantId,
            productId: product.id,
            changeQty: item.baseQuantity,
            type: StockLogType.PURCHASE_IN,
            referenceId: billNumber,
            note: `Inward via ${grnNumber} from ${supplierName} (Batch: ${item.batchNumber || "Standard"})`,
          },
        });
      }

      // 3. Double-Entry Ledger Impact on Chart of Accounts
      const inventoryAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "1200" } },
      });
      const cgstAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "1410" } },
      });
      const sgstAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "1420" } },
      });
      const igstAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "1430" } },
      });
      const apAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "2000" } },
      });
      const cashAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "1000" } },
      });
      const bankAcc = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: "1010" } },
      });

      // Debit Inventory Asset
      if (inventoryAcc) {
        await tx.account.update({
          where: { id: inventoryAcc.id },
          data: { balance: { increment: totalTaxable } },
        });
      }

      // Debit Input Tax Credit
      if (cgstAcc && cgstAmount > 0) {
        await tx.account.update({
          where: { id: cgstAcc.id },
          data: { balance: { increment: cgstAmount } },
        });
      }
      if (sgstAcc && sgstAmount > 0) {
        await tx.account.update({
          where: { id: sgstAcc.id },
          data: { balance: { increment: sgstAmount } },
        });
      }
      if (igstAcc && igstAmount > 0) {
        await tx.account.update({
          where: { id: igstAcc.id },
          data: { balance: { increment: igstAmount } },
        });
      }

      // Credit Accounts Payable or Cash/Bank
      if (paymentTerms === "CREDIT" && apAcc) {
        await tx.account.update({
          where: { id: apAcc.id },
          data: { balance: { increment: totalAmount } },
        });
      } else if (paymentTerms === "CASH" && cashAcc) {
        await tx.account.update({
          where: { id: cashAcc.id },
          data: { balance: { decrement: totalAmount } },
        });
      } else if ((paymentTerms === "BANK_TRANSFER" || paymentTerms === "UPI") && bankAcc) {
        await tx.account.update({
          where: { id: bankAcc.id },
          data: { balance: { decrement: totalAmount } },
        });
      }

      // Record MCA Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.userId,
          userName: session.name || "Manager",
          action: AuditAction.CREATE,
          entityType: "PURCHASE_BILL",
          entityId: bill.id,
          details: {
            billNumber,
            grnNumber,
            supplierName,
            totalAmount,
            itemsCount: processedItems.length,
          },
        },
      });

      return bill;
    });

    return NextResponse.json({
      success: true,
      message: `Purchase Bill & GRN ${result.grnNumber} confirmed successfully`,
      bill: result,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error creating purchase bill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
