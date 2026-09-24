import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    // 1. Get Today's Sales
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

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

    // 3. Get Low Stock Items (top 10 for dashboard)
    const allProducts = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minStockAlert: true,
        baseUnit: true
      }
    });
    
    const allLowStock = allProducts.filter(p => Number(p.currentStock) <= Number(p.minStockAlert));
    const lowStockItems = allLowStock
      .sort((a, b) => Number(a.currentStock) - Number(b.currentStock))
      .slice(0, 10);

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
        lowStockCount: lowStockItems.length // It might be more, but we show top 10
      },
      recentInvoices,
      lowStockItems
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
