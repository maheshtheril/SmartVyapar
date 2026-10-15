import { EventEmitter } from "events";

export type RestaurantEventType =
  | "kot.created"
  | "kot.status_changed"
  | "kot.item_voided"
  | "table.updated"
  | "qr.order_received";

export interface RestaurantEventPayload {
  type: RestaurantEventType;
  tenantId: string;
  tableId?: string;
  tableName?: string;
  kotId?: string;
  kotNumber?: string;
  status?: string;
  timestamp: string;
  data?: any;
}

class RestaurantEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow large numbers of concurrent KDS and waiter display listeners
    this.setMaxListeners(200);
  }

  emitTenantEvent(payload: RestaurantEventPayload) {
    // Channel name scoped to tenant: "restaurant:<tenantId>"
    this.emit(`restaurant:${payload.tenantId}`, payload);
  }

  subscribeTenant(
    tenantId: string,
    callback: (event: RestaurantEventPayload) => void
  ): () => void {
    const channel = `restaurant:${tenantId}`;
    this.on(channel, callback);
    return () => {
      this.off(channel, callback);
    };
  }
}

// Global singleton across hot reloads in development and production
declare global {
  var __restaurantEventBus: RestaurantEventBus | undefined;
}

export const restaurantEventBus =
  global.__restaurantEventBus || (global.__restaurantEventBus = new RestaurantEventBus());
