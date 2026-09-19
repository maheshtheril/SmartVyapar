import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { generateCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, businessName: true },
    });

    const headers = [
      { key: "name", label: "Product Name" },
      { key: "sku", label: "SKU / Item Code" },
      { key: "barcode", label: "Barcode" },
      { key: "category", label: "Category" },
      { key: "hsnCode", label: "HSN / SAC Code" },
      { key: "baseUnit", label: "Base Unit" },
      { key: "purchasePrice", label: "Purchase Price (₹)" },
      { key: "sellingPrice", label: "Selling Price (₹)" },
      { key: "mrp", label: "MRP (₹)" },
      { key: "gstRate", label: "GST Rate (%)" },
      { key: "currentStock", label: "Current Stock" },
      { key: "minStockAlert", label: "Min Stock Alert" },
    ];

    const rows = products.map((p) => ({
      name: p.name,
      sku: p.sku || "",
      barcode: p.barcode || "",
      category: p.category,
      hsnCode: p.hsnCode,
      baseUnit: p.baseUnit,
      purchasePrice: Number(p.purchasePrice),
      sellingPrice: Number(p.sellingPrice),
      mrp: Number(p.mrp),
      gstRate: Number(p.gstRate),
      currentStock: Number(p.currentStock),
      minStockAlert: Number(p.minStockAlert),
    }));

    const csvContent = generateCsv(headers, rows);
    const filename = `inventory_${tenant?.slug || "catalog"}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error exporting inventory CSV:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
