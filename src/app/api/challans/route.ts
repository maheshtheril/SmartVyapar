import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { GstCalculator } from "@/lib/gst";

export const dynamic = "force-dynamic";

// GET /api/challans - List all delivery challans for tenant
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const status = searchParams.get("status") || "ALL";

    const challans = await prisma.deliveryChallan.findMany({
      where: {
        tenantId,
        ...(status !== "ALL" ? { status } : {}),
        ...(query
          ? {
              OR: [
                { challanNumber: { contains: query, mode: "insensitive" } },
                { recipientName: { contains: query, mode: "insensitive" } },
                { vehicleNo: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        items: true,
      },
      orderBy: { challanDate: "desc" },
      take: 100,
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessName: true, gstin: true, stateCode: true, phone: true, address: true },
    });

    const totalChallans = challans.length;
    const openChallans = challans.filter((c) => c.status === "DISPATCHED").length;
    const convertedChallans = challans.filter((c) => c.status === "CONVERTED_TO_INVOICE").length;

    return NextResponse.json({
      success: true,
      challans,
      metrics: {
        totalChallans,
        openChallans,
        convertedChallans,
      },
      tenant,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching Delivery Challans:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch challans" }, { status: 500 });
  }
}

// POST /api/challans - Create a new statutory Delivery Challan (Rule 55)
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      purpose = "SUPPLY_ON_APPROVAL",
      recipientName,
      recipientPhone,
      recipientAddress,
      recipientGstin,
      recipientStateCode = "32",
      placeOfSupply,
      transporterName,
      vehicleNo,
      notes,
      items,
    } = body;

    if (!recipientName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "recipientName and at least one item are required" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Auto-generate serial sequence DC-YYYY-XXXX
    const now = new Date();
    const year = now.getFullYear();
    const count = await prisma.deliveryChallan.count({ where: { tenantId } });
    const challanNumber = `DC-${year}-${String(count + 1).padStart(4, "0")}`;

    const isInterState = recipientStateCode !== tenant.stateCode;

    // Calculate line totals & taxes
    let subtotal = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const preparedItems = items.map((item: any) => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      const gstRate = Number(item.gstRate || 18);
      const lineTaxable = qty * price;
      subtotal += lineTaxable;

      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (isInterState) {
        lineIgst = (lineTaxable * gstRate) / 100;
        igstAmount += lineIgst;
      } else {
        lineCgst = (lineTaxable * (gstRate / 2)) / 100;
        lineSgst = (lineTaxable * (gstRate / 2)) / 100;
        cgstAmount += lineCgst;
        sgstAmount += lineSgst;
      }

      const lineTotal = lineTaxable + lineCgst + lineSgst + lineIgst;

      return {
        productId: item.productId || null,
        productName: item.productName || "Goods",
        hsnCode: item.hsnCode || "9983",
        unit: item.unit || "PCS",
        quantity: qty,
        unitPrice: price,
        gstRate,
        cgstAmount: lineCgst,
        sgstAmount: lineSgst,
        igstAmount: lineIgst,
        lineTotal,
      };
    });

    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const totalAmount = subtotal + totalTax;

    const createdChallan = await prisma.deliveryChallan.create({
      data: {
        tenantId,
        challanNumber,
        purpose,
        recipientName,
        recipientPhone,
        recipientAddress,
        recipientGstin: recipientGstin?.trim().toUpperCase() || null,
        recipientStateCode,
        isInterState,
        placeOfSupply: placeOfSupply || recipientAddress || "Site / Warehouse",
        transporterName,
        vehicleNo: vehicleNo?.replace(/[\s\-_]/g, "").toUpperCase() || null,
        notes,
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        totalAmount,
        status: "DISPATCHED",
        items: {
          create: preparedItems,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Delivery Challan ${challanNumber} issued successfully`,
      challan: createdChallan,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Delivery Challan Creation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create Delivery Challan" }, { status: 500 });
  }
}
