import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { dispatchCustomerNotification } from "@/lib/notifications";
import { recordAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const body = await req.json();

    const {
      channel = "WHATSAPP",
      type = "TEST",
      recipientPhone,
      invoiceId,
      customerId,
      customMessage,
    } = body;

    if (!recipientPhone) {
      return NextResponse.json(
        { error: "recipientPhone is required" },
        { status: 400 }
      );
    }

    if (!["WHATSAPP", "SMS", "BOTH"].includes(channel)) {
      return NextResponse.json(
        { error: "Invalid channel. Must be WHATSAPP, SMS, or BOTH." },
        { status: 400 }
      );
    }

    const { results, summary } = await dispatchCustomerNotification({
      channel,
      type,
      recipientPhone,
      tenantId: session.tenantId,
      invoiceId,
      customerId,
      customMessage,
    });

    // Record statutory audit log entry
    await recordAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.STATUS_CHANGE,
      entityType: "NOTIFICATION",
      entityId: invoiceId || customerId || "DISPATCH",
      details: {
        channel,
        type,
        recipientPhone,
        summary,
        results,
      },
    });

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (err: any) {
    if (err.name === "AuthError" || err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to dispatch notification" },
      { status: 500 }
    );
  }
}
