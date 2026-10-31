import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/electronics/lookup?imei=356938114920180
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    const imei = searchParams.get("imei")?.trim();

    if (!imei) {
      return NextResponse.json({ error: "IMEI or Serial Number is required" }, { status: 400 });
    }

    const device = await prisma.deviceUnit.findFirst({
      where: {
        tenantId,
        OR: [
          { imei1: { equals: imei, mode: "insensitive" } },
          { imei2: { equals: imei, mode: "insensitive" } },
          { serialNumber: { equals: imei, mode: "insensitive" } },
        ],
      },
      include: {
        product: true,
        invoiceItem: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json({
        found: false,
        message: `No device found matching IMEI / Serial '${imei}' in this tenant.`,
      });
    }

    // Warranty calculation
    let warrantyInfo = null;
    const soldDate = device.soldAt || device.invoiceItem?.invoice?.invoiceDate;

    if (soldDate) {
      const saleTime = new Date(soldDate).getTime();
      const months = device.warrantyMonths || 12;
      const expiryDate = new Date(saleTime);
      expiryDate.setMonth(expiryDate.getMonth() + months);

      const now = new Date().getTime();
      const diffMs = expiryDate.getTime() - now;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isUnderWarranty = daysRemaining > 0;

      warrantyInfo = {
        soldDate: soldDate.toISOString(),
        warrantyMonths: months,
        expiryDate: expiryDate.toISOString(),
        isUnderWarranty,
        daysRemaining: isUnderWarranty ? daysRemaining : 0,
        daysExpired: isUnderWarranty ? 0 : Math.abs(daysRemaining),
        customerName: device.invoiceItem?.invoice?.customerName,
        customerPhone: device.invoiceItem?.invoice?.customerPhone,
        invoiceNumber: device.invoiceItem?.invoice?.invoiceNumber,
      };
    }

    return NextResponse.json({
      found: true,
      device: {
        id: device.id,
        imei1: device.imei1,
        imei2: device.imei2,
        serialNumber: device.serialNumber,
        color: device.color,
        status: device.status,
        warrantyMonths: device.warrantyMonths,
        inwardDate: device.createdAt,
        product: {
          id: device.product.id,
          name: device.product.name,
          sku: device.product.sku,
          brand: device.product.brand,
          category: device.product.category,
          mrp: device.product.mrp,
          sellingPrice: device.product.sellingPrice,
        },
        warranty: warrantyInfo,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/electronics/lookup:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
