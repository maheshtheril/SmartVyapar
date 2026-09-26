import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.tenantId;

    const suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }, select: { id: true, name: true, gstin: true, phone: true, email: true, address: true, isActive: true, outstandingBalance: true, openingBalanceDate: true, _count: { select: { purchaseBills: true } } }
    });

    return NextResponse.json({ success: true, suppliers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['OWNER', 'ADMIN', 'MANAGER']);
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.tenantId;

    const body = await req.json();
    const { name, gstin, phone, email, address, openingBalance, openingBalanceDate } = body;

    if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const vendorAccount = await tx.account.create({
        data: {
          tenantId,
          code: `AP-${Date.now().toString().slice(-6)}`,
          name: `Vendor: ${name}`,
          classification: 'LIABILITY',
          balance: parseFloat(openingBalance) || 0,
        }
      });

      const newSupplier = await tx.supplier.create({
        data: {
          tenantId,
          name,
          gstin: gstin || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          accountId: vendorAccount.id,
          outstandingBalance: parseFloat(openingBalance) || 0,
          ...(openingBalanceDate !== undefined && { openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null })
        }
      });
      return newSupplier;
    });

    return NextResponse.json({ success: true, supplier: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    const { id, name, phone, gstin, email, address, isActive } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });
    }

    const updated = await prisma.supplier.update({
      where: { id, tenantId },
      data: {
        name,
        phone: phone || null,
        gstin: gstin || null,
        email: email || null,
        address: address || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ success: true, supplier: updated });
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

    // Check if supplier has linked purchase bills
    const supplier = await prisma.supplier.findUnique({
      where: { id, tenantId },
      include: { purchaseBills: true }
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (supplier.purchaseBills.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete supplier because they have existing purchase bills. Please edit the supplier and mark them as 'Inactive' instead." 
      }, { status: 400 });
    }

    await prisma.supplier.delete({
      where: { id, tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
