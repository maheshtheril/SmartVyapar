import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Vercel Cron auth check
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Atomically claim up to 50 reminders that are either PENDING or FAILED (and ready for retry)
    const claimedIds: { id: string }[] = await prisma.$queryRaw`
      UPDATE "ServiceReminder" 
      SET status = 'PROCESSING'
      WHERE id IN (
        SELECT id FROM "ServiceReminder" 
        WHERE status = 'PENDING' 
           OR (status = 'FAILED' AND "nextAttemptAt" IS NOT NULL AND "nextAttemptAt" <= NOW() AND "attemptCount" < 3)
        LIMIT 50
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id;
    `;

    if (claimedIds.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No reminders to process" });
    }

    const ids = claimedIds.map(c => c.id);

    // Fetch full data for the claimed reminders
    const processingReminders = await prisma.serviceReminder.findMany({
      where: { id: { in: ids } },
      include: {
        customer: true,
        tenant: true
      }
    });

    const results = {
      sent: 0,
      failed: 0
    };

    for (const reminder of processingReminders) {
      const attempt = reminder.attemptCount + 1;
      try {
        const phone = reminder.customer.phone;
        if (!phone || phone.length < 10) {
          throw new Error("Invalid phone number");
        }

        // --- SIMULATED SMS / WHATSAPP PROVIDER API CALL ---
        // TODO: Replace with real Twilio or Meta WhatsApp API client
        // await twilioClient.messages.create({ body: reminder.message, to: phone, from: '...' })
        
        console.log(`[SMS Worker - SIMULATION ONLY] Delivering to ${phone}: ${reminder.message}`);
        
        // Mark as sent
        await prisma.serviceReminder.update({
          where: { id: reminder.id },
          data: { 
            status: 'SENT',
            attemptCount: attempt,
            sentAt: new Date(),
            providerMessageId: `sim_${Date.now()}_${reminder.id.substring(0, 5)}`
          }
        });
        
        results.sent++;
      } catch (err: any) {
        console.error(`[SMS Worker] Failed to send reminder ${reminder.id}:`, err);
        // Exponential backoff for retries
        const maxAttempts = 3;
        const nextAttemptAt = attempt < maxAttempts 
          ? new Date(Date.now() + Math.pow(2, attempt) * 15 * 60000) // 30m, 60m
          : null;

        // Mark as failed
        await prisma.serviceReminder.update({
          where: { id: reminder.id },
          data: { 
            status: 'FAILED',
            attemptCount: attempt,
            nextAttemptAt,
            callNotes: err.message
          }
        });
        results.failed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: ids.length,
      results,
      note: "This endpoint is running in SIMULATION mode. No real SMS were sent."
    });

  } catch (error: any) {
    console.error("Delivery Worker Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
