import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { GstCalculator } from "@/lib/gst";
import { UpiService } from "@/lib/upi";

export async function POST(req: NextRequest) {
  try {
    await requireSession(req);

    const body = await req.json();
    const {
      businessStateCode,
      customerStateCode,
      taxableAmount,
      gstRate,
      upiId,
      payeeName,
      invoiceNumber,
      customerName,
    } = body;

    // 1. Calculate GST breakdown
    const tax = GstCalculator.calculate(
      Number(taxableAmount),
      Number(gstRate || 18),
      businessStateCode || "32",
      customerStateCode || "32"
    );

    // 2. Generate UPI URI & QR Code
    const upiUri = UpiService.generateUpiUri({
      upiId: upiId || "zionabusiness@icici",
      payeeName: payeeName || "Ziona Tech",
      amount: tax.totalAmount,
      invoiceNumber: invoiceNumber || "INV-001",
      note: `Bill for ${customerName || "Customer"}`,
    });

    const qrDataUrl = await UpiService.generateQrDataUrl(upiUri);

    return NextResponse.json({
      success: true,
      tax,
      upiUri,
      qrDataUrl,
    });
  } catch (error: any) {
    console.error("Error in /api/quick-bill:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process bill" },
      { status: 500 }
    );
  }
}
