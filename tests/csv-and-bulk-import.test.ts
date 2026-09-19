import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, generateCsv } from "../src/lib/csv.js";
import { requireRole, requireSession, ForbiddenError, AuthError } from "../src/lib/auth.js";
import { NextRequest } from "next/server";

test("CSV Parser & Generator (RFC 4180)", async (t) => {
  await t.test("should accurately parse simple CSV data", () => {
    const csv = `Name,Price,Stock\nLED Bulb,450,20\nSwitch,85,50`;
    const rows = parseCsv(csv);

    assert.equal(rows.length, 2);
    assert.equal(rows[0]["Name"], "LED Bulb");
    assert.equal(rows[0]["Price"], "450");
    assert.equal(rows[0]["Stock"], "20");
    assert.equal(rows[1]["Name"], "Switch");
  });

  await t.test("should properly handle commas inside quoted fields and quotes escaping", () => {
    const csv = `Name,Category,Price\n"Polycab 2.5mm Wire, Red","Wires & Cables",2250\n"Philips ""Bright"" 20W",Lighting,350`;
    const rows = parseCsv(csv);

    assert.equal(rows.length, 2);
    assert.equal(rows[0]["Name"], "Polycab 2.5mm Wire, Red");
    assert.equal(rows[0]["Category"], "Wires & Cables");
    assert.equal(rows[1]["Name"], 'Philips "Bright" 20W');
  });

  await t.test("should generate valid CSV with escaped quotes and commas", () => {
    const headers = [
      { key: "name", label: "Product Name" },
      { key: "price", label: "Selling Price" },
    ];
    const data = [
      { name: "Wire, 2.5mm", price: 1200 },
      { name: 'Bulb "Pro"', price: 400 },
    ];

    const generated = generateCsv(headers, data);
    assert.ok(generated.includes('"Wire, 2.5mm"'));
    assert.ok(generated.includes('"Bulb ""Pro"""'));
  });
});

test("Bulk Inventory Import RBAC & Validation Security", async (t) => {
  await t.test("STAFF cannot perform bulk inventory imports (ForbiddenError)", async () => {
    const staffReq = new NextRequest("http://localhost:3005/api/inventory/import", {
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

  await t.test("MANAGER and OWNER are authorized to perform bulk imports", async () => {
    const mgrReq = new NextRequest("http://localhost:3005/api/inventory/import", {
      method: "POST",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-mgr",
        "x-user-name": "Store Manager",
        "x-user-role": "MANAGER",
      },
    });

    const session = await requireRole(mgrReq, ["OWNER", "MANAGER"]);
    assert.equal(session.role, "MANAGER");
  });

  await t.test("Staff can export inventory catalog via requireSession", async () => {
    const staffReq = new NextRequest("http://localhost:3005/api/inventory/export", {
      method: "GET",
      headers: {
        "x-tenant-id": "tenant-test-1",
        "x-tenant-slug": "test-store",
        "x-user-id": "user-staff",
        "x-user-name": "Cashier Staff",
        "x-user-role": "STAFF",
      },
    });

    const session = await requireSession(staffReq);
    assert.equal(session.tenantId, "tenant-test-1");
  });
});
