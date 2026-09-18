import test from "node:test";
import assert from "node:assert/strict";
import { requireRole, AuthError, ForbiddenError } from "../src/lib/auth.js";
import { NextRequest } from "next/server";

test("Role-Based Access Control (RBAC Guard)", async (t) => {
  await t.test("should authorize request when user role matches allowed roles", async () => {
    // Simulated request with middleware headers for an OWNER
    const req = new NextRequest("http://localhost:3005/api/products", {
      headers: {
        "x-tenant-id": "tenant-1",
        "x-tenant-slug": "ziona-electricals",
        "x-user-id": "user-1",
        "x-user-name": "Owner Admin",
        "x-user-role": "OWNER",
      },
    });

    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    assert.equal(session.role, "OWNER");
    assert.equal(session.tenantId, "tenant-1");
  });

  await t.test("should authorize MANAGER for manager-permitted operations", async () => {
    const req = new NextRequest("http://localhost:3005/api/accounts", {
      headers: {
        "x-tenant-id": "tenant-1",
        "x-tenant-slug": "ziona-electricals",
        "x-user-id": "user-2",
        "x-user-name": "Store Manager",
        "x-user-role": "MANAGER",
      },
    });

    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    assert.equal(session.role, "MANAGER");
  });

  await t.test("should throw ForbiddenError when STAFF attempts restricted manager operation", async () => {
    const req = new NextRequest("http://localhost:3005/api/products", {
      headers: {
        "x-tenant-id": "tenant-1",
        "x-tenant-slug": "ziona-electricals",
        "x-user-id": "user-3",
        "x-user-name": "Billing Staff",
        "x-user-role": "STAFF",
      },
    });

    await assert.rejects(
      async () => {
        await requireRole(req, ["OWNER", "MANAGER"]);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.ok(err.message.includes("is not authorized to perform this operation"));
        return true;
      }
    );
  });

  await t.test("should throw ForbiddenError when MANAGER attempts OWNER-only operation", async () => {
    const req = new NextRequest("http://localhost:3005/api/tenant", {
      headers: {
        "x-tenant-id": "tenant-1",
        "x-tenant-slug": "ziona-electricals",
        "x-user-id": "user-2",
        "x-user-name": "Store Manager",
        "x-user-role": "MANAGER",
      },
    });

    await assert.rejects(
      async () => {
        await requireRole(req, ["OWNER"]);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  await t.test("should throw AuthError when request is completely unauthenticated", async () => {
    const req = new NextRequest("http://localhost:3005/api/products");

    await assert.rejects(
      async () => {
        await requireRole(req, ["OWNER", "MANAGER"]);
      },
      (err: any) => {
        assert.ok(err instanceof AuthError);
        return true;
      }
    );
  });
});
