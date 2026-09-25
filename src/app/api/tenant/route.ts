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
  proTierOnly?: boolean;
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
            href: "/invoices/credit-notes", 
            icon: "RotateCcw",
            badge: creditNotesCount > 0 ? `${creditNotesCount}` : undefined,
            badgeColor: "indigo"
          },
          { 
            id: "eway-bills", 
            name: "E-Way Bills (Rule 138)", 
            href: "/invoices/eway-bills", 
            icon: "Truck",
            badge: "Dispatch",
            badgeColor: "emerald",
            proTierOnly: true,
          },
          { 
            id: "gstr1-export", 
            name: "GSTR-1 Portal Return", 
            href: "/gst/gstr-1", 
            icon: "FileCode",
            badge: "Filing",
            badgeColor: "indigo"
          },
          { 
            id: "cash-drawer", 
            name: "Cash Drawer & Z-Reports", 
            href: "/billing/shifts", 
            icon: "Wallet" 
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
            id: "delivery-challans", 
            name: "Delivery Challans (Rule 55)", 
            href: "/inventory/challans", 
            icon: "Truck",
            badge: "Rule 55",
            badgeColor: "indigo",
            proTierOnly: true,
          },
          { 
            id: "purchase-orders", 
            name: "Purchase Orders (PO)", 
            href: "/inventory/purchase/orders", 
            icon: "FileText",
            badge: "Procure",
            badgeColor: "indigo"
          },
          { 
            id: "purchase-inward", 
            name: "Purchase Bills & GRN", 
            href: "/inventory/purchase", 
            icon: "ClipboardCheck",
            badge: "Inward",
            badgeColor: "indigo",
            aiTag: "AI Vision"
          },
          { 
            id: "supplier-master", name: "Supplier Master", href: "/inventory/suppliers", icon: "Users" },
            {
              id: "vendor-payables", name: "Vendor Payables & Aging", href: "/inventory/payables", 
            icon: "CreditCard",
            badge: "Creditors",
            badgeColor: "amber"
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
          { 
            id: "transfers", 
            name: "Warehouses & Transfers", 
            href: "/inventory/transfers", 
            icon: "Truck",
            badge: "Multi-Store",
            badgeColor: "indigo",
            proTierOnly: true,
          },
        ],
      },
      {
        id: "parties",
        name: "Customers & Receivables",
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
          { 
            id: "customer-aging", 
            name: "Customer Aging & Dunning", 
            href: "/customers/aging", 
            icon: "Clock",
            badge: "Debtors",
            badgeColor: "amber"
          },
        ],
      },
    ];

    menuTree.push({
      id: "garage",
      name: "Garage & Service",
      icon: "Wrench",
      children: [
        {
          id: "job-cards",
          name: "Active Job Cards",
          href: "/garage",
          icon: "ClipboardCheck"
        }
      ]
    });

    // Industry-Specific Module: Only show Food & Restaurant for RESTAURANT businesses
    if (tenant.businessType === "RESTAURANT") {
      menuTree.splice(2, 0, {
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
      });
    }

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
          {
            id: "vouchers",
            name: "Accounting Vouchers (PV/RV/CV/JV)",
            href: "/accounting/vouchers",
            icon: "FileCheck",
            badge: "Double-Entry",
            badgeColor: "indigo"
          },
          {
            id: "financial-reports",
            name: "Financial Reports (P&L, Balance Sheet)",
            href: "/accounting/reports",
            icon: "Scale",
            badge: "Statements",
            badgeColor: "emerald"
          },
          {
            id: "bank-reconciliation",
            name: "Bank Reconciliation (BRS)",
            href: "/accounting/reconciliation",
            icon: "Landmark",
            badge: "Audit",
            badgeColor: "emerald"
          },
          {
            id: "gstr2b-itc-matcher",
            name: "GSTR-2B ITC Matcher (Rule 36(4))",
            href: "/accounting/reconciliation/gstr2b",
            icon: "ShieldCheck",
            badge: "ITC",
            badgeColor: "indigo",
            proTierOnly: true,
          },
          {
            id: "gstr3b-assistant",
            name: "GSTR-3B Return Assistant",
            href: "/gst/gstr-3b",
            icon: "Calculator",
            badge: "Monthly",
            badgeColor: "emerald",
            proTierOnly: true,
          },
        ],
      });
    }


    // Settings & Team Management (OWNER and MANAGER)
    if (userRole === "OWNER" || userRole === "MANAGER") {
      menuTree.push({
        id: "settings",
        name: "Settings & Team",
        icon: "Settings",
        children: [
          {
            id: "profile-logo",
            name: "Company Profile & Logo",
            href: "/settings",
            icon: "Building2",
          },
          {
            id: "plans-billing",
            name: "Plans & Billing (Razorpay)",
            href: "/settings?tab=billing",
            icon: "CreditCard",
            highlight: true,
            badge: "PRO",
            badgeColor: "indigo",
          },
          {
            id: "whatsapp-gateway",
            name: "WhatsApp & SMS Gateway",
            href: "/settings?tab=messaging",
            icon: "MessageSquare",
          },
          {
            id: "team-rbac",
            name: "Staff & Permissions",
            href: "/settings?tab=users",
            icon: "ShieldCheck",
          },
          {
            id: "print-studio",
            name: "Print Configuration Studio",
            href: "/settings/print",
            icon: "Printer",
          },
        ],
      });
    }

    // Role-Based Pruning for STAFF (Cashier / Mechanic / Waiter)
    // Simplify the UI by hiding complex ERP/Accounting functions
    if (userRole === "STAFF") {
      const billing = menuTree.find(m => m.id === "billing");
      if (billing) billing.children = billing.children.filter(c => ["pos", "invoices", "cash-drawer"].includes(c.id));
      
      const inventory = menuTree.find(m => m.id === "inventory");
      if (inventory) inventory.children = inventory.children.filter(c => ["stock", "barcode"].includes(c.id));

      const parties = menuTree.find(m => m.id === "parties");
      if (parties) parties.children = parties.children.filter(c => ["customers"].includes(c.id));
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.businessName,
        legalName: tenant.legalName,
        logoUrl: tenant.logoUrl,
        gstin: tenant.gstin,
        stateCode: tenant.stateCode,
        stateName: tenant.stateName,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        pincode: tenant.pincode,
        upiId: tenant.upiId,
        businessType: tenant.businessType || "RETAIL",
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
    console.error("Error in GET /api/tenant:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/tenant - Update Business Profile, Logo, GSTIN, and Bank Details
export async function PATCH(req: NextRequest) {
  try {
    const { requireRole, ForbiddenError, AuthError } = await import("@/lib/auth");
    const { recordAuditLog } = await import("@/lib/audit");
    const { AuditAction } = await import("@prisma/client");

    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      businessName,
      legalName,
      logoUrl,
      businessType,
      phone,
      email,
      address,
      pincode,
      upiId,
      gstin,
      isComposition,
    } = body;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(businessName !== undefined ? { businessName: businessName.trim() } : {}),
        ...(legalName !== undefined ? { legalName: legalName ? legalName.trim() : null } : {}),
        ...(logoUrl !== undefined ? { logoUrl: logoUrl ? logoUrl.trim() : null } : {}),
        ...(businessType !== undefined ? { businessType } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(email !== undefined ? { email: email ? email.trim() : null } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
        ...(pincode !== undefined ? { pincode: pincode ? pincode.trim() : null } : {}),
        ...(upiId !== undefined ? { upiId: upiId.trim() } : {}),
        ...(gstin !== undefined ? { gstin: gstin ? gstin.trim().toUpperCase() : null } : {}),
        ...(isComposition !== undefined ? { isComposition: !!isComposition } : {}),
      },
    });

    // Record statutory audit log for profile / tax setting changes
    await recordAuditLog({
      tenantId,
      userId: session.userId,
      userName: session.name,
      action: AuditAction.UPDATE,
      entityType: "TENANT_PROFILE",
      entityId: tenantId,
      details: {
        businessName: updated.businessName,
        logoUpdated: logoUrl !== undefined,
        gstin: updated.gstin,
        upiId: updated.upiId,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: updated,
      message: "Company profile updated successfully",
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
