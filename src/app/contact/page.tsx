import React from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, ArrowLeft, Clock } from "lucide-react";

export default function ContactPage() {
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
            <Phone className="h-4 w-4" /> Help & Customer Support
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Contact Us</h1>
          <p className="text-xs text-slate-500 mt-1">
            We are here to assist you with onboarding, billing queries, and technical support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Direct Support Channels</h2>

            <div className="space-y-4 text-xs">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone / WhatsApp</span>
                  <a href="tel:+916238539510" className="font-bold text-slate-800 hover:text-indigo-600">
                    +91 6238 539510
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Support Email</span>
                  <a href="mailto:support@zaayasoft.com" className="font-bold text-slate-800 hover:text-indigo-600">
                    support@zaayasoft.com
                  </a>
                  <span className="text-slate-400 block text-[10px]">maheshtheril25@gmail.com</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Working Hours</span>
                  <span className="font-bold text-slate-800">Monday to Saturday: 9:00 AM – 7:00 PM IST</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Operating Address & Entity</h2>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Entity Information</span>
                  <p className="font-bold text-slate-800">ZaayaSoft (zaayasoft.com)</p>
                  <p className="text-indigo-600 font-semibold text-[11px]">Parent Entity for Ziona POS &amp; Ziona HMS</p>
                  <p className="text-slate-600 mt-1">
                    Operated by: Mahesh Theril
                    <br />
                    Kerala, India • PIN: 682001
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] text-slate-400">
                  For statutory grievances or legal notices, contact our Grievance Officer at <code>maheshtheril25@gmail.com</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-x-4">
        <Link href="/terms" className="hover:text-indigo-600">Terms & Conditions</Link>
        <span>•</span>
        <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
        <span>•</span>
        <Link href="/refund-policy" className="hover:text-indigo-600">Cancellation & Refund Policy</Link>
        <span>•</span>
        <Link href="/pricing" className="hover:text-indigo-600">Pricing</Link>
      </footer>
    </div>
  );
}
