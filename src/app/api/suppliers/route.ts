import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['ADMIN', 'MANAGER', 'CASHIER']);
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.tenantId;

    const suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, suppliers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['ADMIN', 'MANAGER']);
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.tenantId;

    const body = await req.json();
    const { name, gstin, phone, email, address } = body;

    if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      // Create AP Ledger
      const vendorAccount = await tx.account.create({
        data: {
          tenantId,
          code: `AP-${Date.now().toString().slice(-6)}`,
          name: `Vendor: ${name}`,
          classification: 'LIABILITY',
          balance: 0,
        }
      });

      // Create Supplier
      const newSupplier = await tx.supplier.create({
        data: {
          tenantId,
          name,
          gstin: gstin || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          accountId: vendorAccount.id
        }
      });
      return newSupplier;
    });

    return NextResponse.json({ success: true, supplier: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
