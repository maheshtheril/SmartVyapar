import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  restaurantEventBus,
  RestaurantEventPayload,
} from "../src/lib/restaurant-events";

describe("Real-Time KDS & Restaurant Event Bus Engine", () => {
  test("should deliver real-time events to subscribed tenant channel", (t, done) => {
    const testTenantId = "tenant-restaurant-alpha-1";
    const testTableId = "table-04";

    const unsubscribe = restaurantEventBus.subscribeTenant(
      testTenantId,
      (event: RestaurantEventPayload) => {
        assert.equal(event.type, "kot.created");
        assert.equal(event.tenantId, testTenantId);
        assert.equal(event.tableId, testTableId);
        assert.equal(event.kotNumber, "KOT-0042");
        unsubscribe();
        done();
      }
    );

    // Emit event
    restaurantEventBus.emitTenantEvent({
      type: "kot.created",
      tenantId: testTenantId,
      tableId: testTableId,
      kotNumber: "KOT-0042",
      status: "PREPARING",
      timestamp: new Date().toISOString(),
    });
  });

  test("should enforce strict tenant isolation (no cross-tenant leakage)", (t, done) => {
    const tenantA = "tenant-isolated-A";
    const tenantB = "tenant-isolated-B";
    let tenantBReceived = false;

    const unsubB = restaurantEventBus.subscribeTenant(
      tenantB,
      () => {
        tenantBReceived = true;
      }
    );

    const unsubA = restaurantEventBus.subscribeTenant(
      tenantA,
      (event) => {
        assert.equal(event.tenantId, tenantA);
        // Wait a short tick to confirm tenantB did not receive it
        setTimeout(() => {
          assert.equal(tenantBReceived, false, "Tenant B must never receive Tenant A events");
          unsubA();
          unsubB();
          done();
        }, 30);
      }
    );

    // Emit event specifically for Tenant A
    restaurantEventBus.emitTenantEvent({
      type: "qr.order_received",
      tenantId: tenantA,
      tableId: "t-1",
      tableName: "Table 1",
      timestamp: new Date().toISOString(),
    });
  });

  test("should cleanly stop receiving events after unsubscription", (t, done) => {
    const tenantId = "tenant-unsub-test";
    let count = 0;

    const unsubscribe = restaurantEventBus.subscribeTenant(tenantId, () => {
      count++;
    });

    // 1st emission -> received
    restaurantEventBus.emitTenantEvent({
      type: "table.updated",
      tenantId,
      timestamp: new Date().toISOString(),
    });

    assert.equal(count, 1);

    // Unsubscribe
    unsubscribe();

    // 2nd emission -> should NOT be received
    restaurantEventBus.emitTenantEvent({
      type: "table.updated",
      tenantId,
      timestamp: new Date().toISOString(),
    });

    assert.equal(count, 1, "Unsubscribed listener should not receive further events");
    done();
  });
});
