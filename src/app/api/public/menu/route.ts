import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/public/menu?slug=<tenantSlug>&tableId=<tableId>
// No auth required — public endpoint for QR self-ordering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const tableId = searchParams.get('tableId');

    if (!slug || !tableId) {
      return NextResponse.json(
        { success: false, error: 'slug and tableId query params are required' },
        { status: 400 }
      );
    }

    // Fetch tenant by slug
    const tenant = await prisma.tenant.findUnique({ where: { slug } });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    if (tenant.businessType !== 'RESTAURANT') {
      return NextResponse.json(
        { success: false, error: 'This business does not support self-ordering' },
        { status: 403 }
      );
    }

    // Fetch active products for this tenant
    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        sellingPrice: true,
        imageUrl: true,
        productType: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Fetch table
    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, tenantId: tenant.id },
      select: { id: true, name: true, section: true, status: true },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: {
        businessName: tenant.businessName,
        logoUrl: tenant.logoUrl,
      },
      table: {
        id: table.id,
        name: table.name,
        section: table.section,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || 'General',
        sellingPrice: Number(p.sellingPrice),
        imageUrl: p.imageUrl,
        productType: p.productType,
      })),
    });
  } catch (error: any) {
    console.error('Error in GET /api/public/menu:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
