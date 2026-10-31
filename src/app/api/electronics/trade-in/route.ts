import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/electronics/trade-in - Calculate valuation and generate voucher
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      brand = "Apple",
      modelName,
      storage = "128GB",
      customerName,
      customerPhone,
      hasDisplayScratch = false,
      hasDisplayCracks = false,
      hasBodyDents = false,
      isBatteryHealthy = true,
      hasBoxAndBill = true,
      hasWorkingBiometrics = true,
    } = body;

    if (!modelName) {
      return NextResponse.json({ error: "Model name is required" }, { status: 400 });
    }

    // Base valuation lookup table
    const baseValuationMap: Record<string, number> = {
      "iPhone 15 Pro": 65000,
      "iPhone 15": 48000,
      "iPhone 14 Pro": 52000,
      "iPhone 14": 38000,
      "iPhone 13 Pro": 42000,
      "iPhone 13": 31000,
      "iPhone 12": 22000,
      "iPhone 11": 15000,
      "Galaxy S23 Ultra": 54000,
      "Galaxy S23": 35000,
      "Galaxy S22 Ultra": 38000,
      "Galaxy S22": 26000,
      "OnePlus 12": 39000,
      "OnePlus 11": 27000,
      "Pixel 8 Pro": 44000,
      "Pixel 7": 24000,
    };

    let basePrice = baseValuationMap[modelName] || 25000;

    // Adjust for storage
    if (storage.includes("256")) basePrice += 3000;
    if (storage.includes("512")) basePrice += 6000;
    if (storage.includes("1TB")) basePrice += 10000;

    // Condition deductions & bonuses
    let deductions = 0;
    const breakdown: string[] = [];

    if (hasDisplayCracks) {
      deductions += Math.round(basePrice * 0.35);
      breakdown.push("-35% Display Glass Cracked / Broken");
    } else if (hasDisplayScratch) {
      deductions += Math.round(basePrice * 0.10);
      breakdown.push("-10% Minor Screen Scratches");
    }

    if (hasBodyDents) {
      deductions += Math.round(basePrice * 0.08);
      breakdown.push("-8% Body Dents or Scuffs");
    }

    if (!isBatteryHealthy) {
      deductions += 2500;
      breakdown.push("-₹2,500 Battery Health degraded (< 80%)");
    }

    if (!hasWorkingBiometrics) {
      deductions += Math.round(basePrice * 0.15);
      breakdown.push("-15% FaceID / TouchID Defective");
    }

    if (hasBoxAndBill) {
      basePrice += 1500;
      breakdown.push("+₹1,500 Original Box & Bill Present");
    }

    const estimatedCredit = Math.max(2000, Math.round(basePrice - deductions));

    // Generate Trade-in Voucher Code
    const voucherCode = `TRD-${new Date().toISOString().slice(2, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    return NextResponse.json({
      success: true,
      voucher: {
        code: voucherCode,
        brand,
        modelName,
        storage,
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || "N/A",
        estimatedCredit,
        breakdown,
        validityDays: 7,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/electronics/trade-in:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
