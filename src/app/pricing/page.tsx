import React from "react";
import Link from "next/link";
import { Check, CheckCircle2, ArrowLeft, Zap, Sparkles } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">
              ZP
            </div>
            <span className="font-extrabold text-lg text-slate-900">
              Ziona <span className="text-indigo-600">POS</span>
            </span>
          </Link>
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-600 hover:text-indigo-600"
            >
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

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/50">
            Simple, Transparent Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Plans that grow with your business
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Zero hidden charges. No credit card required to start on our Free tier. Upgrade to Pro anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Starter Free */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Starter Free</h3>
                <p className="text-xs text-slate-500 mt-1">Ideal for small independent retail shops & start-ups</p>
              </div>

              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-extrabold text-slate-900">₹0</span>
                <span className="text-xs text-slate-500">/ forever</span>
              </div>

              <hr className="border-slate-100" />

              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center space-x-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Up to 100 GST Invoices per month</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>POS Thermal & A4 Invoice Printing</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Customer Khata (Credit Ledger)</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Basic Inventory & Low Stock Alerts</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>1 Staff / Owner User Account</span>
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 text-center block transition"
            >
              Get Started Free
            </Link>
          </div>

          {/* Ziona POS Pro */}
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
                  For growing businesses needing AI automation, team scale & compliance
                </p>
              </div>

              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-extrabold text-indigo-600">₹499</span>
                <span className="text-xs text-slate-500">/ month (or ₹4,999/year - Save 17%)</span>
              </div>

              <hr className="border-slate-100" />

              <ul className="space-y-3 text-xs text-slate-700 font-medium">
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span><strong>Unlimited</strong> GST Invoices & Bills</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span><strong>Unlimited</strong> Multi-User Team & Roles</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>AI Purchase Bill Scanner (Gemini OCR)</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Government NIC E-Way Bill JSON Bulk Generator</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>RFC 4180 Excel / CSV Bulk Inventory Import Engine</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Print Studio: 7 Color Palettes, Logos & Fonts</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>MCA Electronic Audit Trail Logs</span>
                </li>
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
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-3">
        <div className="space-x-4">
          <Link href="/terms" className="hover:text-indigo-600">Terms & Conditions</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
          <span>•</span>
          <Link href="/refund-policy" className="hover:text-indigo-600">Cancellation & Refund Policy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-indigo-600">Contact Us</Link>
        </div>
        <p className="text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} Ziona POS. Payments securely processed by Razorpay.
        </p>
      </footer>
    </div>
  );
}
