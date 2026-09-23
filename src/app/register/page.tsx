'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  QrCode, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { INDIAN_STATES, getStateFromGstin } from '@/lib/schemas/register';

export default function RegisterPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("32");
  const [stateName, setStateName] = useState("Kerala");
  const [detectedState, setDetectedState] = useState<string | null>(null);

  const [upiId, setUpiId] = useState("");
  const [address, setAddress] = useState("");
  const [isComposition, setIsComposition] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect state code and state name when GSTIN is entered
  useEffect(() => {
    if (gstin && gstin.trim().length >= 2) {
      const detected = getStateFromGstin(gstin);
      if (detected) {
        setStateCode(detected.stateCode);
        setStateName(detected.stateName);
        setDetectedState(`${detected.stateName} (Code ${detected.stateCode})`);
        return;
      }
    }
    setDetectedState(null);
  }, [gstin]);

  // Suggest UPI ID when phone or business name changes if UPI is empty
  const handleSuggestUpi = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      setUpiId(`${cleanPhone.slice(-10)}@upi`);
    } else if (businessName.trim()) {
      const slug = businessName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      setUpiId(`${slug}@okaxis`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        stateCode,
        stateName,
        upiId: upiId.trim(),
        address: address.trim() || undefined,
        isComposition,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.details && Array.isArray(data.details)) {
          throw new Error(data.details.map((i: any) => `${i.field}: ${i.message}`).join(" | "));
        }
        if (data.message) {
          throw new Error(data.message);
        }
        if (data.issues && Array.isArray(data.issues)) {
          throw new Error(data.issues.map((i: any) => i.message).join(", "));
        }
        throw new Error(data.error || "Failed to complete registration");
      }

      // Successful registration sets cookie automatically, push to dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 mb-3">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Register Your Business on Ziona <span className="text-indigo-600">POS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Indian GST ERP & Billing • by ZaayaSoft
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Business Details */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>1. Business & GST Identity</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business / Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Electricals & Hardware"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      GSTIN (Optional for Unregistered)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 32AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                    {detectedState && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>State: {detectedState}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      State / Jurisdiction *
                    </label>
                    <select
                      value={stateCode}
                      onChange={(e) => {
                        setStateCode(e.target.value);
                        setStateName(INDIAN_STATES[e.target.value] || "Other");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    >
                      {Object.entries(INDIAN_STATES).map(([code, name]) => (
                        <option key={code} value={code}>
                          {code} - {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isComposition}
                    onChange={(e) => setIsComposition(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-600">
                    We operate under GST Composition Scheme (Bill of Supply, no tax charged)
                  </span>
                </label>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Step 2: Payment Details */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                <span>2. Dynamic UPI QR Settings</span>
              </h2>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    UPI VPA for Customer Payments *
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestUpi}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Auto-Suggest</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. apexstore@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Used to generate Bharat dynamic payment QR codes on print receipts.
                </p>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Step 3: Owner Account Credentials */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>3. Owner Login Credentials</span>
              </h2>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Owner Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      10-Digit Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Login Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="owner@yourstore.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password (min 6 characters) *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-9 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store / Office Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop #4, Commercial Complex, MG Road"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Registering & Setting Up Workspace...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Complete Registration & Launch ERP</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Already have an account */}
          <div className="text-center pt-5 mt-5 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-800">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Compliance Footer Links */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-[11px] text-slate-400">
            Ziona POS • A Product of{" "}
            <a href="https://zaayasoft.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-indigo-600 font-medium underline">
              ZaayaSoft
            </a>
          </p>
          <div className="flex items-center justify-center space-x-3 text-[10px] text-slate-400">
            <Link href="/terms" className="hover:text-indigo-600 underline">Terms</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-indigo-600 underline">Privacy</Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-indigo-600 underline">Refund Policy</Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-indigo-600 underline">Contact Us</Link>
            <span>•</span>
            <Link href="/pricing" className="hover:text-indigo-600 underline">Pricing</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
