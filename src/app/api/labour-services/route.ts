import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = await requireSession();
    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const labourServices = await prisma.labourService.findMany({
      where: { tenantId: auth.user.tenantId, isActive: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(labourServices);
  } catch (error) {
    console.error('Labour Services fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch labour services' }, { status: 500 });
  }
}

