import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { restaurantEventBus, RestaurantEventPayload } from "@/lib/restaurant-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    let unsubscribe: (() => void) | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // 1. Initial connection ACK event
        const initData = `event: connected\ndata: ${JSON.stringify({
          tenantId,
          timestamp: new Date().toISOString(),
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initData));

        // 2. Subscribe to tenant events
        unsubscribe = restaurantEventBus.subscribeTenant(
          tenantId,
          (event: RestaurantEventPayload) => {
            try {
              const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(new TextEncoder().encode(chunk));
            } catch (err) {
              console.error("Error enqueuing SSE chunk:", err);
            }
          }
        );

        // 3. Heartbeat comment every 15s to keep proxy / cloudflare connections alive
        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(": ping\n\n"));
          } catch {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
          }
        }, 15000);
      },
      cancel() {
        if (unsubscribe) unsubscribe();
        if (heartbeatTimer) clearInterval(heartbeatTimer);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to initialize event stream" },
      { status: 500 }
    );
  }
}
