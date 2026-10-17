import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALL_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
];

const DEFAULT_STYLIST_PROFILES = [
  { name: 'Senior Stylist Rahul', role: 'Master Hair Sculptor & Fades', rating: '4.9', avatar: 'RH', specialty: 'Precision Cuts & Fades' },
  { name: 'Master Colorist Priya', role: 'Balayage & Hair Spa Expert', rating: '4.95', avatar: 'PR', specialty: 'L’Oréal Color & Keratin' },
  { name: 'Therapist Ananya', role: 'Spa & Deep Tissue Specialist', rating: '4.9', avatar: 'AN', specialty: 'Full Body Spa & Relaxation' },
  { name: 'Skin Specialist Dr. Neha', role: 'Clinical Aesthetician', rating: '5.0', avatar: 'NH', specialty: 'Hydra Facial & Vitamin C' },
  { name: 'Hair Artist Imran', role: 'Senior Grooming Stylist', rating: '4.85', avatar: 'IM', specialty: 'Beard Sculpting & Wash' },
  { name: 'Any Available Specialist', role: 'Fastest Service Guaranteed', rating: '5.0', avatar: '⚡', specialty: 'Zero Wait Priority' },
];

const DEFAULT_SALON_SERVICES = [
  { id: 'srv-1', name: 'Signature Haircut & Scalp Wash', category: 'Hair', price: 450, durationMinutes: 45, description: 'Consultation, precision haircut, relaxing scalp massage & blow dry' },
  { id: 'srv-2', name: 'Beard Sculpting & Hot Towel Treatment', category: 'Beard', price: 250, durationMinutes: 20, description: 'Beard shaping, razor sharp lining & nourishing oil massage' },
  { id: 'srv-3', name: 'L’Oréal Professional Hair Color & Gloss', category: 'Color', price: 1800, durationMinutes: 60, description: 'Ammonia-free root touchup, high-gloss finish & post-color wash' },
  { id: 'srv-4', name: 'Keratin Protein Smoothing Therapy', category: 'Treatments', price: 3200, durationMinutes: 90, description: 'Intensive frizz-free keratin infusion, long-lasting silk shine' },
  { id: 'srv-5', name: 'Hydra Facial & Vitamin C Anti-Pollution Glow', category: 'Facial', price: 1500, durationMinutes: 60, description: 'Deep pore vacuum extraction, antioxidant serum infusion & gold mask' },
  { id: 'srv-6', name: 'Deep Tissue Full Body Aromatherapy Spa', category: 'Spa', price: 2000, durationMinutes: 60, description: 'Stress-relief warm essential oil therapy in private spa suite' },
  { id: 'srv-7', name: 'Express Manicure & Pedicure Combo', category: 'Nails', price: 950, durationMinutes: 45, description: 'Nail shaping, cuticle care, herbal scrub & hand-foot massage' },
  { id: 'srv-8', name: 'Bridal / Groom Royal Glow & Hair Styling', category: 'Bridal', price: 7500, durationMinutes: 120, description: 'Complete head-to-toe makeover, bridal hairstyle & HD makeup' },
];

// GET /api/public/salon/slots?slug=<slug>&date=YYYY-MM-DD&stylist=<name>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const stylistParam = searchParams.get('stylist');

    // Find tenant by slug, or default to first SALON_SPA tenant or active tenant
    let tenant: any = null;
    if (slug) {
      tenant = await prisma.tenant.findUnique({ where: { slug } });
    }
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { businessType: 'SALON_SPA' },
      });
    }
    if (!tenant) {
      tenant = await prisma.tenant.findFirst();
    }

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Salon business not found' }, { status: 404 });
    }

    // Fetch existing appointments for the selected date
    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    const whereClause: any = {
      tenantId: tenant.id,
      scheduledDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        notIn: ['CANCELLED', 'NO_SHOW'],
      },
    };

    if (stylistParam && stylistParam !== 'Any Available Specialist') {
      whereClause.stylistName = stylistParam;
    }

    const existingAppointments = await prisma.salonAppointment.findMany({
      where: whereClause,
      select: {
        id: true,
        scheduledTime: true,
        durationMinutes: true,
        stylistName: true,
        chairNumber: true,
      },
    });

    const occupiedTimes = new Set(existingAppointments.map((a) => a.scheduledTime));

    // Compute live slot availability
    const slots = ALL_TIME_SLOTS.map((time) => {
      const isOccupied = occupiedTimes.has(time);
      return {
        time,
        isAvailable: !isOccupied,
      };
    });

    // Fetch staff members to augment stylist profiles
    const dbStaff = await prisma.user.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, role: true },
    });

    let stylists = [...DEFAULT_STYLIST_PROFILES];
    if (dbStaff && dbStaff.length > 0) {
      const dbStylistProfiles = dbStaff.map((s) => ({
        name: s.name,
        role: `${s.role} Specialist`,
        rating: '4.9',
        avatar: s.name.slice(0, 2).toUpperCase(),
        specialty: 'Salon & Spa Services',
      }));
      // Keep "Any Available Specialist" at end
      stylists = [...dbStylistProfiles, DEFAULT_STYLIST_PROFILES[DEFAULT_STYLIST_PROFILES.length - 1]];
    }

    // Fetch custom services from products catalog if available
    const dbServices = await prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        OR: [
          { baseUnit: 'SERVICE' },
          { hsnCode: { startsWith: '9997' } },
          { category: { contains: 'Hair', mode: 'insensitive' } },
          { category: { contains: 'Spa', mode: 'insensitive' } },
          { category: { contains: 'Skin', mode: 'insensitive' } },
          { category: { contains: 'Facial', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
        sellingPrice: true,
      },
    });

    let services = DEFAULT_SALON_SERVICES;
    if (dbServices && dbServices.length > 0) {
      services = dbServices.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || 'Specialist',
        price: Number(p.sellingPrice || 0),
        durationMinutes: 45,
        description: 'Professional salon service with premium products',
      }));
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.businessName,
        phone: tenant.phone,
        address: tenant.address,
        logoUrl: tenant.logoUrl,
        slug: tenant.slug,
      },
      date: dateParam,
      stylists,
      services,
      slots,
    });
  } catch (err: any) {
    console.error('GET /api/public/salon/slots error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to load booking slots' }, { status: 500 });
  }
}
