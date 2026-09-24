import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// This endpoint should be triggered by a Vercel Cron Job (e.g., daily at 9:00 AM)
export async function GET(req: NextRequest) {
  try {
    // Vercel Cron auth check
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current time components in India (Asia/Kolkata)
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    
    // We want the start of the current IST day (00:00:00), expressed as a UTC Date for Prisma.
    // IST is UTC+05:30. So 00:00:00 IST is the previous day's 18:30:00 UTC.
    const today = new Date(Date.UTC(istTime.getFullYear(), istTime.getMonth(), istTime.getDate(), -5, -30, 0, 0));
    
    // Look ahead 7 days for upcoming services
    const upcomingDate = new Date(today);
    upcomingDate.setDate(today.getDate() + 7);

    // Look back up to 30 days past due
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 30);

    const vehiclesDue = await prisma.customerVehicle.findMany({
      where: {
        nextServiceDate: {
          gte: pastDate,
          lte: upcomingDate,
        },
      },
      include: {
        customer: true,
        tenant: true,
        serviceReminders: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const newlyCreated = [];

    for (const vehicle of vehiclesDue) {
      const daysUntil = vehicle.nextServiceDate 
        ? Math.ceil((vehicle.nextServiceDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
        : 0;

      // Formalize reminder cycles
      let cycle = "";
      if (daysUntil === 7) cycle = "SERVICE_DUE_7_DAYS";
      else if (daysUntil === 0) cycle = "SERVICE_DUE_TODAY";
      else if (daysUntil === -7) cycle = "SERVICE_OVERDUE_7_DAYS";
      else if (daysUntil === -30) cycle = "SERVICE_OVERDUE_30_DAYS";
      else continue; // Only trigger on exact cycle boundaries

      let statusStr = daysUntil < 0 ? "OVERDUE" : (daysUntil === 0 ? "TODAY" : "UPCOMING");
      
      const message = `Hello ${vehicle.customer.name}, your ${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.licensePlate}) is due for service ${statusStr === 'OVERDUE' ? 'since ' + Math.abs(daysUntil) + ' days ago' : (daysUntil === 0 ? 'today' : 'in ' + daysUntil + ' days')}. Please visit ${vehicle.tenant.businessName} or call to book an appointment!`;
      
      const idempotencyKey = `${vehicle.tenantId}-${vehicle.id}-${cycle}`;

      try {
        // Persist to database atomically
        const reminder = await prisma.serviceReminder.create({
          data: {
            tenantId: vehicle.tenantId,
            customerId: vehicle.customerId,
            vehicleId: vehicle.id,
            reminderDate: today,
            reminderType: "AUTOMATED_SMS",
            message,
            status: "PENDING",
            idempotencyKey
          }
        });
        newlyCreated.push(reminder);
      } catch (err: any) {
        // If P2002 (Unique constraint failed), another cron execution just created it. Safe to ignore.
        if (err.code === 'P2002') continue;
        throw err;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: newlyCreated.length,
      reminders: newlyCreated
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
