import { NextRequest, NextResponse } from 'next/server';
import { prisma, DEFAULT_TX_OPTIONS } from '@/lib/prisma';
import { TableStatus } from '@prisma/client';
import { restaurantEventBus } from '@/lib/restaurant-events';

export const dynamic = 'force-dynamic';

// POST /api/public/order
// No auth required — public endpoint for QR self-ordering
// Body: { slug, tableId, items: [{ productId, quantity, notes }], customerName?, guestCount? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, tableId, items, customerName, guestCount } = body;

    // Validate required fields
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json({ success: false, error: 'slug is required' }, { status: 400 });
    }
    if (!tableId || typeof tableId !== 'string') {
      return NextResponse.json({ success: false, error: 'tableId is required' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each item must have a valid productId and quantity' },
          { status: 400 }
        );
      }
    }

    // Fetch tenant by slug
    const tenant = await prisma.tenant.findUnique({ where: { slug: slug.trim() } });
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });
    }

    if (tenant.businessType !== 'RESTAURANT') {
      return NextResponse.json(
        { success: false, error: 'This business does not support self-ordering' },
        { status: 403 }
      );
    }

    // Fetch table (don't block if OCCUPIED — allow multiple rounds)
    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, tenantId: tenant.id },
    });
    if (!table) {
      return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });
    }

    // Fetch products to get selling prices
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, sellingPrice: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all products exist and are active
    for (const item of items) {
      if (!productMap.has(item.productId)) {
        return NextResponse.json(
          { success: false, error: `Product ${item.productId} not found or inactive` },
          { status: 400 }
        );
      }
    }

    // Generate KOT number
    const kotCount = await prisma.kitchenOrderTicket.count({
      where: { tenantId: tenant.id },
    });
    const kotNumber = `KOT-${(kotCount + 1).toString().padStart(4, '0')}`;

    // Calculate total amount for this KOT
    let totalKotAmount = 0;
    const kotItems = items.map((item: any) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.sellingPrice);
      const qty = Number(item.quantity);
      totalKotAmount += unitPrice * qty;
      return {
        productId: item.productId,
        productName: product.name,
        quantity: qty,
        unitPrice,
        notes: item.notes || null,
      };
    });

    // Transaction: create KOT + items, update table status
    const result = await prisma.$transaction(async (tx) => {
      // Create KOT
      const kot = await tx.kitchenOrderTicket.create({
        data: {
          tenantId: tenant.id,
          tableId,
          kotNumber,
          guestCount: Number(guestCount || 2),
          waiterName: customerName ? `Self (${customerName})` : 'Self-Order (QR)',
          totalAmount: totalKotAmount,
          items: {
            create: kotItems,
          },
        },
        select: { id: true, kotNumber: true },
      });

      // Set table to OCCUPIED if currently VACANT, and increment running total
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: {
          status: table.status === TableStatus.VACANT ? TableStatus.OCCUPIED : table.status,
          occupiedAt: table.occupiedAt || new Date(),
          currentTotal: {
            increment: totalKotAmount,
          },
        },
      });

      return kot;
    }, DEFAULT_TX_OPTIONS);

    // Emit real-time event to Kitchen Display & POS terminals
    restaurantEventBus.emitTenantEvent({
      type: "qr.order_received",
      tenantId: tenant.id,
      tableId,
      tableName: table.name,
      kotNumber: result.kotNumber,
      timestamp: new Date().toISOString(),
      data: {
        customerName,
        guestCount,
        totalAmount: totalKotAmount,
      },
    });

    return NextResponse.json({
      success: true,
      kotNumber: result.kotNumber,
    });
  } catch (error: any) {
    console.error('Error in POST /api/public/order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to place order' },
      { status: 500 }
    );
  }
}
