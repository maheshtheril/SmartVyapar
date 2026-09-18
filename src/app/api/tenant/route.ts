import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/tenant - Fetch live tenant profile, dynamic menus, and live alert badges
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Live Badges: Count low stock products
    const lowStockCount = await prisma.product.count({
      where: {
        tenantId,
        currentStock: { lte: prisma.product.fields.minStockAlert },
      },
    });

    // Live Badges: Count unpaid/partial invoices
    const unpaidInvoicesCount = await prisma.invoice.count({
      where: {
        tenantId,
        paymentStatus: { in: ["UNPAID", "PARTIAL"] },
      },
    });

    // Dynamic Navigation items based on tenant configuration
    const navItems = [
      { id: "dashboard", name: "Dashboard", href: "/", icon: "LayoutDashboard" },
      { id: "pos", name: "Create Bill (POS)", href: "/billing/new", icon: "PlusCircle", highlight: true },
      { 
        id: "invoices", 
        name: "Invoices & Ledger", 
        href: "/invoices", 
        icon: "FileText",
        badge: unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount} Due` : undefined,
        badgeColor: "amber"
      },
      { 
        id: "inventory", 
        name: "Stock & Inventory", 
        href: "/inventory", 
        icon: "Package",
        badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
        badgeColor: "rose"
      },
      { id: "barcode", name: "Barcode Labels", href: "/inventory/barcode-generator", icon: "Tag" },
      { id: "variants", name: "Variant Matrix", href: "/inventory/variants", icon: "Grid" },
      { id: "batches", name: "Batches & Expiry", href: "/inventory/batches", icon: "Boxes" },
      { id: "recipes", name: "Recipes (BOM)", href: "/inventory/recipes", icon: "ChefHat" },
      { id: "restaurant", name: "Restaurant & KOT", href: "/restaurant", icon: "UtensilsCrossed" },
      { id: "customers", name: "Customers", href: "/customers", icon: "Users" },
      { id: "coa", name: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: "BookOpen" },
      { id: "scanner", name: "AI Purchase Scanner", href: "/scanner", icon: "Camera", aiTag: "Gemini" },
    ];

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.businessName,
        legalName: tenant.legalName,
        gstin: tenant.gstin,
        stateCode: tenant.stateCode,
        stateName: tenant.stateName,
        subscriptionTier: tenant.subscriptionTier,
        currency: tenant.currency,
      },
      user: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
      badges: {
        lowStockCount,
        unpaidInvoicesCount,
      },
      navItems,
    });
  } catch (error: any) {
    console.error("Error in /api/tenant:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
