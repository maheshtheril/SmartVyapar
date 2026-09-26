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
        regionId: true,
        zoneId: true,
        beatId: true,
        isActive: true,
        territoryId: true,
        territory: { select: { name: true, zone: true } },
        outstandingBalance: true,
        loyaltyPoints: true,
        createdAt: true,
          openingBalanceDate: true,
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
    const { name, phone, gstin, stateCode, email, address, pincode, regionId, zoneId, territoryId, beatId, openingBalance, openingBalanceDate } = body;

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
            balance: parseFloat(openingBalance) || 0,
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
              accountId: arAccount.id,
              outstandingBalance: parseFloat(openingBalance) || 0,
              regionId: regionId || null,
              zoneId: zoneId || null,
              territoryId: territoryId || null,
              beatId: beatId || null
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



export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    const { id, name, phone, gstin, stateCode, email, address, pincode, regionId, zoneId, territoryId, beatId, isActive, outstandingBalance, openingBalanceDate } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id, tenantId },
        data: {
          name,
          phone: phone || null,
          gstin: gstin || null,
          stateCode: stateCode || "32",
          email: email || null,
          address: address || null,
          pincode: pincode || null,
          regionId: regionId || null,
          zoneId: zoneId || null,
          territoryId: territoryId || null,
          beatId: beatId || null,
          isActive: isActive !== undefined ? isActive : true,
          ...(openingBalanceDate !== undefined && { openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null }),
          ...(outstandingBalance !== undefined && { outstandingBalance: parseFloat(outstandingBalance) || 0 })
        },
      });

      if (outstandingBalance !== undefined && customer.accountId) {
        await tx.account.update({
          where: { id: customer.accountId },
          data: { balance: parseFloat(outstandingBalance) || 0 }
        });
      }
      return customer;
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id, tenantId },
      include: { invoices: true }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (customer.invoices.length > 0 || Number(customer.outstandingBalance) !== 0) {
      return NextResponse.json({ 
        error: "Cannot delete customer because they have existing invoices or an outstanding balance. Please edit them and mark as 'Inactive' instead." 
      }, { status: 400 });
    }

    await prisma.customer.delete({
      where: { id, tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
