import test from "node:test";
import assert from "node:assert/strict";
import { requireRole, requireSession, ForbiddenError } from "../src/lib/auth.js";
import { NextRequest } from "next/server";

test("Settings & RBAC Access Control", async (t) => {
  await t.test("STAFF cannot perform OWNER-restricted user management operations", async () => {
    const staffReq = new NextRequest("http://localhost:3005/api/users", {
      method: "POST",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-staff",
        "x-user-name": "Store Staff",
        "x-user-role": "STAFF",
      },
    });

    await assert.rejects(
      async () => {
        await requireRole(staffReq, ["OWNER"]);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.ok(err.message.includes("STAFF"));
        return true;
      }
    );
  });

  await t.test("STAFF cannot update company branding or profile", async () => {
    const staffReq = new NextRequest("http://localhost:3005/api/tenant", {
      method: "PATCH",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-staff",
        "x-user-name": "Store Staff",
        "x-user-role": "STAFF",
      },
    });

    await assert.rejects(
      async () => {
        await requireRole(staffReq, ["OWNER", "MANAGER"]);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  await t.test("MANAGER can view team members but cannot invite new users or delete users", async () => {
    const mgrReq = new NextRequest("http://localhost:3005/api/users", {
      method: "GET",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-mgr",
        "x-user-name": "Manager Bob",
        "x-user-role": "MANAGER",
      },
    });

    // View team is allowed for MANAGER
    const session = await requireRole(mgrReq, ["OWNER", "MANAGER"]);
    assert.equal(session.role, "MANAGER");

    // Invite user is restricted to OWNER
    await assert.rejects(
      async () => {
        await requireRole(mgrReq, ["OWNER"]);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  await t.test("OWNER has full permission to modify company branding and manage team", async () => {
    const ownerReq = new NextRequest("http://localhost:3005/api/users", {
      method: "POST",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-owner",
        "x-user-name": "Business Owner",
        "x-user-role": "OWNER",
      },
    });

    const session = await requireRole(ownerReq, ["OWNER"]);
    assert.equal(session.role, "OWNER");
    assert.equal(session.tenantId, "tenant-test-1");
  });
});
