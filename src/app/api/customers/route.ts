import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/customers?q=... - List customers with balances and summary
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : undefined;

    const where: any = { tenantId };
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
        { gstin: { contains: query, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: [
        { outstandingBalance: "desc" },
        { name: "asc" },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        pincode: true,
        gstin: true,
        stateCode: true,
        territoryId: true,
        territory: { select: { name: true, zone: true } },
        outstandingBalance: true,
        loyaltyPoints: true,
        createdAt: true,
        _count: { select: { invoices: true } },
      },
    });

    // Summary stats
    const allWithBalance = await prisma.customer.aggregate({
      where: { tenantId },
      _sum: { outstandingBalance: true },
      _count: { id: true },
    });
    const overdueCount = await prisma.customer.count({
      where: { tenantId, outstandingBalance: { gt: 0 } },
    });

    const mapped = customers.map((c) => ({
      ...c,
      outstandingBalance: Number(c.outstandingBalance || 0),
      loyaltyPoints: Number(c.loyaltyPoints || 0),
      totalBills: c._count.invoices,
    }));

    return NextResponse.json({
      success: true,
      customers: mapped,
      summary: {
        total: allWithBalance._count.id,
        totalOutstanding: Number(allWithBalance._sum.outstandingBalance || 0),
        overdueCount,
        clearedCount: allWithBalance._count.id - overdueCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/customers - Create a customer manually
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    const { name, phone, gstin, stateCode, email, address, pincode, regionId, zoneId, territoryId, beatId } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Check if customer with same phone already exists for this tenant
    const existing = await prisma.customer.findFirst({
      where: { tenantId, phone },
    });

    let customer;
    if (existing) {
      customer = await prisma.customer.update({
        where: { id: existing.id },
        data: { 
          name, 
          gstin: gstin || null, 
          stateCode: stateCode || "32",
            regionId: regionId || null,
            zoneId: zoneId || null,
            territoryId: territoryId || null,
            beatId: beatId || null,
          email: email || null,
          address: address || null,
          pincode: pincode || null
        },
      });
    } else {
      
      customer = await prisma.$transaction(async (tx) => {
        const arAccount = await tx.account.create({
          data: {
            tenantId,
            code: `AR-${Date.now().toString().slice(-6)}`,
            name: `Customer: ${name}`,
            classification: 'ASSET',
            balance: 0,
          }
        });
        return await tx.customer.create({
          data: { 
            tenantId, 
            name, 
            phone, 
            email: email || null,
            address: address || null,
            pincode: pincode || null,
            gstin: gstin || null, 
            stateCode: stateCode || "32",
            accountId: arAccount.id
          },
        });
      });

    }

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error("Error creating customer:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

