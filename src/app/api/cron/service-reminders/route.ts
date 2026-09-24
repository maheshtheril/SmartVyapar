import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// This endpoint should be triggered by a Vercel Cron Job (e.g., daily at 9:00 AM)
export async function GET(req: NextRequest) {
  try {
    // Add Vercel Cron auth check here in production
    // if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const today = new Date();
    
    // Look ahead 7 days for upcoming services
    const upcomingDate = new Date();
    upcomingDate.setDate(today.getDate() + 7);

    // 1. Find vehicles whose nextServiceDate is between today and 7 days from now,
    // OR vehicles that are already overdue (up to 30 days past due) but haven't been reminded recently
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 30);

    const vehiclesDue = await prisma.customerVehicle.findMany({
      where: {
        nextServiceDate: {
          gte: pastDate,
          lte: upcomingDate,
        },
        // In a full implementation, you'd check a 'ReminderLog' table to ensure 
        // you don't spam the customer every day.
      },
      include: {
        customer: true,
        tenant: true
      }
    });

    const generatedReminders = vehiclesDue.map(vehicle => {
      const daysUntil = vehicle.nextServiceDate 
        ? Math.ceil((vehicle.nextServiceDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
        : 0;

      let status = daysUntil < 0 ? "OVERDUE" : (daysUntil === 0 ? "TODAY" : "UPCOMING");
      
      return {
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        customerId: vehicle.customer.id,
        customerPhone: vehicle.customer.phone,
        message: `Hello ${vehicle.customer.name}, your ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate}) is due for service ${status === 'OVERDUE' ? 'since ' + Math.abs(daysUntil) + ' days ago' : 'in ' + daysUntil + ' days'}. Please visit ${vehicle.tenant.businessName} or call to book an appointment!`,
        scheduledDate: vehicle.nextServiceDate,
        status
      };
    });

    // In a real implementation, we would write these to a `ServiceReminder` table
    // and push them to a WhatsApp/SMS queue like Twilio/Meta API.
    
    return NextResponse.json({ 
      success: true, 
      processed: generatedReminders.length,
      reminders: generatedReminders
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
