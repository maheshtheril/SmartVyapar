import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/restaurant/report?date=YYYY-MM-DD  (defaults to today, India time)
// Daily F&B report: revenue, covers, top dishes, hourly heat map, payment mix,
// and the leakage figures (voids, discounts, complimentary) a manager cares about.
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    // "today" in IST regardless of server timezone
    const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
    const today = istNow.toISOString().slice(0, 10);
    const date = req.nextUrl.searchParams.get("date") || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const start = new Date(`${date}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);

    // Restaurant bills only (settled from a table)
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: start, lt: end },
        notes: { contains: "Settled from Table" },
      },
      include: { items: true },
    });

    let revenue = 0;
    let tax = 0;
    let subtotal = 0;
    const payment: Record<string, { count: number; amount: number }> = {};
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, bills: 0, amount: 0 }));
    const dishes = new Map<string, { name: string; qty: number; amount: number }>();

    for (const inv of invoices) {
      const total = Number(inv.totalAmount);
      revenue += total;
      tax += Number(inv.totalTax);
      subtotal += Number(inv.subtotal);

      const mode = String(inv.paymentMode);
      payment[mode] = payment[mode] || { count: 0, amount: 0 };
      payment[mode].count += 1;
      payment[mode].amount += total;

      // hour in IST
      const h = new Date(new Date(inv.invoiceDate).getTime() + 5.5 * 3600 * 1000).getUTCHours();
      hourly[h].bills += 1;
      hourly[h].amount += total;

      for (const it of inv.items) {
        const d = dishes.get(it.productName) || { name: it.productName, qty: 0, amount: 0 };
        d.qty += Number(it.quantity);
        d.amount += Number(it.lineTotal);
        dishes.set(it.productName, d);
      }
    }

    // Leakage figures from KOT lines
    const [voided, discounted, complimentary, kots] = await Promise.all([
      prisma.kotItem.findMany({
        where: { isVoided: true, voidedAt: { gte: start, lt: end }, kot: { tenantId } },
      }),
      prisma.kotItem.findMany({
        where: { isVoided: false, discountAmount: { gt: 0 }, createdAt: { gte: start, lt: end }, kot: { tenantId } },
      }),
      prisma.kotItem.findMany({
        where: { isVoided: false, isComplimentary: true, createdAt: { gte: start, lt: end }, kot: { tenantId } },
      }),
      prisma.kitchenOrderTicket.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
        select: { guestCount: true, waiterName: true, totalAmount: true },
      }),
    ]);

    const line = (i: any) => Number(i.quantity) * Number(i.unitPrice);
    const covers = kots.reduce((a, k) => a + (k.guestCount || 0), 0);

    // Sales by captain (based on KOT value)
    const byWaiter = new Map<string, { name: string; kots: number; amount: number }>();
    for (const k of kots) {
      const name = k.waiterName || "Unassigned";
      const w = byWaiter.get(name) || { name, kots: 0, amount: 0 };
      w.kots += 1;
      w.amount += Number(k.totalAmount);
      byWaiter.set(name, w);
    }

    const r2 = (n: number) => Number(n.toFixed(2));
    const topDishes = Array.from(dishes.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .map((d) => ({ ...d, amount: r2(d.amount) }));

    return NextResponse.json({
      success: true,
      date,
      summary: {
        bills: invoices.length,
        revenue: r2(revenue),
        subtotal: r2(subtotal),
        tax: r2(tax),
        avgBill: invoices.length ? r2(revenue / invoices.length) : 0,
        covers,
        revenuePerCover: covers ? r2(revenue / covers) : 0,
      },
      leakage: {
        voidedItems: voided.length,
        voidedValue: r2(voided.reduce((a, i) => a + line(i), 0)),
        discountedLines: discounted.length,
        discountValue: r2(discounted.reduce((a, i) => a + Number(i.discountAmount), 0)),
        complimentaryLines: complimentary.length,
        complimentaryValue: r2(complimentary.reduce((a, i) => a + line(i), 0)),
      },
      payment: Object.entries(payment).map(([mode, v]) => ({ mode, count: v.count, amount: r2(v.amount) })),
      hourly: hourly.map((h) => ({ ...h, amount: r2(h.amount) })),
      topDishes,
      byWaiter: Array.from(byWaiter.values())
        .sort((a, b) => b.amount - a.amount)
        .map((w) => ({ ...w, amount: r2(w.amount) })),
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Reports are available to owners and managers only" }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error building restaurant report:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
