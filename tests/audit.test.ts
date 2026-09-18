import test from "node:test";
import assert from "node:assert/strict";
import { AuditAction } from "@prisma/client";
import { recordAuditLog } from "../src/lib/audit.js";
import { requireRole, AuthError, ForbiddenError } from "../src/lib/auth.js";
import { NextRequest } from "next/server";

test("Statutory Audit Trail & MCA / GST Compliance", async (t) => {
  await t.test("recordAuditLog should structure statutory audit payload correctly", async () => {
    let capturedData: any = null;

    const mockTx: any = {
      auditLog: {
        create: async (args: any) => {
          capturedData = args.data;
          return { id: "log-uuid-1", ...args.data, createdAt: new Date() };
        },
      },
    };

    const entry = await recordAuditLog(
      {
        tenantId: "tenant-123",
        userId: "user-456",
        userName: "Rajesh Kumar",
        action: AuditAction.CREDIT_NOTE_ISSUED,
        entityType: "credit_note",
        entityId: "CN-2627-0001",
        details: {
          originalInvoiceNumber: "INV-2627-0012",
          totalAmount: 1180.0,
          reason: "SALES_RETURN",
        },
        ipAddress: "192.168.1.50",
        userAgent: "Mozilla/5.0",
      },
      mockTx
    );

    assert.equal(capturedData.tenantId, "tenant-123");
    assert.equal(capturedData.userId, "user-456");
    assert.equal(capturedData.userName, "Rajesh Kumar");
    assert.equal(capturedData.action, AuditAction.CREDIT_NOTE_ISSUED);
    assert.equal(capturedData.entityType, "CREDIT_NOTE"); // Normalized to uppercase
    assert.equal(capturedData.entityId, "CN-2627-0001");
    assert.equal(capturedData.details.totalAmount, 1180.0);
    assert.equal(capturedData.ipAddress, "192.168.1.50");
    assert.ok(entry.id);
  });

  await t.test("recordAuditLog should handle nullable metadata and default fields safely", async () => {
    let capturedData: any = null;

    const mockTx: any = {
      auditLog: {
        create: async (args: any) => {
          capturedData = args.data;
          return { id: "log-uuid-2", ...args.data, createdAt: new Date() };
        },
      },
    };

    await recordAuditLog(
      {
        tenantId: "tenant-123",
        action: AuditAction.CREATE,
        entityType: "product",
        entityId: "prod-999",
      },
      mockTx
    );

    assert.equal(capturedData.tenantId, "tenant-123");
    assert.equal(capturedData.userId, null);
    assert.equal(capturedData.userName, null);
    assert.equal(capturedData.action, AuditAction.CREATE);
    assert.equal(capturedData.entityType, "PRODUCT");
    assert.equal(capturedData.entityId, "prod-999");
    assert.equal(capturedData.ipAddress, null);
    assert.equal(capturedData.userAgent, null);
  });

  await t.test("RBAC: /api/audit-logs requires OWNER or MANAGER privileges", async () => {
    // OWNER is allowed
    const ownerReq = new NextRequest("http://localhost:3005/api/audit-logs", {
      headers: {
        "x-tenant-id": "t-1",
        "x-tenant-slug": "demo-store",
        "x-user-id": "u-owner",
        "x-user-name": "Owner User",
        "x-user-role": "OWNER",
      },
    });
    const ownerSession = await requireRole(ownerReq, ["OWNER", "MANAGER"]);
    assert.equal(ownerSession.role, "OWNER");

    // MANAGER is allowed
    const mgrReq = new NextRequest("http://localhost:3005/api/audit-logs", {
      headers: {
        "x-tenant-id": "t-1",
        "x-tenant-slug": "demo-store",
        "x-user-id": "u-mgr",
        "x-user-name": "Manager User",
        "x-user-role": "MANAGER",
      },
    });
    const mgrSession = await requireRole(mgrReq, ["OWNER", "MANAGER"]);
    assert.equal(mgrSession.role, "MANAGER");

    // STAFF must be rejected with 403 ForbiddenError
    const staffReq = new NextRequest("http://localhost:3005/api/audit-logs", {
      headers: {
        "x-tenant-id": "t-1",
        "x-tenant-slug": "demo-store",
        "x-user-id": "u-staff",
        "x-user-name": "Staff User",
        "x-user-role": "STAFF",
      },
    });
    await assert.rejects(
      async () => {
        await requireRole(staffReq, ["OWNER", "MANAGER"]);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal(err.name, "ForbiddenError");
        return true;
      }
    );

    // Unauthenticated must be rejected with 401 AuthError
    const anonReq = new NextRequest("http://localhost:3005/api/audit-logs");
    await assert.rejects(
      async () => {
        await requireRole(anonReq, ["OWNER", "MANAGER"]);
      },
      (err: any) => {
        assert.ok(err instanceof AuthError);
        assert.equal(err.name, "AuthError");
        return true;
      }
    );
  });
});
