import { prisma } from "@/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";

export interface CreateAuditLogParams {
  tenantId: string;
  userId?: string | null;
  userName?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Creates an immutable statutory audit log entry.
 * Can be executed inside an active Prisma $transaction or standalone.
 */
export async function recordAuditLog(
  params: CreateAuditLogParams,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  return await db.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId || null,
      userName: params.userName || null,
      action: params.action,
      entityType: params.entityType.toUpperCase(),
      entityId: params.entityId,
      details: params.details ? (params.details as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    },
  });
}

/**
 * Retrieves audit logs for a specific tenant with optional entity or action filters.
 */
export async function getAuditLogs(params: {
  tenantId: string;
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  const { tenantId, entityType, entityId, action, limit = 50, offset = 0 } = params;

  const where: Prisma.AuditLogWhereInput = {
    tenantId,
    ...(entityType ? { entityType: entityType.toUpperCase() } : {}),
    ...(entityId ? { entityId } : {}),
    ...(action ? { action } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
}
