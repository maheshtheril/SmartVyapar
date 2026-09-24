import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const labourServices = await prisma.labourService.findMany({
      where: { tenantId: session.tenantId, isActive: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(labourServices);
  } catch (error) {
    console.error('Labour Services fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch labour services' }, { status: 500 });
  }
}
