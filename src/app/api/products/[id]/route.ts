import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();

    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id, tenantId }
    });

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        category: body.category,
        productType: body.productType,
        sku: body.sku,
        barcode: body.barcode,
        hsnCode: body.hsnCode,
        baseUnit: body.baseUnit,
        hasAltUnit: body.hasAltUnit,
        altUnit: body.altUnit,
        conversionFactor: body.conversionFactor ? Number(body.conversionFactor) : null,
        purchasePrice: body.purchasePrice ? Number(body.purchasePrice) : 0,
        purchasePricePerAlt: body.purchasePricePerAlt ? Number(body.purchasePricePerAlt) : null,
        sellingPrice: body.sellingPrice ? Number(body.sellingPrice) : 0,
        sellingPricePerAlt: body.sellingPricePerAlt ? Number(body.sellingPricePerAlt) : null,
        mrp: body.mrp ? Number(body.mrp) : null,
        gstRate: body.gstRate ? Number(body.gstRate) : 0,
        minStockAlert: body.minStockAlert ? Number(body.minStockAlert) : 5,
        hasBatchTracking: body.hasBatchTracking || false,
        imageUrl: body.imageUrl,
        partNumber: body.partNumber,
        oemNumber: body.oemNumber,
        compatibleMakes: body.compatibleMakes,
        compatibleModels: body.compatibleModels,
      }
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id, tenantId }
    });

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    // Check if it's used in any invoices or purchase bills
    const invoiceItemCount = await prisma.invoiceItem.count({ where: { productId: params.id } });
    const purchaseItemCount = await prisma.purchaseBillItem.count({ where: { productId: params.id } });

    if (invoiceItemCount > 0 || purchaseItemCount > 0) {
      return NextResponse.json({ success: false, error: "Cannot delete product because it has associated sales or purchases." }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
