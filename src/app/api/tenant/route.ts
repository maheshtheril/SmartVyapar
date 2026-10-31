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
      customersCount,
      nearExpiryCount,
      pendingLabSamplesCount
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
      prisma.batch.count({
        where: {
          tenantId,
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          currentStock: { gt: 0 },
        },
      }),
      prisma.labOrder.count({
        where: {
          tenantId,
          status: { in: ["SAMPLE_PENDING", "SAMPLE_COLLECTED", "IN_TESTING"] },
        },
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
          { 
            id: "customer-display", 
            name: "Customer Pole Display", 
            href: "/display", 
            icon: "Tv",
            badge: "Dual Screen",
            badgeColor: "indigo"
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
            id: "price-lists", name: "Price Lists", href: "/inventory/price-lists", icon: "Tag", badge: "New", badgeColor: "emerald" }, { id: "delivery-challans", 
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
          ...(tenant.businessType === "RESTAURANT"
            ? [{ 
                id: "recipes", 
                name: "Recipes & BOM Depletion", 
                href: "/inventory/recipes", 
                icon: "ChefHat" 
              }]
            : []),
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
              id: "field-sales", 
              name: "Field Sales App (Mobile)", 
              href: "/field-sales", 
              icon: "Smartphone",
              badge: "New",
              badgeColor: "emerald"
            },
            ...(tenant.enableTerritory || tenant.businessType === "DISTRIBUTION"
              ? [{
                  id: "territories-master", 
                  name: "Territories Master (FMCG)", 
                  href: "/territories", 
                  icon: "Map" 
                }]
              : []),
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

    // Industry-Specific Module: Show Garage & Service at TOP PRIORITY for AUTOMOBILE
    if (tenant.businessType === "AUTOMOBILE") {
      menuTree.unshift({
        id: "garage",
        name: "Garage & Automobile Workshop",
        icon: "Wrench",
        badge: "Live Fleet",
        badgeColor: "indigo",
        children: [
          {
            id: "job-cards",
            name: "Active Job Cards & Repairs",
            href: "/garage",
            icon: "ClipboardCheck",
            highlight: true,
          },
          {
            id: "new-job-card",
            name: "+ New Vehicle Inward",
            href: "/garage/new",
            icon: "PlusCircle",
          },
        ]
      });
    }

    // Industry-Specific Module: Show Salon, Spa & Wellness at TOP PRIORITY for SALON_SPA
    if (tenant.businessType === "SALON_SPA") {
      menuTree.unshift({
        id: "salon",
        name: "Salon, Spa & Wellness",
        icon: "Scissors",
        badge: "Live Chairs",
        badgeColor: "emerald",
        children: [
          {
            id: "salon-appointments",
            name: "Appointments & Chair Slots",
            href: "/salon/appointments",
            icon: "Calendar",
            badge: "Live Chairs",
            badgeColor: "emerald",
            highlight: true,
          },
          {
            id: "salon-booking-portal",
            name: "Public Booking Portal",
            href: `/book/${tenant.slug}`,
            icon: "Sparkles",
            badge: "Online QR",
            badgeColor: "indigo",
          },
          {
            id: "salon-services",
            name: "Salon Services & Rates",
            href: "/inventory",
            icon: "Tag",
          },
        ],
      });
    }

    // Industry-Specific Module: Show Food & Restaurant at TOP PRIORITY for RESTAURANT
    if (tenant.businessType === "RESTAURANT") {
      menuTree.unshift({
        id: "restaurant",
        name: "Food & Restaurant",
        icon: "UtensilsCrossed",
        badge: occupiedTablesCount > 0 ? `${occupiedTablesCount} Busy` : "Tables",
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
          {
            id: "reservations",
            name: "Reservations & Waitlist",
            href: "/restaurant/reservations",
            icon: "Calendar",
          },
          ...(userRole === "OWNER" || userRole === "MANAGER"
            ? [{
                id: "fnb-report",
                name: "Daily F&B Sales Report",
                href: "/restaurant/report",
                icon: "Calculator",
                badge: "Daily",
                badgeColor: "emerald" as const,
              }]
            : []),
        ],
      });
    }

    // Industry-Specific Module: Show Diagnostic Lab & LIMS at TOP PRIORITY for DIAGNOSTIC_LAB
    if (tenant.businessType === "DIAGNOSTIC_LAB") {
      menuTree.unshift({
        id: "laboratory",
        name: "Diagnostic Lab & LIMS",
        icon: "FlaskConical",
        badge: pendingLabSamplesCount > 0 ? `${pendingLabSamplesCount} Pending` : "Live",
        badgeColor: "rose",
        children: [
          {
            id: "lab-dashboard",
            name: "Lab Command Center",
            href: "/lab",
            icon: "LayoutDashboard",
            highlight: true,
          },
          {
            id: "lab-queue",
            name: "Phlebotomy & Sample Queue",
            href: "/lab/queue",
            icon: "Clock",
            badge: pendingLabSamplesCount > 0 ? `${pendingLabSamplesCount}` : undefined,
            badgeColor: "rose",
          },
          {
            id: "lab-results",
            name: "Result Entry & Worklist",
            href: "/lab/results",
            icon: "FileCheck",
            highlight: true,
          },
          {
            id: "lab-tests",
            name: "Test Catalog & Normal Ranges",
            href: "/lab/tests",
            icon: "Tag",
          },
          {
            id: "lab-doctors",
            name: "Referring Clinicians",
            href: "/lab/doctors",
            icon: "Users",
          },
        ],
      });
    }

    // Industry-Specific Module: Show Textiles & Apparel at TOP PRIORITY for APPAREL
    if (tenant.businessType === "APPAREL") {
      menuTree.unshift({
        id: "apparel",
        name: "Textiles & Apparel",
        icon: "Scissors",
        badge: "Size-Color",
        badgeColor: "indigo",
        children: [
          {
            id: "apparel-command",
            name: "Apparel Command Center",
            href: "/apparel",
            icon: "LayoutDashboard",
            highlight: true,
          },
          {
            id: "apparel-matrix",
            name: "2D Size × Color Matrix",
            href: "/apparel",
            icon: "Grid",
          },
          {
            id: "apparel-fabrics",
            name: "Fabric Cuts & Rolls (Meters)",
            href: "/apparel",
            icon: "Scissors",
          },
          {
            id: "apparel-pos",
            name: "Fast Fashion POS",
            href: "/pos",
            icon: "Receipt",
          },
        ],
      });
    }

    // Industry-Specific Module: Show Mobiles & Electronics at TOP PRIORITY for ELECTRONICS
    if (tenant.businessType === "ELECTRONICS") {
      menuTree.unshift({
        id: "electronics",
        name: "Mobiles & Electronics",
        icon: "Smartphone",
        badge: "Dual-IMEI",
        badgeColor: "indigo",
        children: [
          {
            id: "elec-command",
            name: "Electronics Command Center",
            href: "/electronics",
            icon: "LayoutDashboard",
            highlight: true,
          },
          {
            id: "elec-serials",
            name: "15-Digit IMEI & Serial Registry",
            href: "/electronics",
            icon: "Barcode",
          },
          {
            id: "elec-tradein",
            name: "Old Phone Trade-In & Buyback",
            href: "/electronics",
            icon: "ArrowLeftRight",
          },
          {
            id: "elec-pos",
            name: "Fast Serial POS Dispatch",
            href: "/pos",
            icon: "Receipt",
          },
        ],
      });
    }

    // Industry-Specific Module: Only show Pharmacy & Healthcare for PHARMACY businesses
    if (tenant.businessType === "PHARMACY") {
      menuTree.splice(2, 0, {
        id: "pharmacy",
        name: "Pharmacy & Rx",
        icon: "ShieldCheck",
        badge: nearExpiryCount > 0 ? `${nearExpiryCount} Expiring` : undefined,
        badgeColor: "rose",
        children: [
          {
            id: "schedule-h-register",
            name: "Schedule H & H1 Drug Register",
            href: "/pharmacy/register",
            icon: "FileCheck",
            badge: "Govt Rule",
            badgeColor: "indigo",
          },
          {
            id: "near-expiry-monitor",
            name: "Near-Expiry Return Monitor",
            href: "/pharmacy/expiry",
            icon: "Clock",
            badge: nearExpiryCount > 0 ? `${nearExpiryCount}` : undefined,
            badgeColor: "rose",
          },
          {
            id: "doctors-master",
            name: "Prescribing Doctors Directory",
            href: "/pharmacy/doctors",
            icon: "Users",
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
        pharmacyDrugLicense20B: tenant.pharmacyDrugLicense20B || "",
        pharmacyDrugLicense21B: tenant.pharmacyDrugLicense21B || "",
        labAccreditationNo: tenant.labAccreditationNo || "",
        labPathologistName: tenant.labPathologistName || "",
        labPathologistRegNo: tenant.labPathologistRegNo || "",
        labPathologistDegree: tenant.labPathologistDegree || "",
        labPathologistSignatureUrl: tenant.labPathologistSignatureUrl || "",
        isComposition: tenant.isComposition,
        allowNegativeStock: tenant.allowNegativeStock,
        taxInclusiveMode: tenant.taxInclusiveMode,
        enforceCreditLimit: tenant.enforceCreditLimit,
        financialYearStartMonth: tenant.financialYearStartMonth,
        autoRoundOff: tenant.autoRoundOff,
        subscriptionTier: tenant.subscriptionTier,
        restaurantPlan: tenant.restaurantPlan || "NONE",
        planExpiresAt: tenant.planExpiresAt,
        planBillingCycle: tenant.planBillingCycle,
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
        nearExpiryCount,
        pendingLabSamplesCount,
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
      pharmacyDrugLicense20B,
      pharmacyDrugLicense21B,
      labAccreditationNo,
      labPathologistName,
      labPathologistRegNo,
      labPathologistDegree,
      labPathologistSignatureUrl,
      phone,
      email,
      address,
      pincode,
      upiId,
      gstin,
      restaurantPlan,
      isComposition,
      allowNegativeStock,
      taxInclusiveMode,
      enforceCreditLimit,
      financialYearStartMonth,
      autoRoundOff,
    } = body;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(businessName !== undefined ? { businessName: businessName.trim() } : {}),
        ...(legalName !== undefined ? { legalName: legalName ? legalName.trim() : null } : {}),
        ...(logoUrl !== undefined ? { logoUrl: logoUrl ? logoUrl.trim() : null } : {}),
        ...(businessType !== undefined ? { businessType } : {}),
        ...(pharmacyDrugLicense20B !== undefined ? { pharmacyDrugLicense20B: pharmacyDrugLicense20B ? pharmacyDrugLicense20B.trim() : null } : {}),
        ...(pharmacyDrugLicense21B !== undefined ? { pharmacyDrugLicense21B: pharmacyDrugLicense21B ? pharmacyDrugLicense21B.trim() : null } : {}),
        ...(labAccreditationNo !== undefined ? { labAccreditationNo: labAccreditationNo ? labAccreditationNo.trim() : null } : {}),
        ...(labPathologistName !== undefined ? { labPathologistName: labPathologistName ? labPathologistName.trim() : null } : {}),
        ...(labPathologistRegNo !== undefined ? { labPathologistRegNo: labPathologistRegNo ? labPathologistRegNo.trim() : null } : {}),
        ...(labPathologistDegree !== undefined ? { labPathologistDegree: labPathologistDegree ? labPathologistDegree.trim() : null } : {}),
        ...(labPathologistSignatureUrl !== undefined ? { labPathologistSignatureUrl: labPathologistSignatureUrl ? labPathologistSignatureUrl.trim() : null } : {}),
        ...(businessType === "DISTRIBUTION" ? { enableTerritory: true } : {}),
        ...(restaurantPlan !== undefined ? { restaurantPlan } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(email !== undefined ? { email: email ? email.trim() : null } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
        ...(pincode !== undefined ? { pincode: pincode ? pincode.trim() : null } : {}),
        ...(upiId !== undefined ? { upiId: upiId.trim() } : {}),
        ...(gstin !== undefined ? { gstin: gstin ? gstin.trim().toUpperCase() : null } : {}),
        ...(isComposition !== undefined ? { isComposition: !!isComposition } : {}),
        ...(allowNegativeStock !== undefined ? { allowNegativeStock: !!allowNegativeStock } : {}),
        ...(taxInclusiveMode !== undefined ? { taxInclusiveMode: !!taxInclusiveMode } : {}),
        ...(enforceCreditLimit !== undefined ? { enforceCreditLimit: !!enforceCreditLimit } : {}),
        ...(financialYearStartMonth !== undefined ? { financialYearStartMonth: parseInt(financialYearStartMonth) } : {}),
        ...(autoRoundOff !== undefined ? { autoRoundOff: !!autoRoundOff } : {}),
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









