import { NextRequest, NextResponse } from "next/server";
import { parseIncomingMetaMessage, processCustomerCommand } from "@/lib/whatsapp-bot";

// GET /api/whatsapp/webhook - Meta Cloud API Webhook Handshake Verification
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (!expectedToken) {
      console.error("Missing WHATSAPP_WEBHOOK_VERIFY_TOKEN");
      return new Response("Internal Server Error", { status: 500 });
    }

    if (mode === "subscribe" && token === expectedToken) {
      console.log("✅ [WhatsApp Webhook] Meta verification successful!");
      return new Response(challenge || "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn("⚠️ [WhatsApp Webhook] Invalid verification token:", token);
    return new Response("Forbidden: Invalid verify_token", { status: 403 });
  } catch (err: any) {
    console.error("Webhook GET error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// POST /api/whatsapp/webhook - Inbound WhatsApp Message Handler & Interactive Simulator
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Direct Webhook Simulator Mode (invoked from Settings UI)
    if (body.testPhone && body.testMessage) {
      const result = await processCustomerCommand(
        body.testPhone,
        body.testMessage,
        body.dryRun ?? false
      );
      return NextResponse.json({
        success: true,
        isSimulation: true,
        result,
      });
    }

    // 2. Official Meta WhatsApp Cloud API Webhook Notification
    const parsed = parseIncomingMetaMessage(body);

    if (!parsed || !parsed.senderPhone || !parsed.text) {
      // Return 200 OK so Meta doesn't retry status updates (sent, delivered, read receipts)
      return NextResponse.json({
        status: "acknowledged",
        message: "No user text message to process",
      });
    }

    console.log(`📩 [WhatsApp Webhook] Inbound message from +${parsed.senderPhone}: "${parsed.text}"`);

    const botResult = await processCustomerCommand(
      parsed.senderPhone,
      parsed.text,
      false // live dispatch
    );

    return NextResponse.json({
      success: true,
      senderPhone: parsed.senderPhone,
      intent: botResult.intent,
      replyDispatched: botResult.dispatched,
      messageId: botResult.messageId,
    });
  } catch (err: any) {
    console.error("Webhook POST error:", err);
    // Meta requires a 200 OK or 500
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
