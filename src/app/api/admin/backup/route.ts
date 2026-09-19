import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createDatabaseSnapshot } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Validates either a valid OWNER session or a Bearer token matching CRON_SECRET.
 */
async function authenticateBackupRequest(req: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  // 1. Check Cron Secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  // 2. Check Session
  try {
    await requireRole(req, ["OWNER"]);
    return { authorized: true };
  } catch (err: any) {
    return {
      authorized: false,
      error: err.name === "ForbiddenError" ? "Forbidden: Owner role required" : "Unauthorized",
    };
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateBackupRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: auth.error?.startsWith("Forbidden") ? 403 : 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || undefined;
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || undefined;

    const { manifest } = await createDatabaseSnapshot({
      tenantId,
      encryptionKey,
    });

    return NextResponse.json({
      success: true,
      message: "Database backup snapshot generated successfully",
      manifest,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create database snapshot" },
      { status: 500 }
    );
  }
}
