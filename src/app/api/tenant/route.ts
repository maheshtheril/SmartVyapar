import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface NavChildNode {
  id: string;
  name: string;
  href: string;
  icon: string;
  badge?: string;
  badgeColor?: "amber" | "rose" | "emerald" | "indigo";
  aiTag?: string;
  highlight?: boolean;
}

export interface NavTreeGroup {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  badgeColor?: "amber" | "rose" | "emerald" | "indigo";
  children: NavChildNode[];
}

// GET /api/tenant - Fetch live tenant profile, dynamic hierarchical tree menus, and live alert badges
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const userRole = session.role; // OWNER, MANAGER, STAFF

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Dynamic Live Database Queries for Badges
    const [
      lowStockCount,
      unpaidInvoicesCount,
      creditNotesCount,
      occupiedTablesCount,
      customersCount
    ] = await Promise.all([
      prisma.product.count({
        where: {
          tenantId,
          currentStock: { lte: prisma.product.fields.minStockAlert },
        },
      }),
      prisma.invoice.count({
        where: {
          tenantId,
          paymentStatus: { in: ["UNPAID", "PARTIAL"] },
        },
      }),
      prisma.creditNote.count({
        where: { tenantId },
      }),
      prisma.restaurantTable.count({
        where: {
          tenantId,
          status: "OCCUPIED",
        },
      }),
      prisma.customer.count({
        where: { tenantId },
      }),
    ]);

    // Construct Dynamic Hierarchical Tree based on Database state & User Role
    const menuTree: NavTreeGroup[] = [
      {
        id: "billing",
        name: "Sales & Billing",
        icon: "Receipt",
        badge: unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount} Due` : undefined,
        badgeColor: "amber",
        children: [
          { 
            id: "pos", 
            name: "Create Bill (POS)", 
            href: "/billing/new", 
            icon: "PlusCircle", 
            highlight: true 
          },
          { 
            id: "invoices", 
            name: "Tax Invoices & Ledger", 
            href: "/invoices", 
            icon: "FileText",
            badge: unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount}` : undefined,
            badgeColor: "amber"
          },
          { 
            id: "credit-notes", 
            name: "Credit Notes & Returns", 
            href: "/invoices", 
            icon: "RotateCcw",
            badge: creditNotesCount > 0 ? `${creditNotesCount}` : undefined,
            badgeColor: "indigo"
          },
          { 
            id: "eway-bills", 
            name: "E-Way Bills (Rule 138)", 
            href: "/invoices", 
            icon: "Truck" 
          },
          { 
            id: "gstr1-export", 
            name: "GSTR-1 Portal JSON", 
            href: "/invoices", 
            icon: "FileCode" 
          },
        ],
      },
      {
        id: "inventory",
        name: "Inventory & Catalog",
        icon: "Package",
        badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
        badgeColor: "rose",
        children: [
          { 
            id: "stock", 
            name: "Product Catalog & Stock", 
            href: "/inventory", 
            icon: "Package",
            badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
            badgeColor: "rose"
          },
          { 
            id: "barcode", 
            name: "Barcode Labels (EAN/Code128)", 
            href: "/inventory/barcode-generator", 
            icon: "Tag" 
          },
          { 
            id: "variants", 
            name: "Variant Matrix (Size/Color)", 
            href: "/inventory/variants", 
            icon: "Grid" 
          },
          { 
            id: "batches", 
            name: "Batches & Expiry (FIFO)", 
            href: "/inventory/batches", 
            icon: "Boxes" 
          },
          { 
            id: "recipes", 
            name: "Recipes & BOM Depletion", 
            href: "/inventory/recipes", 
            icon: "ChefHat" 
          },
        ],
      },
      {
        id: "restaurant",
        name: "Food & Restaurant",
        icon: "UtensilsCrossed",
        badge: occupiedTablesCount > 0 ? `${occupiedTablesCount} Busy` : undefined,
        badgeColor: "amber",
        children: [
          { 
            id: "tables", 
            name: "Dining Tables & Status", 
            href: "/restaurant", 
            icon: "Layers",
            badge: occupiedTablesCount > 0 ? `${occupiedTablesCount}` : undefined,
            badgeColor: "amber"
          },
          { 
            id: "kot", 
            name: "Kitchen Order Tickets (KOT)", 
            href: "/restaurant", 
            icon: "ChefHat" 
          },
        ],
      },
      {
        id: "parties",
        name: "Parties & Khata",
        icon: "Users",
        badge: customersCount > 0 ? `${customersCount}` : undefined,
        badgeColor: "indigo",
        children: [
          { 
            id: "customers", 
            name: "Customer Directory & Balance", 
            href: "/customers", 
            icon: "Users" 
          },
        ],
      },
    ];

    // RBAC Security: Only OWNER and MANAGER can view Accounting & Statutory Ledgers
    if (userRole === "OWNER" || userRole === "MANAGER") {
      menuTree.push({
        id: "accounting",
        name: "Accounting & GST",
        icon: "BookOpen",
        children: [
          { 
            id: "coa", 
            name: "Chart of Accounts", 
            href: "/accounting/chart-of-accounts", 
            icon: "Landmark" 
          },
        ],
      });
    }

    // AI Tools (Available to all authenticated merchants)
    menuTree.push({
      id: "ai",
      name: "AI Smart Tools",
      icon: "Sparkles",
      children: [
        { 
          id: "scanner", 
          name: "AI Purchase Bill Scanner", 
          href: "/scanner", 
          icon: "Camera", 
          aiTag: "Gemini Vision" 
        },
      ],
    });

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
        creditNotesCount,
        occupiedTablesCount,
        customersCount,
      },
      menuTree,
    });
  } catch (error: any) {
    console.error("Error in /api/tenant:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
