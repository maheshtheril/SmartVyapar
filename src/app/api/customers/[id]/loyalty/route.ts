import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/customers/[id]/loyalty
 * Returns customer's current points balance and full transaction history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        loyaltyPoints: true,
        tenantId: true,
      },
    });

    if (!customer || customer.tenantId !== tenantId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const history = await prisma.loyaltyTransaction.findMany({
      where: { tenantId, customerId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            totalAmount: true,
            invoiceDate: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        loyaltyPoints: customer.loyaltyPoints,
      },
      history,
    });
  } catch (error: any) {
    console.error("Error fetching loyalty points:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch loyalty history" }, { status: 500 });
  }
}

/**
 * POST /api/customers/[id]/loyalty
 * Manual adjustment of customer loyalty points by owner/manager
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.tenantId !== tenantId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const body = await req.json();
    const pointsChange = parseInt(body.pointsChange);
    const reason = body.reason?.trim() || "Manual Store Adjustment";

    if (isNaN(pointsChange) || pointsChange === 0) {
      return NextResponse.json({ error: "Points change must be a non-zero integer" }, { status: 400 });
    }

    const newBalance = Math.max(0, customer.loyaltyPoints + pointsChange);

    const updated = await prisma.$transaction(async (tx) => {
      const cust = await tx.customer.update({
        where: { id },
        data: {
          loyaltyPoints: newBalance,
        },
      });

      const trans = await tx.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId: id,
          pointsChange,
          balanceAfter: newBalance,
          type: "MANUAL_ADJUSTMENT",
          notes: `${reason} by ${session.name}`,
        },
      });

      return { cust, trans };
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      message: `Updated points balance to ${newBalance}`,
      customer: updated.cust,
      transaction: updated.trans,
    });
  } catch (error: any) {
    console.error("Error updating loyalty points:", error);
    return NextResponse.json({ error: error.message || "Failed to adjust loyalty points" }, { status: 500 });
  }
}
