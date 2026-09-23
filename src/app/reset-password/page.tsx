"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setTokenError("Missing reset token in link. Please use the link sent to your email.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setTokenValid(true);
          setUserInfo(data.user || null);
        } else {
          setTokenValid(false);
          setTokenError(data.error || "This reset link is invalid or has expired.");
        }
      } catch {
        setTokenValid(false);
        setTokenError("Failed to verify token. Please check your network connection.");
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to update password. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setFormError("Unable to update password. Please check your internet connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 mb-4">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Ziona <span className="text-indigo-600">POS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Set a New Password</p>
        </div>

        {/* Card Body */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          {verifying ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Verifying security token...</p>
            </div>
          ) : !tokenValid ? (
            <div className="text-center space-y-5">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Link Invalid or Expired</h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{tokenError}</p>
              </div>
              <div className="pt-2">
                <Link
                  href="/forgot-password"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Request a New Link
                </Link>
              </div>
              <div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="text-center space-y-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">Password Updated!</h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Your credentials have been securely updated. You can now log into Ziona POS using your new password.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => router.push("/login")}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Sign In to Ziona POS
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Verified Security Token
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Create New Password</h2>
                {userInfo?.name && (
                  <p className="text-xs text-slate-500 mt-1">
                    Resetting credentials for <strong className="text-slate-700">{userInfo.name}</strong> ({userInfo.email})
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Save New Password</span>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Cancel and Return to Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
