import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError, ForbiddenError } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const actionParam = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let action: AuditAction | undefined;
    if (actionParam && Object.values(AuditAction).includes(actionParam as AuditAction)) {
      action = actionParam as AuditAction;
    }

    const result = await getAuditLogs({
      tenantId,
      entityType,
      entityId,
      action,
      limit: isNaN(limit) ? 50 : limit,
      offset: isNaN(offset) ? 0 : offset,
    });

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Audit log retrieval failed:", error);
    return NextResponse.json(
      { error: "Failed to retrieve statutory audit logs" },
      { status: 500 }
    );
  }
}
