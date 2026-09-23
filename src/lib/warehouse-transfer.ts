import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { StockLogType, AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { CreateStockTransferInput } from "@/lib/schemas/warehouse";

/**
 * Ensures a tenant has at least a default warehouse created.
 * If none exists, creates "Main Central Store" and seeds inventory balances from products.
 */
export async function ensureDefaultWarehouse(tenantId: string) {
  let defaultWarehouse = await prisma.warehouse.findFirst({
    where: { tenantId, isDefault: true },
  });

  if (!defaultWarehouse) {
    // Check if any warehouse exists at all
    defaultWarehouse = await prisma.warehouse.findFirst({
      where: { tenantId },
    });
  }

  if (!defaultWarehouse) {
    defaultWarehouse = await prisma.warehouse.create({
      data: {
        tenantId,
        name: "Main Central Store",
        code: "WH-MAIN",
        city: "Kochi",
        address: "Primary Store Location",
        isDefault: true,
      },
    });

    // Seed existing products stock into this default warehouse
    const products = await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, currentStock: true },
    });

    if (products.length > 0) {
      await prisma.warehouseStock.createMany({
        data: products.map((p) => ({
          warehouseId: defaultWarehouse!.id,
          productId: p.id,
          quantity: p.currentStock,
          rackLocation: "Main Floor",
        })),
        skipDuplicates: true,
      });
    }
  }

  return defaultWarehouse;
}

/**
 * Generates a sequential stock transfer number: ST-2026-0001
 */
export async function generateTransferNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.stockTransfer.count({
    where: { tenantId },
  });
  const sequenceStr = String(count + 1).padStart(4, "0");
  return `ST-${currentYear}-${sequenceStr}`;
}

/**
 * Dispatches a stock transfer from a source warehouse.
 * Validates stock, decrements from source, creates StockLog, and sets status to DISPATCHED.
 */
export async function dispatchStockTransfer(
  tenantId: string,
  userId: string,
  userName: string,
  input: CreateStockTransferInput
) {
  const { fromWarehouseId, toWarehouseId, vehicleNo, driverName, notes, items } = input;

  return await prisma.$transaction(async (tx) => {
    // 1. Validate both warehouses
    const fromWh = await tx.warehouse.findFirst({
      where: { id: fromWarehouseId, tenantId },
    });
    const toWh = await tx.warehouse.findFirst({
      where: { id: toWarehouseId, tenantId },
    });

    if (!fromWh || !toWh) {
      throw new Error("One or both specified warehouses were not found.");
    }

    const transferNumber = await generateTransferNumber(tenantId);

    // 2. Validate and deduct stock from source warehouse
    for (const item of items) {
      let sourceStock = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: fromWarehouseId,
            productId: item.productId,
          },
        },
      });

      // If source stock record does not exist, fetch current product stock
      if (!sourceStock) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new Error(`Product ${item.productName} not found.`);
        }
        sourceStock = await tx.warehouseStock.create({
          data: {
            warehouseId: fromWarehouseId,
            productId: item.productId,
            quantity: product.currentStock,
          },
        });
      }

      if (Number(sourceStock.quantity) < Number(item.quantity)) {
        throw new Error(
          `Insufficient stock in ${fromWh.name} for "${item.productName}". Available: ${sourceStock.quantity}, Requested: ${item.quantity}`
        );
      }

      // Deduct from source warehouse stock
      await tx.warehouseStock.update({
        where: { id: sourceStock.id },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });

      // Record Stock Log
      await tx.stockLog.create({
        data: {
          tenantId,
          productId: item.productId,
          changeQty: -item.quantity,
          type: StockLogType.TRANSFER_OUT,
          referenceId: transferNumber,
          note: `Dispatched to ${toWh.name} (${transferNumber})`,
        },
      });
    }

    // 3. Create Stock Transfer Document
    const transfer = await tx.stockTransfer.create({
      data: {
        tenantId,
        transferNumber,
        fromWarehouseId,
        toWarehouseId,
        status: "DISPATCHED",
        dispatchDate: new Date(),
        vehicleNo: vehicleNo || null,
        driverName: driverName || null,
        notes: notes || null,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit || "PCS",
          })),
        },
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: true,
      },
    });

    // 4. Audit Log
    await recordAuditLog({
      tenantId,
      userId,
      userName,
      action: AuditAction.STOCK_TRANSFER_CREATED,
      entityType: "STOCK_TRANSFER",
      entityId: transfer.transferNumber,
      details: {
        from: fromWh.name,
        to: toWh.name,
        itemCount: items.length,
        vehicleNo,
      },
    });

    return transfer;
  }, DEFAULT_TX_OPTIONS);
}

/**
 * Marks a dispatched stock transfer as RECEIVED at the destination warehouse.
 * Increments stock in destination warehouse and updates transfer status.
 */
export async function receiveStockTransfer(
  tenantId: string,
  userId: string,
  userName: string,
  transferId: string
) {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: true,
      },
    });

    if (!transfer) {
      throw new Error("Stock transfer not found.");
    }

    if (transfer.status !== "DISPATCHED") {
      throw new Error(`Cannot receive transfer with status "${transfer.status}". Must be DISPATCHED.`);
    }

    // Increment stock in destination warehouse
    for (const item of transfer.items) {
      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: transfer.toWarehouseId,
            productId: item.productId,
          },
        },
        create: {
          warehouseId: transfer.toWarehouseId,
          productId: item.productId,
          quantity: item.quantity,
          rackLocation: "Inward Bay",
        },
        update: {
          quantity: {
            increment: item.quantity,
          },
        },
      });

      // Record Inward Stock Log
      await tx.stockLog.create({
        data: {
          tenantId,
          productId: item.productId,
          changeQty: item.quantity,
          type: StockLogType.TRANSFER_IN,
          referenceId: transfer.transferNumber,
          note: `Received from ${transfer.fromWarehouse.name} (${transfer.transferNumber})`,
        },
      });
    }

    // Update transfer status to RECEIVED
    const updated = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "RECEIVED",
        receivedDate: new Date(),
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: true,
      },
    });

    // Record Audit Log
    await recordAuditLog({
      tenantId,
      userId,
      userName,
      action: AuditAction.STOCK_TRANSFER_RECEIVED,
      entityType: "STOCK_TRANSFER",
      entityId: transfer.transferNumber,
      details: {
        from: transfer.fromWarehouse.name,
        to: transfer.toWarehouse.name,
        receivedDate: new Date().toISOString(),
      },
    });

    return updated;
  }, DEFAULT_TX_OPTIONS);
}

/**
 * Cancels a dispatched stock transfer before receipt.
 * Restores stock back to the source warehouse.
 */
export async function cancelStockTransfer(
  tenantId: string,
  userId: string,
  userName: string,
  transferId: string,
  cancelReason: string = "Dispatch cancelled"
) {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: true,
      },
    });

    if (!transfer) {
      throw new Error("Stock transfer not found.");
    }

    if (transfer.status !== "DISPATCHED") {
      throw new Error(`Cannot cancel transfer with status "${transfer.status}". Only DISPATCHED transfers can be cancelled.`);
    }

    // Re-credit stock back to source warehouse
    for (const item of transfer.items) {
      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: transfer.fromWarehouseId,
            productId: item.productId,
          },
        },
        create: {
          warehouseId: transfer.fromWarehouseId,
          productId: item.productId,
          quantity: item.quantity,
        },
        update: {
          quantity: {
            increment: item.quantity,
          },
        },
      });

      // Record Reversal Stock Log
      await tx.stockLog.create({
        data: {
          tenantId,
          productId: item.productId,
          changeQty: item.quantity,
          type: StockLogType.MANUAL_ADJUSTMENT,
          referenceId: transfer.transferNumber,
          note: `Reversal: Transfer cancelled - ${cancelReason}`,
        },
      });
    }

    // Update transfer status to CANCELLED
    const updated = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "CANCELLED",
        notes: transfer.notes
          ? `${transfer.notes} | Cancelled: ${cancelReason}`
          : `Cancelled: ${cancelReason}`,
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: true,
      },
    });

    // Record Audit Log
    await recordAuditLog({
      tenantId,
      userId,
      userName,
      action: AuditAction.STOCK_TRANSFER_CANCELLED,
      entityType: "STOCK_TRANSFER",
      entityId: transfer.transferNumber,
      details: {
        cancelReason,
      },
    });

    return updated;
  }, DEFAULT_TX_OPTIONS);
}
