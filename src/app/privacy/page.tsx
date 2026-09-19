import React from "react";
import Link from "next/link";
import { Lock, ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">
              SV
            </div>
            <span className="font-extrabold text-lg text-slate-900">
              Smart<span className="text-indigo-600">Vyapar</span>
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
            <Lock className="h-4 w-4" /> Data Protection & Privacy
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Privacy Policy</h1>
          <p className="text-xs text-slate-500 mt-1">Last Updated: September 19, 2026</p>
        </div>

        <div className="prose prose-sm prose-slate max-w-none space-y-6 text-xs leading-relaxed text-slate-600">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">1. Overview & Commitment</h2>
            <p>
              SmartVyapar (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) respects your privacy and is committed to protecting your personal and business data in compliance with the Digital Personal Data Protection Act, 2023 (DPDPA) and Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">2. Information We Collect</h2>
            <p>
              We collect information necessary to deliver our GST invoicing and ERP services:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account & Business Identity:</strong> Trade name, Legal Name, GSTIN, registered business address, state code, contact phone number, and email.</li>
              <li><strong>Financial Data:</strong> Bank UPI VPA for dynamic QR code generation. Note: Card numbers and bank passwords are never stored on our servers; payments are processed securely by Razorpay.</li>
              <li><strong>Operational Data:</strong> Inventory SKUs, sale invoices, purchase records, and customer khata ledgers.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">3. How We Use Your Data</h2>
            <p>
              Your data is strictly utilized to generate compliant GST invoices, compute statutory tax liabilities, maintain MCA audit trails, and manage your account. We <strong>never sell, rent, or trade</strong> your business or customer records to any third parties or advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">4. Data Security & Storage</h2>
            <p>
              All data transmitted to and from SmartVyapar is encrypted in transit via Transport Layer Security (TLS 1.3 / SSL) and encrypted at rest with industry-standard cryptographic algorithms. Passwords are irreversibly hashed using bcrypt.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">5. Grievance Officer</h2>
            <p>
              In accordance with Information Technology Act 2000 and rules made thereunder:
              <br />
              <strong>Grievance Officer:</strong> Mahesh Theril
              <br />
              <strong>Email:</strong> maheshtheril25@gmail.com | support@smartvyapar.app
              <br />
              <strong>Contact:</strong> +91 6238 539510
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-x-4">
        <Link href="/terms" className="hover:text-indigo-600">Terms & Conditions</Link>
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
