import { PrismaClient, SalonAppointmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSalonDemo() {
  console.log("--- Seeding Aura Luxury Salon & Spa Demo Environment ---");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: "demo-salon" },
  });

  if (!tenant) {
    console.error("Tenant demo-salon not found!");
    return;
  }

  console.log(`Found tenant: ${tenant.businessName} (${tenant.id})`);

  // Ensure businessType is SALON_SPA
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      businessType: "SALON_SPA",
    },
  });

  // Services catalog
  const services = [
    { name: "Royal Keratin Hair Spa & Deep Moisture", price: 3500, duration: 90, sku: "SALON-KERATIN" },
    { name: "Balayage Hair Coloring & Gloss Toner", price: 5200, duration: 120, sku: "SALON-BALAYAGE" },
    { name: "24K Gold Luxury Radiance Facial", price: 2800, duration: 60, sku: "SALON-FACIAL-GOLD" },
    { name: "Moroccan Argan Oil Scalp & Hair Therapy", price: 2200, duration: 60, sku: "SALON-ARGAN" },
    { name: "Precision Haircut, Blowdry & Beard Styling", price: 850, duration: 35, sku: "SALON-CUT-BEARD" },
    { name: "Deluxe Spa Pedicure & Reflexology", price: 1400, duration: 45, sku: "SALON-PEDI-SPA" },
    { name: "Deep Tissue Aromatherapy Back Massage", price: 1950, duration: 50, sku: "SALON-MASSAGE" },
  ];

  for (const s of services) {
    const existing = await prisma.product.findFirst({
      where: { tenantId: tenant.id, name: s.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          name: s.name,
          sku: s.sku,
          sellingPrice: s.price,
          purchasePrice: s.price * 0.25,
          currentStock: 999,
          baseUnit: "SERVICE",
          gstRate: 18,
          hsnCode: "999721", // Hairdressing and beauty salon services
        },
      });
    }
  }

  // Clear existing appointments for fresh demo
  await prisma.salonAppointment.deleteMany({
    where: { tenantId: tenant.id },
  });

  const now = new Date();
  const todayYMD = now.toISOString().slice(0, 10);
  const todayStart = new Date(`${todayYMD}T00:00:00.000Z`);

  const demoAppointments = [
    {
      clientName: "Priya Sharma",
      clientPhone: "9876543210",
      stylistName: "Senior Stylist Rohan",
      chairNumber: "Chair 1",
      serviceName: "Royal Keratin Hair Spa & Deep Moisture",
      servicePrice: 3500,
      durationMinutes: 90,
      scheduledDate: todayStart,
      scheduledTime: "09:30",
      status: SalonAppointmentStatus.IN_SERVICE,
      tokenNumber: "W-01",
      isWalkIn: true,
      tipAmount: 300,
      totalCommission: 525,
      servicesJson: [
        {
          name: "Royal Keratin Hair Spa & Deep Moisture",
          price: 3500,
          durationMinutes: 90,
          stylistName: "Senior Stylist Rohan",
          commissionPercent: 15,
          commissionAmount: 525,
        },
      ],
      clientHistory: {
        hairType: "Wavy / Medium Density (Dry Ends)",
        skinType: "Normal",
        colorFormula: "Natural Black #1",
        allergies: "None",
        patchTestStatus: "VERIFIED",
        preferences: "Lukewarm rinse, herbal serum only",
      },
      notes: "VIP Client. Scalp massage with warm towel requested.",
    },
    {
      clientName: "Ananya Verma",
      clientPhone: "9845123456",
      stylistName: "Colorist Priya",
      chairNumber: "Chair 2",
      serviceName: "Balayage Hair Coloring & Gloss Toner",
      servicePrice: 5200,
      durationMinutes: 120,
      scheduledDate: todayStart,
      scheduledTime: "10:00",
      status: SalonAppointmentStatus.CHECKED_IN,
      tokenNumber: "T-02",
      isWalkIn: false,
      tipAmount: 0,
      totalCommission: 780,
      servicesJson: [
        {
          name: "Balayage Hair Coloring & Gloss Toner",
          price: 5200,
          durationMinutes: 120,
          stylistName: "Colorist Priya",
          commissionPercent: 15,
          commissionAmount: 780,
        },
      ],
      clientHistory: {
        hairType: "Fine / Straight (Bleached previously)",
        skinType: "Fair",
        colorFormula: "Ash Blonde 8.1 + 20 Vol Developer + Olaplex No. 1",
        allergies: "Ammonia sensitive (use ammonia-free)",
        patchTestStatus: "VERIFIED",
        preferences: "Needs espresso during processing",
      },
      notes: "Arrived on time. Color mixing in progress.",
    },
    {
      clientName: "Rahul Nair",
      clientPhone: "9744112233",
      stylistName: "Barber Arjun",
      chairNumber: "Chair 3",
      serviceName: "Precision Haircut, Blowdry & Beard Styling",
      servicePrice: 850,
      durationMinutes: 35,
      scheduledDate: todayStart,
      scheduledTime: "10:30",
      status: SalonAppointmentStatus.WAITING,
      tokenNumber: "W-03",
      isWalkIn: true,
      tipAmount: 0,
      totalCommission: 127.5,
      servicesJson: [
        {
          name: "Precision Haircut, Blowdry & Beard Styling",
          price: 850,
          durationMinutes: 35,
          stylistName: "Barber Arjun",
          commissionPercent: 15,
          commissionAmount: 127.5,
        },
      ],
      clientHistory: {
        hairType: "Thick / Coarse",
        preferences: "Skin fade on sides, textured crop on top",
      },
      notes: "In waiting lounge. Offered green tea.",
    },
    {
      clientName: "Dr. Sunita Menon",
      clientPhone: "9820334455",
      stylistName: "Therapist Meera",
      chairNumber: "Spa Suite A",
      serviceName: "24K Gold Luxury Radiance Facial",
      servicePrice: 2800,
      durationMinutes: 60,
      scheduledDate: todayStart,
      scheduledTime: "11:30",
      status: SalonAppointmentStatus.BOOKED,
      tokenNumber: "T-04",
      isWalkIn: false,
      tipAmount: 0,
      totalCommission: 420,
      servicesJson: [
        {
          name: "24K Gold Luxury Radiance Facial",
          price: 2800,
          durationMinutes: 60,
          stylistName: "Therapist Meera",
          commissionPercent: 15,
          commissionAmount: 420,
        },
      ],
      clientHistory: {
        skinType: "Dry / Mature",
        allergies: "Fragrance sensitivity",
        patchTestStatus: "VERIFIED",
        preferences: "Gentle extraction, lavender diffuser",
      },
      notes: "Online booking via website QR link.",
    },
    {
      clientName: "Vikram Malhotra",
      clientPhone: "9911223344",
      stylistName: "Senior Stylist Rohan",
      chairNumber: "Chair 1",
      serviceName: "Moroccan Argan Oil Scalp & Hair Therapy",
      servicePrice: 2200,
      durationMinutes: 60,
      scheduledDate: todayStart,
      scheduledTime: "12:15",
      status: SalonAppointmentStatus.BOOKED,
      tokenNumber: "T-05",
      isWalkIn: false,
      tipAmount: 0,
      totalCommission: 330,
      servicesJson: [
        {
          name: "Moroccan Argan Oil Scalp & Hair Therapy",
          price: 2200,
          durationMinutes: 60,
          stylistName: "Senior Stylist Rohan",
          commissionPercent: 15,
          commissionAmount: 330,
        },
      ],
      notes: "Corporate executive package.",
    },
    {
      clientName: "Deepika Patel",
      clientPhone: "9822998877",
      stylistName: "Therapist Meera",
      chairNumber: "Pedicure Lounge",
      serviceName: "Deluxe Spa Pedicure & Reflexology",
      servicePrice: 1400,
      durationMinutes: 45,
      scheduledDate: todayStart,
      scheduledTime: "08:30",
      status: SalonAppointmentStatus.COMPLETED,
      tokenNumber: "T-01",
      isWalkIn: false,
      tipAmount: 200,
      totalCommission: 210,
      servicesJson: [
        {
          name: "Deluxe Spa Pedicure & Reflexology",
          price: 1400,
          durationMinutes: 45,
          stylistName: "Therapist Meera",
          commissionPercent: 15,
          commissionAmount: 210,
        },
      ],
      notes: "Payment settled via UPI QR. ₹200 cash tip left for Meera.",
    },
    {
      clientName: "Kavita Reddy",
      clientPhone: "9833445566",
      stylistName: "Colorist Priya",
      chairNumber: "Chair 2",
      serviceName: "Royal Keratin Hair Spa & Deep Moisture",
      servicePrice: 3500,
      durationMinutes: 90,
      scheduledDate: todayStart,
      scheduledTime: "14:00",
      status: SalonAppointmentStatus.BOOKED,
      tokenNumber: "T-06",
      isWalkIn: false,
      tipAmount: 0,
      totalCommission: 525,
      notes: "WhatsApp booking bot confirmed.",
    },
    {
      clientName: "Karthik Iyer",
      clientPhone: "9899001122",
      stylistName: "Barber Arjun",
      chairNumber: "Chair 3",
      serviceName: "Precision Haircut, Blowdry & Beard Styling",
      servicePrice: 850,
      durationMinutes: 35,
      scheduledDate: todayStart,
      scheduledTime: "15:30",
      status: SalonAppointmentStatus.BOOKED,
      tokenNumber: "T-07",
      isWalkIn: false,
      tipAmount: 0,
      totalCommission: 127.5,
      notes: "Afternoon slot booked.",
    },
  ];

  for (const appt of demoAppointments) {
    await prisma.salonAppointment.create({
      data: {
        tenantId: tenant.id,
        ...appt,
      },
    });
  }

  console.log(`Successfully seeded ${demoAppointments.length} appointments for today (${todayYMD})!`);
}

seedSalonDemo()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
