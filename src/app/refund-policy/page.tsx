import React from "react";
import Link from "next/link";
import { RefreshCcw, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function RefundPolicyPage() {
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
            <RefreshCcw className="h-4 w-4" /> Transparency & Fair Terms
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
            Cancellation and Refund Policy
          </h1>
          <p className="text-xs text-slate-500 mt-1">Last Updated: September 19, 2026</p>
        </div>

        <div className="prose prose-sm prose-slate max-w-none space-y-6 text-xs leading-relaxed text-slate-600">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">1. SaaS Subscription Cancellation</h2>
            <p>
              Merchants can cancel their <strong>Ziona POS Pro</strong> subscription at any time directly through their account under <strong>Settings &rarr; Plans &amp; Billing</strong>, or by emailing our support team at <code>support@smartvyapar.app</code>.
            </p>
            <p>
              Upon cancellation, your subscription remains fully active until the end of your prepaid billing period (monthly or annual). You will not be billed for subsequent renewal cycles.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">2. 7-Day Money-Back Guarantee</h2>
            <p>
              We believe in the value Ziona POS brings to your retail business. If you are unsatisfied with Ziona POS Pro for any reason, you are entitled to a <strong>100% full refund within 7 days</strong> of your initial Pro subscription purchase.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">3. Refund Processing Timeline</h2>
            <p>
              Approved refund requests are submitted to our payment processor (<strong>Razorpay</strong>) within 24 business hours. The funds are credited back to your original payment method (Bank Account, UPI, or Debit/Credit Card) within <strong>5 to 7 business days</strong>, depending on your bank&apos;s settlement schedule.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">4. How to Request a Refund</h2>
            <p>
              To initiate a refund, please send an email to:
              <br />
              <strong>Email:</strong> support@smartvyapar.app or maheshtheril25@gmail.com
              <br />
              <strong>Subject:</strong> Refund Request - [Your Business Name]
              <br />
              Please include your registered email address, transaction/Order ID, and reason for refund.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-x-4">
        <Link href="/terms" className="hover:text-indigo-600">Terms & Conditions</Link>
        <span>•</span>
        <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
        <span>•</span>
        <Link href="/contact" className="hover:text-indigo-600">Contact Us</Link>
        <span>•</span>
        <Link href="/pricing" className="hover:text-indigo-600">Pricing</Link>
      </footer>
    </div>
  );
}
