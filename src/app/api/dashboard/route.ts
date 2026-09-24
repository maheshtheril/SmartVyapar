import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    // 1. Get Today's Sales (IST Timezone boundary)
    const now = new Date();
    // Get current time components in India (Asia/Kolkata)
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    
    // We want the start of the current IST day (00:00:00), expressed as a UTC Date for Prisma.
    // IST is UTC+05:30. So 00:00:00 IST is the previous day's 18:30:00 UTC.
    const startOfToday = new Date(
      Date.UTC(istTime.getFullYear(), istTime.getMonth(), istTime.getDate(), -5, -30, 0, 0)
    );

    const todayInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: startOfToday }
      },
      select: {
        totalAmount: true,
        totalTax: true
      }
    });

    const todaySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const netGstOutput = todayInvoices.reduce((sum, inv) => sum + Number(inv.totalTax), 0);

    // 2. Get Total Udhar (Unpaid/Partial)
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        dueAmount: { gt: 0 }
      },
      select: {
        dueAmount: true
      }
    });
    const totalUdhar = pendingInvoices.reduce((sum, inv) => sum + Number(inv.dueAmount), 0);

    // 3. Get Low Stock Items and Total Products (optimized for 100k+ products via SQL)
    const totalProductsCount = await prisma.product.count({
      where: { tenantId, isActive: true }
    });

    const lowStockItems = await prisma.$queryRaw<any[]>`
      SELECT id, name, sku, "currentStock", "minStockAlert", "baseUnit"
      FROM "Product"
      WHERE "tenantId" = ${tenantId} 
        AND "isActive" = true 
        AND "currentStock" <= "minStockAlert"
      ORDER BY "currentStock" ASC
      LIMIT 10
    `;

    const lowStockTotalResult = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "Product"
      WHERE "tenantId" = ${tenantId} 
        AND "isActive" = true 
        AND "currentStock" <= "minStockAlert"
    `;
    const lowStockCount = Number(lowStockTotalResult[0]?.count || 0);

    // 4. Get Last 5 Invoices
    const recentInvoices = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { invoiceDate: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        totalAmount: true,
        paymentStatus: true
      }
    });

    return NextResponse.json({
      success: true,
      metrics: {
        todaySales,
        totalUdhar,
        netGstOutput,
        lowStockCount: lowStockCount,
        totalProductsCount: totalProductsCount
      },
      recentInvoices,
      lowStockItems
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
