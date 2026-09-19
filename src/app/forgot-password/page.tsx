"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process request. Please try again.");
        return;
      }

      setSubmitted(true);
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch {
      setError("Network error. Please verify your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 mb-4">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Smart<span className="text-indigo-600">Vyapar</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Account Security & Password Recovery</p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          {!submitted ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Forgot your password?</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Enter the email address registered with your business. We&apos;ll send you a secure link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="merchant@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">Check your inbox</h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  If an account exists for <strong className="text-slate-800">{email}</strong>, we have dispatched a password reset link.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 text-[11px] font-medium">
                  <span>⏳ Link expires in 15 minutes</span>
                </div>
              </div>

              {/* Development Shortcut for Local Testing */}
              {devResetUrl && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      ⚡ Dev Mode Link Preview
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    No SMTP key required in development! You can jump directly to the reset page:
                  </p>
                  <a
                    href={devResetUrl}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline break-all"
                  >
                    Open Reset Password Form <ExternalLink className="h-3 w-3 inline" />
                  </a>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Didn&apos;t receive an email? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setDevResetUrl(null);
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    try another email
                  </button>
                </p>

                <div>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
