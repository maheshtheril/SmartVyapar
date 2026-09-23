import React from "react";
import Link from "next/link";
import { Building2, ArrowLeft, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-xl bg-slate-950 p-1 flex items-center justify-center shadow-md shadow-indigo-500/20 overflow-hidden border border-slate-800 shrink-0">
              <img src="/ziona.png" alt="Ziona POS" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg text-slate-900">
              Ziona <span className="text-indigo-600">POS</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center space-x-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="border-b border-slate-200 pb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Statutory Compliance & Terms
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Terms and Conditions</h1>
          <p className="text-xs text-slate-500 mt-1">Last Updated: September 19, 2026</p>
        </div>

        <div className="prose prose-sm prose-slate max-w-none space-y-6 text-xs leading-relaxed text-slate-600">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing, or using <strong>Ziona POS</strong> (&ldquo;Service&rdquo;), you agree to be bound by these Terms and Conditions. If you are entering into this agreement on behalf of a company or legal business entity, you represent that you have the authority to bind such entity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">2. Description of Service</h2>
            <p>
              Ziona POS (a product of ZaayaSoft &bull; zaayasoft.com) provides a cloud-based multi-tenant Software-as-a-Service (SaaS) platform for Indian Goods and Services Tax (GST) invoicing, point-of-sale billing, inventory control, thermal printing, and statutory reporting.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">3. User Accounts & Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and are fully responsible for all activities that occur under your account. You agree to immediately notify Ziona POS of any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">4. Subscription Plans & Payments</h2>
            <p>
              Ziona POS offers a <strong>Starter Free</strong> tier (up to 100 invoices/month) and a <strong>Ziona POS Pro</strong> tier (₹499/month or ₹4,999/year). Payments for paid subscriptions are processed securely via our payment gateway partner, <strong>Razorpay</strong>. All fees are in Indian Rupees (INR) and are subject to applicable GST.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">5. Statutory GST Compliance Disclaimer</h2>
            <p>
              While Ziona POS incorporates calculation logic adhering to Indian GST Rules (Intra-state CGST+SGST, Inter-state IGST, Rule 53 Credit Notes, and Rule 138 E-Way Bills), the merchant remains solely responsible for the accuracy of their tax rates, HSN codes, and filings on the GSTN portal.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">6. Governing Law & Jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">7. Contact Information</h2>
            <p>
              For legal inquiries or questions regarding these terms, please contact:
              <br />
              <strong>Email:</strong> support@smartvyapar.app | maheshtheril25@gmail.com
              <br />
              <strong>Phone:</strong> +91 6238 539510
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-x-4">
        <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
        <span>•</span>
        <Link href="/refund-policy" className="hover:text-indigo-600">Cancellation & Refund Policy</Link>
        <span>•</span>
        <Link href="/contact" className="hover:text-indigo-600">Contact Us</Link>
        <span>•</span>
        <Link href="/pricing" className="hover:text-indigo-600">Pricing</Link>
      </footer>
    </div>
  );
}
