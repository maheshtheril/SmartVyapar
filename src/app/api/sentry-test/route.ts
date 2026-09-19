import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "ADMIN"]);

    // Deliberately capture a diagnostic test exception
    const testError = new Error(
      `SmartVyapar Sentry Diagnostic Test Event by ${session.name || "User"} (${session.role})`
    );

    const eventId = Sentry.captureException(testError, {
      tags: {
        environment: process.env.NODE_ENV || "production",
        tenantId: session.tenantId,
        userRole: session.role,
        diagnostic: "true",
      },
      user: {
        id: session.userId,
        username: session.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sentry diagnostic event triggered successfully",
      eventId,
      sentryConfigured: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
      environment: process.env.NODE_ENV,
    });
  } catch (err: any) {
    if (err.name === "AuthError" || err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.name === "ForbiddenError" || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: "Forbidden: Owner or Admin role required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Diagnostic test error" }, { status: 500 });
  }
}
