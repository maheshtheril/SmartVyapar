import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Vercel Cron auth check
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch up to 50 PENDING reminders to process in this batch
    const pendingReminders = await prisma.serviceReminder.findMany({
      where: { status: 'PENDING' },
      take: 50,
      include: {
        customer: true,
        tenant: true
      }
    });

    const results = {
      sent: 0,
      failed: 0
    };

    for (const reminder of pendingReminders) {
      try {
        const phone = reminder.customer.phone;
        if (!phone || phone.length < 10) {
          throw new Error("Invalid phone number");
        }

        // --- MOCK SMS / WHATSAPP PROVIDER API CALL ---
        // In a real implementation, you would use Twilio or Meta WhatsApp API here
        // await twilioClient.messages.create({ body: reminder.message, to: phone, from: '...' })
        
        console.log(`[SMS Worker] Delivering to ${phone}: ${reminder.message}`);
        
        // Mark as sent
        await prisma.serviceReminder.update({
          where: { id: reminder.id },
          data: { status: 'SENT' }
        });
        
        results.sent++;
      } catch (err: any) {
        console.error(`[SMS Worker] Failed to send reminder ${reminder.id}:`, err);
        // Mark as failed
        await prisma.serviceReminder.update({
          where: { id: reminder.id },
          data: { 
            status: 'FAILED',
            callNotes: err.message
          }
        });
        results.failed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: pendingReminders.length,
      results
    });

  } catch (error: any) {
    console.error("Delivery Worker Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
