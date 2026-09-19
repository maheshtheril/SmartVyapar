import test from "node:test";
import assert from "node:assert/strict";
import { requireRole, requireSession, ForbiddenError } from "../src/lib/auth.js";
import { NextRequest } from "next/server";
import { BUILT_IN_PRESETS, DOC_TYPE_METADATA } from "../src/lib/print/template-presets.js";

test("Print Configuration Studio & Templates Presets", async (t) => {
  await t.test("Built-in presets cover all primary document types", () => {
    assert.ok(BUILT_IN_PRESETS.length >= 6);
    
    const docTypes = BUILT_IN_PRESETS.map((p) => p.docType);
    assert.ok(docTypes.includes("sale_bill"));
    assert.ok(docTypes.includes("pos_bill"));
    assert.ok(docTypes.includes("auto_workshop"));
    assert.ok(docTypes.includes("kot"));
  });

  await t.test("Document metadata covers retail, auto-workshop, and POS", () => {
    assert.equal(DOC_TYPE_METADATA.sale_bill.label, "Sale Tax Invoice");
    assert.equal(DOC_TYPE_METADATA.pos_bill.label, "POS Thermal Receipt");
    assert.equal(DOC_TYPE_METADATA.auto_workshop.label, "Automobile Job-Card & Bill");
    assert.equal(DOC_TYPE_METADATA.kot.label, "Restaurant KOT Ticket");
  });

  await t.test("STAFF role cannot modify or delete print templates (ForbiddenError)", async () => {
    const staffReq = new NextRequest("http://localhost:3005/api/print-settings", {
      method: "POST",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-staff",
        "x-user-name": "Cashier Staff",
        "x-user-role": "STAFF",
      },
    });

    await assert.rejects(
      async () => {
        await requireRole(staffReq, ["OWNER", "MANAGER"]);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.ok(err.message.includes("STAFF"));
        return true;
      }
    );
  });

  await t.test("MANAGER and OWNER are authorized to configure print studio templates", async () => {
    const mgrReq = new NextRequest("http://localhost:3005/api/print-settings", {
      method: "POST",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-mgr",
        "x-user-name": "Operations Manager",
        "x-user-role": "MANAGER",
      },
    });

    const session = await requireRole(mgrReq, ["OWNER", "MANAGER"]);
    assert.equal(session.role, "MANAGER");
    assert.equal(session.tenantId, "tenant-test-1");

    const ownerReq = new NextRequest("http://localhost:3005/api/print-settings", {
      method: "POST",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-owner",
        "x-user-name": "Store Owner",
        "x-user-role": "OWNER",
      },
    });

    const ownerSession = await requireRole(ownerReq, ["OWNER", "MANAGER"]);
    assert.equal(ownerSession.role, "OWNER");
  });

  await t.test("Staff can read print templates via session (requireSession)", async () => {
    const staffGetReq = new NextRequest("http://localhost:3005/api/print-settings", {
      method: "GET",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-staff",
        "x-user-name": "Cashier Staff",
        "x-user-role": "STAFF",
      },
    });

    const session = await requireSession(staffGetReq);
    assert.equal(session.tenantId, "tenant-test-1");
    assert.equal(session.role, "STAFF");
  });
});
