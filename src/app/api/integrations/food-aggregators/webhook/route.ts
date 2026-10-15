import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { KotStatus, TableStatus } from "@prisma/client";
import { restaurantEventBus } from "@/lib/restaurant-events";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/food-aggregators/webhook
 * Ingests online delivery orders from Zomato, Swiggy, or UrbanPiper.
 * Automatically creates Kitchen Order Tickets (KOT) in the live kitchen queue.
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get("slug") || searchParams.get("tenant");
    
    // Authorization: Either pass ?tenantId=... or header x-tenant-id or resolve from slug
    let tenantId = searchParams.get("tenantId") || req.headers.get("x-tenant-id");

    if (!tenantId && tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      if (tenant) tenantId = tenant.id;
    }

    // If still not found, check cookie session for internal simulator testing
    if (!tenantId) {
      const { getSessionFromRequest } = await import("@/lib/auth");
      const session = await getSessionFromRequest(req);
      if (session) tenantId = session.tenantId;
    }

    if (!tenantId) {
      return NextResponse.json(
        { 
          error: "Missing tenant identifier. Provide ?tenantId=<id> or ?slug=<tenant-slug> in the webhook URL." 
        },
        { status: 400 }
      );
    }

    const payload = await req.json();

    // Standardize Payload format across Swiggy / Zomato / Custom Webhooks
    const channel: "ZOMATO" | "SWIGGY" | "DIRECT_ONLINE" = 
      payload.channel?.toUpperCase() === "SWIGGY" ? "SWIGGY" :
      payload.channel?.toUpperCase() === "ZOMATO" ? "ZOMATO" : "DIRECT_ONLINE";

    const externalOrderId = payload.orderId || payload.order_id || `ORD-${Date.now().toString().slice(-6)}`;
    const customerName = payload.customerName || payload.customer?.name || `${channel} Customer`;
    const customerPhone = payload.customerPhone || payload.customer?.phone || "9999999999";
    const rawItems: any[] = payload.items || payload.order_items || [];

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { error: "Order must contain a non-empty 'items' array." },
        { status: 400 }
      );
    }

    // 1. Locate or Auto-Create "Online Delivery" Table for this tenant
    const sectionName = `${channel} Orders`;
    const tableName = `${channel} Counter`;

    let onlineTable = await prisma.restaurantTable.findFirst({
      where: {
        tenantId,
        section: sectionName,
      },
    });

    if (!onlineTable) {
      // Find or create Takeaway / Online table
      onlineTable = await prisma.restaurantTable.create({
        data: {
          tenantId,
          name: tableName,
          section: sectionName,
          capacity: 99,
          status: TableStatus.VACANT,
        },
      });
    }

    // 2. Resolve items with database products or fallback to default
    const existingProducts = await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, name: true, sellingPrice: true },
    });

    const productMapByName = new Map(existingProducts.map((p) => [p.name.toLowerCase().trim(), p]));

    const processedItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }> = [];

    let totalAmount = 0;

    for (const item of rawItems) {
      const itemName = String(item.name || item.productName || "Special Dish").trim();
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || item.unitPrice || 0);

      // Match product if possible, otherwise use first available or placeholder
      const matched = productMapByName.get(itemName.toLowerCase()) || existingProducts[0];
      const productId = matched ? matched.id : existingProducts[0]?.id;

      if (!productId) {
        return NextResponse.json(
          { error: "No products exist for this restaurant. Please create menu products first." },
          { status: 400 }
        );
      }

      const itemTotal = price * qty;
      totalAmount += itemTotal;

      processedItems.push({
        productId,
        productName: itemName,
        quantity: qty,
        unitPrice: price > 0 ? price : Number(matched?.sellingPrice || 100),
        notes: item.instructions || item.notes || `[${channel}] Ref: #${externalOrderId}`,
      });
    }

    // 3. Generate Sequential KOT Number
    const kotCount = await prisma.kitchenOrderTicket.count({ where: { tenantId } });
    const kotNumber = `KOT-${(kotCount + 1).toString().padStart(4, "0")}`;

    // 4. Create KOT in atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const kot = await tx.kitchenOrderTicket.create({
        data: {
          tenantId,
          tableId: onlineTable!.id,
          kotNumber,
          guestCount: 1,
          waiterName: `[${channel}] #${externalOrderId}`,
          status: KotStatus.PREPARING,
          totalAmount,
          items: {
            create: processedItems.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              notes: i.notes || null,
            })),
          },
        },
        include: {
          items: true,
          table: true,
        },
      });

      // Update table to OCCUPIED
      await tx.restaurantTable.update({
        where: { id: onlineTable!.id },
        data: {
          status: TableStatus.OCCUPIED,
          occupiedAt: new Date(),
          assignedWaiter: `[${channel}] Online Order`,
          currentTotal: {
            increment: totalAmount,
          },
        },
      });

      return kot;
    }, DEFAULT_TX_OPTIONS);

    // Emit live kitchen event so KOT screen updates immediately
    try {
      restaurantEventBus.emitTenantEvent({
        type: "kot.created",
        tenantId,
        tableId: onlineTable!.id,
        tableName: onlineTable!.name,
        kotId: result.id,
        kotNumber: result.kotNumber,
        status: result.status,
        timestamp: new Date().toISOString(),
        data: result,
      });
    } catch (e) {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Order #${externalOrderId} from ${channel} successfully ingested into Kitchen queue`,
      kotNumber: result.kotNumber,
      orderId: externalOrderId,
      channel,
      status: "ACCEPTED",
      totalAmount,
      itemCount: processedItems.length,
    });
  } catch (error: any) {
    console.error("Error processing aggregator webhook:", error);
    return NextResponse.json({ error: error.message || "Failed to process webhook" }, { status: 500 });
  }
}

/**
 * GET /api/integrations/food-aggregators/webhook
 * Returns documentation and live test payload for developers & store owners.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const host = req.headers.get("host") || "www.zionapos.store";
  const protocol = host.includes("localhost") ? "http" : "https";

  return NextResponse.json({
    integration: "ZionaPOS Food Aggregator Webhook (Swiggy / Zomato / UrbanPiper)",
    webhookUrl: `${protocol}://${host}/api/integrations/food-aggregators/webhook?slug=<YOUR_BUSINESS_SLUG>`,
    supportedChannels: ["ZOMATO", "SWIGGY", "DIRECT_ONLINE"],
    examplePayload: {
      channel: "ZOMATO",
      orderId: "ZM-928174",
      customer: {
        name: "Rahul Sharma",
        phone: "9876543210",
        address: "Apartment 4B, Sky Towers, Kochi",
      },
      items: [
        {
          name: "Chicken Biryani (Full)",
          quantity: 2,
          price: 240,
          instructions: "Less spicy, extra raita",
        },
        {
          name: "Lime Mint Cooler",
          quantity: 1,
          price: 60,
        },
      ],
    },
    quickTestCurl: `curl -X POST "${protocol}://${host}/api/integrations/food-aggregators/webhook?slug=<YOUR_SLUG>" -H "Content-Type: application/json" -d '{"channel":"SWIGGY","orderId":"SW-1029","items":[{"name":"Chicken Biryani","quantity":1,"price":220}]}'`,
  });
}
