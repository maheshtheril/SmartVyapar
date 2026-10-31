"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface DemoAccount {
  id: string;
  name: string;
  industry: string;
  email: string;
  password: string;
  icon: string;
  tagline: string;
}

const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  lab: {
    id: "lab",
    name: "Apex Diagnostics & Molecular Pathology",
    industry: "Clinical Diagnostic Lab & LIMS",
    email: "lab.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "🧪",
    tagline: "Phlebotomy Accession Queue, Vacutainer Barcodes, NABL Formats & QR Reports",
  },
  retail: {
    id: "retail",
    name: "SmartBazaar Retail Supermarket",
    industry: "Retail & Supermarket",
    email: "retail.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "🛒",
    tagline: "AI Bill OCR Scan, Scale EAN-13, Dual Pole Display & Cash Drawer Float",
  },
  restaurant: {
    id: "restaurant",
    name: "The Spice Route Kitchen & Cafe",
    industry: "Restaurant, Cafe & Bakery",
    email: "restaurant.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "🍽️",
    tagline: "QR Table Dine-In, Split Kitchen KOTs & Recipe BOM Stock Depletion",
  },
  garage: {
    id: "garage",
    name: "Apex Pro Motors & Garage",
    industry: "Automobile & Garage Workshop",
    email: "garage.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "🔧",
    tagline: "Vehicle Master, Digital Job Cards, SAC Labour + Spares & Gate Pass",
  },
  pharma: {
    id: "pharma",
    name: "CarePlus Pharmacy & Healthcare",
    industry: "Pharmacy & Healthcare",
    email: "pharma.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "💊",
    tagline: "Batch Near-Expiry Alerts (30/60/90d), Schedule H/H1 Register & 20B/21B",
  },
  distribution: {
    id: "distribution",
    name: "Horizon FMCG & Wholesale Distributors",
    industry: "Wholesale & FMCG Distribution",
    email: "distribution.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "📦",
    tagline: "Inter-Depot Transfers, Dual Units (PCS/BOX), Tiered Rates & Khata Ledger",
  },
  services: {
    id: "services",
    name: "Nexora Tech & Engineering Services",
    industry: "Professional Services & AMC",
    email: "services.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "💼",
    tagline: "SAC 9983 Billing, Milestone AMC Retainers & Inter-State IGST Engine",
  },
  apparel: {
    id: "apparel",
    name: "Vogue & Velvet Textiles & Apparel",
    industry: "Textiles & Garment Retail",
    email: "apparel.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "👗",
    tagline: "2D Size-Color Matrix, Parent-Child Barcode Tags & Fabric Meter Cuts",
  },
  electronics: {
    id: "electronics",
    name: "ElectroPulse Digital & Mobiles",
    industry: "Electronics & Mobile Retail",
    email: "electronics.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "📱",
    tagline: "Dual 15-Digit IMEI Tracking, Instant Warranty Lookup & Brand EMI Schemes",
  },
  salon: {
    id: "salon",
    name: "Aura Luxury Salon, Spa & Wellness",
    industry: "Salon, Spa & Wellness",
    email: "salon.demo@zaayasoft.com",
    password: "ZionaPOS@2026",
    icon: "✂️",
    tagline: "Zero-Wait Public Booking, Smartphone PWA Standee QR & Stylist Commission",
  },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeDemoKey, setActiveDemoKey] = useState<string>("lab");
  const [showDemoSelector, setShowDemoSelector] = useState(false);

  // Initialize from URL param (e.g. ?demo=lab or ?vertical=lab)
  useEffect(() => {
    const demoParam =
      searchParams.get("demo") ||
      searchParams.get("vertical") ||
      searchParams.get("industry") ||
      "lab";

    const key = demoParam.toLowerCase();
    if (DEMO_ACCOUNTS[key]) {
      setActiveDemoKey(key);
      const acc = DEMO_ACCOUNTS[key];
      setEmail(acc.email);
      setPassword(acc.password);
    } else {
      setActiveDemoKey("lab");
      const acc = DEMO_ACCOUNTS["lab"];
      setEmail(acc.email);
      setPassword(acc.password);
    }
  }, [searchParams]);

  const currentDemo = DEMO_ACCOUNTS[activeDemoKey] || DEMO_ACCOUNTS["lab"];

  function handleSelectDemo(key: string) {
    setActiveDemoKey(key);
    setShowDemoSelector(false);
    const acc = DEMO_ACCOUNTS[key];
    setEmail(acc.email);
    setPassword(acc.password);
  }

  async function copyToClipboard(text: string, fieldName: "username" | "password") {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      // Also ensure field is synced to form
      if (fieldName === "username") {
        setEmail(text);
      } else {
        setPassword(text);
      }

      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2200);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  function handleAutoFill() {
    setEmail(currentDemo.email);
    setPassword(currentDemo.password);
    setCopiedField("autofill");
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please check credentials.");
        return;
      }

      // Redirect to industry-specific landing or requested page
      const from = searchParams.get("from");
      if (from) {
        router.push(from);
      } else if (
        activeDemoKey === "lab" || 
        data.user?.tenantSlug === "demo-lab" || 
        email.toLowerCase().includes("lab.")
      ) {
        router.push("/lab");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("Unable to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand Header */}
      <div className="text-center mb-5">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 p-1.5 shadow-xl shadow-indigo-500/20 mb-3 overflow-hidden border border-slate-800">
          <img src="/ziona.png" alt="Ziona POS" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Ziona <span className="text-indigo-600">POS</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Cloud ERP & Multi-Industry Billing Platform • by{" "}
          <a
            href="https://zaayasoft.com"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-700 hover:text-indigo-600 transition underline decoration-dotted"
          >
            ZaayaSoft
          </a>
        </p>
      </div>

      {/* DEMO CREDENTIALS INTERACTIVE HELPER CARD */}
      <div className="mb-4 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-emerald-50/60 p-4 shadow-sm backdrop-blur-sm transition">
        {/* Card Header & Industry Switcher */}
        <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
          <div className="flex items-center space-x-2">
            <span className="text-xl" role="img" aria-label="vertical icon">
              {currentDemo.icon}
            </span>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                  Live Demo
                </span>
                <span className="text-xs font-bold text-slate-900 line-clamp-1">
                  {currentDemo.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{currentDemo.industry}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDemoSelector((p) => !p)}
            className="flex items-center space-x-1 text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 px-2 py-1 rounded-lg shadow-2xs transition"
          >
            <span>Change</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showDemoSelector ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Dropdown Industry Selector */}
        {showDemoSelector && (
          <div className="mt-2.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-md space-y-1">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Vertical Demo Environment:
            </p>
            {Object.values(DEMO_ACCOUNTS).map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectDemo(acc.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                  activeDemoKey === acc.id
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center space-x-1.5 truncate">
                  <span>{acc.icon}</span>
                  <span className="truncate">{acc.name}</span>
                </span>
                <span className="text-[10px] opacity-75 shrink-0 ml-2">{acc.industry}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tagline / Key feature teaser */}
        <p className="text-[11px] text-slate-600 mt-2 mb-3 leading-relaxed">
          {currentDemo.tagline}
        </p>

        {/* Credentials Copy Buttons Box */}
        <div className="space-y-2 bg-white/80 rounded-xl p-2.5 border border-indigo-100/80">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Tap credential to copy &amp; fill:</span>
            {copiedField && (
              <span className="inline-flex items-center text-emerald-600 font-bold normal-case text-[11px] animate-pulse">
                <Check className="h-3 w-3 mr-1" />
                {copiedField === "autofill"
                  ? "Both credentials loaded!"
                  : `Copied ${copiedField}!`}
              </span>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Username / Email Copy Pill */}
            <button
              type="button"
              onClick={() => copyToClipboard(currentDemo.email, "username")}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition cursor-pointer ${
                copiedField === "username"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300"
              }`}
              title="Click to copy username"
            >
              <div className="truncate pr-1">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                  Username (Email)
                </span>
                <span className="block text-[11.5px] font-mono font-bold text-slate-800 truncate">
                  {currentDemo.email}
                </span>
              </div>
              <div className="shrink-0 p-1 rounded-md text-slate-500 group-hover:text-indigo-600">
                {copiedField === "username" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </div>
            </button>

            {/* Password Copy Pill */}
            <button
              type="button"
              onClick={() => copyToClipboard(currentDemo.password, "password")}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition cursor-pointer ${
                copiedField === "password"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300"
              }`}
              title="Click to copy password"
            >
              <div className="truncate pr-1">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                  Master Password
                </span>
                <span className="block text-[11.5px] font-mono font-bold text-emerald-700 truncate">
                  {currentDemo.password}
                </span>
              </div>
              <div className="shrink-0 p-1 rounded-md text-slate-500 group-hover:text-emerald-600">
                {copiedField === "password" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </div>
            </button>
          </div>

          {/* Quick Auto-fill Action Bar */}
          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAutoFill}
              className="inline-flex items-center text-[11px] font-bold text-indigo-700 hover:text-indigo-900 transition"
            >
              <Sparkles className="h-3 w-3 mr-1 text-indigo-500" />
              Pre-fill Login Form
            </button>

            <span className="text-[10px] text-slate-400 flex items-center">
              <ShieldCheck className="h-3 w-3 mr-0.5 text-emerald-600" />
              Role: OWNER (Full Quota)
            </span>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email / Username
              </label>
              {email && email === currentDemo.email && (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                  <Check className="h-2.5 w-2.5 mr-0.5" /> Demo Loaded
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lab.demo@zaayasoft.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                tabIndex={-1}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* Sign In Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Entering Demo Environment...</span>
              </>
            ) : (
              <span>Sign In to {currentDemo.name.split(" ")[0]} Demo</span>
            )}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Need a dedicated account?{" "}
            <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-800">
              Register business
            </Link>
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center mt-5 space-y-2">
        <p className="text-[11px] text-slate-400">
          ZionaPOS Cloud ERP • A Product of{" "}
          <a
            href="https://zaayasoft.com"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 hover:text-indigo-600 font-semibold underline"
          >
            ZaayaSoft
          </a>{" "}
          • Demo App:{" "}
          <span className="text-slate-600 font-medium">zionapos.store</span>
        </p>
        <div className="flex items-center justify-center space-x-3 text-[10px] text-slate-400">
          <Link href="/terms" className="hover:text-indigo-600 underline">
            Terms
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-indigo-600 underline">
            Privacy
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-indigo-600 underline">
            Contact
          </Link>
          <span>•</span>
          <Link href="/pricing" className="hover:text-indigo-600 underline">
            Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Loading demo environment...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
