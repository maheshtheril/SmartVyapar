import React from "react";
import Link from "next/link";
import { Check, CheckCircle2, Zap, Sparkles, X, Crown } from "lucide-react";

// ─── Feature lists ────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "Up to 100 GST Invoices / month",
  "POS Thermal & A4 Invoice Printing",
  "Dynamic UPI QR on every bill",
  "Customer Khata (Credit Ledger)",
  "Basic Inventory & Low Stock Alerts",
  "1 Owner User Account",
];

const PRO_FEATURES = [
  "Unlimited GST Invoices & Bills",
  "Unlimited Multi-User Team & Roles",
  "AI Purchase Bill Scanner (Gemini Vision OCR)",
  "E-Way Bill JSON Generator (NIC Rule 138)",
  "GSTR-1 Portal Return Export",
  "GSTR-2B ITC Matcher & GSTR-3B Assistant",
  "CSV Bulk Inventory Import",
  "Print Studio: Logos, Colors & Fonts",
  "MCA Electronic Audit Trail Logs",
  "Multi-Warehouse Stock Transfers",
  "Customer Loyalty Points Engine",
];

const INDUSTRY_PRO_EXTRAS: Record<string, string[]> = {
  RETAIL: [
    "Barcode Label Generator (EAN / Code 128)",
    "Batch & Expiry Tracking (FIFO)",
    "Price Lists & Customer-Specific Pricing",
    "Delivery Challans (GST Rule 55)",
  ],
  APPAREL: [
    "Size-Color-Fit Grid Matrix (S/M/L/XL x Colors)",
    "Parent-Child Barcode Label Generator",
    "Fabric Running Meter vs Readymade Cut Deductions",
    "Seasonal Fashion Collections & Brand Masters",
    "Tailoring Measurements & Alteration Notes",
  ],
  ELECTRONICS: [
    "Dual IMEI & Serial Number Tracking (Purchase to Sale)",
    "15-Digit IMEI Barcode Scanner with Instant Warranty Lookup",
    "Brand Consumer Finance / EMI Schemes (Bajaj/Pine Labs)",
    "Old Device Trade-In / Exchange Valuation Vouchers",
    "Extended Warranty & Service AMC Tracker",
  ],
  SALON_SPA: [
    "Stylist & Therapist Commission Splitting Rules",
    "Client Appointment Booking & Multi-Chair Calendar",
    "Prepaid Wellness Packages & Wallet Deductions",
    "Backbar Consumables Auto-Depletion per Service",
    "Customer Service History & Preferred Stylist Notes",
  ],
  DISTRIBUTION: [
    "Region → Zone → Territory → Beat Hierarchy",
    "Field Sales Mobile App",
    "Delivery Challans (GST Rule 55)",
    "Vendor Payables & Aging Reports",
    "Sales Orders & Proforma Invoices",
  ],
  AUTOMOBILE: [
    "Vehicle Job Cards (Full Workshop Flow)",
    "Labour Services Rate Card",
    "Service Reminder Notifications (SMS/WhatsApp)",
    "Spare Parts Inventory with OEM & Part Numbers",
    "Customer Vehicle History Log",
  ],
  SERVICES: [
    "Service Invoices & Quotations",
    "Sales Orders & Proforma",
    "Customer Outstanding & Dunning",
    "Professional PDF Invoice Templates",
  ],
  PHARMACY: [
    "Schedule H & H1 Statutory Drug Dispensing Register",
    "Prescribing Doctors Master with Reg No auto-complete",
    "Near-Expiry Loss Prevention Monitor (30/60/90 Days)",
    "Strip-to-Tablet Loose Unit Selling & Fractional Deductions",
    "State Drug License Forms 20B & 21B on Invoices",
  ],
  RESTAURANT: [
    "Dining Tables & Visual Floor Plan",
    "Kitchen Order Tickets (KOT) — Thermal Print",
    "Basic Ingredient Backflushing",
    "Cash Drawer Shift & Z-Report",
  ],
};

const RESTAURANT_PRO_FEATURES = [
  "Everything in Pro (₹499) +",
  "Multi-Section Floor Plan (Main Hall, AC, Rooftop, Bar)",
  "Multi-Printer KOT Routing (Kitchen Printer + Bar Printer)",
  "Advanced Recipe BOM with Waste % & Portion Control",
  "Live Table Occupancy TV Dashboard",
  "Combo Offers & Happy Hour Pricing Rules",
  "Customer Feedback QR on Receipts",
  "Reservation & Waitlist Management",
];

const RESTAURANT_CHAIN_FEATURES = [
  "Everything in Restaurant Pro (₹799) +",
  "Central Menu Management (push to all outlets)",
  "Per-Outlet Independent P&L & Sales Reports",
  "Kitchen Display System (KDS) — Tablet Mode",
  "Zomato / Swiggy / ONDC API Integration",
  "Cross-Outlet Customer Loyalty Program",
  "Employee Scheduling & Shift Management",
  "Dedicated Account Manager & Priority Support",
];

// ─── Industry tabs ────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { id: "RETAIL",       label: "Retail & POS",         emoji: "🛒" },
  { id: "APPAREL",      label: "Textiles & Apparel",   emoji: "👗" },
  { id: "ELECTRONICS",  label: "Electronics & Mobiles",emoji: "📱" },
  { id: "PHARMACY",     label: "Pharmacy & Medical",   emoji: "💊" },
  { id: "RESTAURANT",   label: "Restaurant & F&B",     emoji: "🍽️" },
  { id: "SALON_SPA",    label: "Salon, Spa & Wellness",emoji: "💇" },
  { id: "DISTRIBUTION", label: "FMCG & Distribution",  emoji: "🚚" },
  { id: "AUTOMOBILE",   label: "Automobile & Garage",  emoji: "🚗" },
  { id: "SERVICES",     label: "Services & Billing",   emoji: "💼" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureRow({ text, included = true }: { text: string; included?: boolean }) {
  return (
    <li className="flex items-start space-x-2.5">
      {included ? (
        <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
      ) : (
        <X className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
      )}
      <span className={included ? "text-xs text-slate-700 font-medium" : "text-xs text-slate-400"}>
        {text}
      </span>
    </li>
  );
}

function CheckRow({ text }: { text: string }) {
  return (
    <li className="flex items-start space-x-2.5">
      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
      <span className="text-xs text-slate-600">{text}</span>
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage({
  searchParams,
}: {
  searchParams?: { industry?: string };
}) {
  const activeIndustry = (searchParams?.industry || "RETAIL").toUpperCase();
  const isRestaurant = activeIndustry === "RESTAURANT";
  const extras = INDUSTRY_PRO_EXTRAS[activeIndustry] || INDUSTRY_PRO_EXTRAS.RETAIL;
  const activeLabel = INDUSTRIES.find((i) => i.id === activeIndustry);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-xl bg-slate-950 p-1 flex items-center justify-center shadow-md shadow-indigo-500/20 overflow-hidden border border-slate-800 shrink-0">
              <img src="/ziona.png" alt="Ziona POS" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg text-slate-900">
              Ziona <span className="text-indigo-600">POS</span>
            </span>
          </Link>
          <div className="flex items-center space-x-3">
            <Link href="/login" className="text-xs font-bold text-slate-600 hover:text-indigo-600">
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/50">
            Simple, Transparent Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Plans that grow with your business
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Zero hidden charges. No credit card required to start on Free. Upgrade anytime.
          </p>
        </div>

        {/* Industry Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {INDUSTRIES.map((ind) => {
            const isActive = activeIndustry === ind.id;
            return (
              <Link
                key={ind.id}
                href={`/pricing?industry=${ind.id}`}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full border text-xs font-bold transition ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <span>{ind.emoji}</span>
                <span>{ind.label}</span>
              </Link>
            );
          })}
        </div>

        {/* ── Non-Restaurant: 2-column ── */}
        {!isRestaurant && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* FREE */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Starter Free</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    For small businesses and solo operators just getting started
                  </p>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-extrabold text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500">/ forever</span>
                </div>
                <hr className="border-slate-100" />
                <ul className="space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <CheckRow key={f} text={f} />
                  ))}
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 text-center block transition"
              >
                Get Started Free
              </Link>
            </div>

            {/* PRO */}
            <div className="bg-white rounded-3xl border-2 border-indigo-600 p-8 shadow-lg relative flex flex-col justify-between space-y-6">
              <div className="absolute -top-3 right-8 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold uppercase px-3.5 py-1 rounded-full shadow flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>Recommended</span>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>Ziona POS Pro</span>
                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    For growing businesses needing AI, team scale & compliance
                  </p>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-extrabold text-indigo-600">₹499</span>
                  <span className="text-xs text-slate-500">
                    / month &nbsp;·&nbsp; ₹4,999/year{" "}
                    <span className="text-emerald-600 font-bold">Save 17%</span>
                  </span>
                </div>
                <hr className="border-slate-100" />
                <ul className="space-y-3">
                  {PRO_FEATURES.map((f) => (
                    <FeatureRow key={f} text={f} />
                  ))}
                  {extras.length > 0 && (
                    <>
                      <li className="pt-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
                          {activeLabel?.emoji} {activeLabel?.label} extras
                        </span>
                      </li>
                      {extras.map((f) => (
                        <FeatureRow key={f} text={f} />
                      ))}
                    </>
                  )}
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md hover:bg-indigo-700 text-center block transition"
              >
                Start Free Trial & Upgrade to Pro
              </Link>
            </div>
          </div>
        )}

        {/* ── Restaurant: 3-column ── */}
        {isRestaurant && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FREE Restaurant */}
            <div className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div>
                  <div className="text-2xl mb-1">🍵</div>
                  <h3 className="text-base font-bold text-slate-900">Nano / Starter Free</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tea stall, takeaway counter, home cloud kitchen
                  </p>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-extrabold text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500">/ forever</span>
                </div>
                <hr className="border-slate-100" />
                <ul className="space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <CheckRow key={f} text={f} />
                  ))}
                  <CheckRow text="Dining Tables & KOT (up to 10 tables)" />
                  <CheckRow text="Basic Ingredient Backflushing" />
                  <CheckRow text="Cash Drawer Z-Report" />
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 text-center block transition"
              >
                Get Started Free
              </Link>
            </div>

            {/* RESTAURANT PRO */}
            <div className="bg-white rounded-3xl border-2 border-indigo-600 p-7 shadow-lg relative flex flex-col justify-between space-y-5">
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>Most Popular</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl mb-1">🍽️</div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>Restaurant Pro</span>
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Small–mid dine-in restaurant, café, dhaba, QSR
                  </p>
                </div>
                <div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-indigo-600">₹799</span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    ₹7,999/year — Save 17%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ziona POS Pro (₹499) + Restaurant add-on (₹300)
                  </p>
                </div>
                <hr className="border-slate-100" />
                <ul className="space-y-2.5">
                  {RESTAURANT_PRO_FEATURES.map((f) => (
                    <FeatureRow key={f} text={f} />
                  ))}
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md hover:bg-indigo-700 text-center block transition"
              >
                Start Free Trial → Restaurant Pro
              </Link>
            </div>

            {/* RESTAURANT CHAIN */}
            <div className="bg-white rounded-3xl border border-amber-300 p-7 shadow-sm relative flex flex-col justify-between space-y-5">
              <div className="absolute -top-3 right-6 bg-amber-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow flex items-center space-x-1">
                <Crown className="h-3 w-3" />
                <span>Enterprise</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl mb-1">🏨</div>
                  <h3 className="text-base font-bold text-slate-900">Restaurant Chain</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Multi-outlet group, hotel F&B, cloud kitchen platform
                  </p>
                </div>
                <div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-amber-600">₹2,499</span>
                    <span className="text-xs text-slate-500">/ outlet / month</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    ₹24,999/outlet/year — Save 17%
                  </p>
                </div>
                <hr className="border-slate-100" />
                <ul className="space-y-2.5">
                  {RESTAURANT_CHAIN_FEATURES.map((f) => (
                    <FeatureRow key={f} text={f} />
                  ))}
                </ul>
              </div>
              <Link
                href="/contact"
                className="w-full py-2.5 rounded-xl border-2 border-amber-400 text-xs font-bold text-amber-700 hover:bg-amber-50 text-center block transition"
              >
                Contact Sales for Chain Onboarding
              </Link>
            </div>
          </div>
        )}

        {/* Bottom note */}
        <p className="text-center text-xs text-slate-400 pb-4">
          All plans include GST-compliant invoicing, dynamic UPI QR payments, and data export.
          {isRestaurant &&
            " Restaurant Free includes up to 10 tables and basic KOT printing."}
        </p>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-3">
        <div className="space-x-4">
          <Link href="/terms" className="hover:text-indigo-600">
            Terms & Conditions
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-indigo-600">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/refund-policy" className="hover:text-indigo-600">
            Cancellation & Refund Policy
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-indigo-600">
            Contact Us
          </Link>
        </div>
        <p className="text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} Ziona POS • A Product of{" "}
          <a
            href="https://zaayasoft.com"
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 hover:text-indigo-600 font-medium underline"
          >
            ZaayaSoft
          </a>
          . Payments securely processed by Razorpay.
        </p>
      </footer>
    </div>
  );
}
