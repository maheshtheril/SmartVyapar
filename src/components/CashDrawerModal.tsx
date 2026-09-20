"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Wallet,
  ArrowDownCircle,
  Calculator,
  CheckCircle,
  AlertTriangle,
  History,
  Coins,
  Receipt,
  FileSpreadsheet,
  Lock,
  Unlock,
  RefreshCw,
} from "lucide-react";
import { ZReportData } from "./ThermalZReportModal";

interface CashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftClosed: (zReport: ZReportData) => void;
}

export default function CashDrawerModal({
  isOpen,
  onClose,
  onShiftClosed,
}: CashDrawerModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "payout" | "close" | "open">("overview");

  // Open Shift Form State
  const [openFloat, setOpenFloat] = useState<number | string>(2000);
  const [openNotes, setOpenNotes] = useState("");

  // Payout Form State
  const [payoutAmount, setPayoutAmount] = useState<number | string>("");
  const [payoutReason, setPayoutReason] = useState("");
  const [payoutPaidTo, setPayoutPaidTo] = useState("");

  // Denominations Counter State
  const [c500, setC500] = useState<number | string>("");
  const [c200, setC200] = useState<number | string>("");
  const [c100, setC100] = useState<number | string>("");
  const [c50, setC50] = useState<number | string>("");
  const [c20, setC20] = useState<number | string>("");
  const [c10, setC10] = useState<number | string>("");
  const [coins, setCoins] = useState<number | string>("");
  const [closeNotes, setCloseNotes] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCurrentShift = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cash-drawer/current");
      if (!res.ok) throw new Error("Failed to load cash drawer status");
      const data = await res.json();
      if (data.shift) {
        setCurrentShift(data.shift);
        setLiveMetrics(data.liveMetrics);
        setActiveTab("overview");
      } else {
        setCurrentShift(null);
        setLiveMetrics(null);
        setActiveTab("open");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCurrentShift();
      setMessage(null);
    }
  }, [isOpen]);

  // Denominations Math
  const num500 = Number(c500) || 0;
  const num200 = Number(c200) || 0;
  const num100 = Number(c100) || 0;
  const num50  = Number(c50)  || 0;
  const num20  = Number(c20)  || 0;
  const num10  = Number(c10)  || 0;
  const numCoins = Number(coins) || 0;

  const actualTotalCounted =
    num500 * 500 +
    num200 * 200 +
    num100 * 100 +
    num50 * 50 +
    num20 * 20 +
    num10 * 10 +
    numCoins;

  const expectedCashInTill = Number(liveMetrics?.expectedCashInDrawer ?? 0);
  const variance = actualTotalCounted - expectedCashInTill;

  // Handlers
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch("/api/cash-drawer/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingFloat: Number(openFloat) || 0,
          notes: openNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open shift");
      setMessage({ type: "success", text: data.message });
      await fetchCurrentShift();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch("/api/cash-drawer/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payoutAmount),
          reason: payoutReason,
          paidTo: payoutPaidTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payout");
      setMessage({ type: "success", text: data.message });
      setPayoutAmount("");
      setPayoutReason("");
      setPayoutPaidTo("");
      await fetchCurrentShift();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!confirm("Are you sure you want to close the till and finalize the shift? This action will generate the official Z-Report.")) {
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch("/api/cash-drawer/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          denominations: {
            c500: num500,
            c200: num200,
            c100: num100,
            c50: num50,
            c20: num20,
            c10: num10,
            coins: numCoins,
          },
          closingNotes: closeNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close shift");

      // Reset denomination counters
      setC500("");
      setC200("");
      setC100("");
      setC50("");
      setC20("");
      setC10("");
      setCoins("");
      setCloseNotes("");

      onClose();
      if (data.zReport) {
        onShiftClosed(data.zReport);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Cash Drawer & Shift Settlement</h2>
                {currentShift ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {currentShift.shiftNumber} (OPEN)
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                    Till Closed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {currentShift
                  ? `Opened by ${currentShift.openedByName} at ${new Date(currentShift.openedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                  : "Open register float to begin shift billing"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCurrentShift}
              title="Refresh Shift Metrics"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                : "bg-rose-50 text-rose-800 border-b border-rose-200"
            }`}
          >
            {message.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab Navigation (when shift is open) */}
        {currentShift && (
          <div className="flex border-b border-slate-200 px-6 bg-white gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
                activeTab === "overview"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Wallet className="h-4 w-4" /> Live Till Overview
            </button>
            <button
              onClick={() => setActiveTab("payout")}
              className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
                activeTab === "payout"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" /> Petty Cash Out
              {currentShift.payouts?.length > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {currentShift.payouts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("close")}
              className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
                activeTab === "close"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calculator className="h-4 w-4" /> Close & Denominations
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: OPEN SHIFT (When no shift is open) */}
          {!currentShift && (
            <form onSubmit={handleOpenShift} className="space-y-5">
              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-4 text-xs text-blue-900 leading-relaxed">
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  <Unlock className="h-4 w-4 text-blue-600" /> Start Register Shift
                </div>
                Count and enter the initial cash float placed in the drawer this morning. All POS cash transactions and payouts will be balanced against this float.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Opening Cash Float (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={openFloat}
                    onChange={(e) => setOpenFloat(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-8 pr-4 py-2.5 text-base font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="2000"
                  />
                </div>
                {/* Quick Float Buttons */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOpenFloat(amt)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Shift Notes / Register ID (Optional)
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g. Counter 1 - Morning Shift"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                <Unlock className="h-4 w-4" />
                {loading ? "Opening Shift..." : "Open Register & Start Shift"}
              </button>
            </form>
          )}

          {/* TAB: OVERVIEW */}
          {currentShift && activeTab === "overview" && (
            <div className="space-y-6">
              {/* Expected Till Card */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-md">
                <div className="flex items-center justify-between text-xs text-emerald-100 mb-1">
                  <span>Expected Cash Currently In Drawer</span>
                  <span className="font-mono text-emerald-200">{currentShift.shiftNumber}</span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">
                  ₹{expectedCashInTill.toFixed(2)}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-emerald-100/90">
                  <div>Float: <span className="font-bold text-white">₹{Number(currentShift.openingFloat).toFixed(0)}</span></div>
                  <div>+ Cash Sales: <span className="font-bold text-white">₹{(liveMetrics?.cashSales || 0).toFixed(0)}</span></div>
                  <div>- Payouts: <span className="font-bold text-white">₹{(liveMetrics?.cashPayouts || 0).toFixed(0)}</span></div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">Gross Sales</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">₹{(liveMetrics?.grossSales || 0).toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{liveMetrics?.billCount || 0} invoices</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">UPI / QR Sales</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">₹{(liveMetrics?.upiSales || 0).toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Bank settled</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">Card / POS</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">₹{(liveMetrics?.cardSales || 0).toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Terminal</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">Petty Payouts</div>
                  <div className="mt-1 text-lg font-bold text-rose-600">₹{(liveMetrics?.cashPayouts || 0).toFixed(2)}</div>
                  <div className="text-[10px] text-rose-500 mt-0.5">{currentShift.payouts?.length || 0} entries</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab("payout")}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
                >
                  <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                  Record Petty Cash Out
                </button>
                <button
                  onClick={() => setActiveTab("close")}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 p-3 text-xs font-bold text-white hover:bg-slate-800 shadow-sm transition"
                >
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  Close Shift & Count Cash
                </button>
              </div>
            </div>
          )}

          {/* TAB: PETTY CASH OUT */}
          {currentShift && activeTab === "payout" && (
            <div className="space-y-5">
              <form onSubmit={handleRecordPayout} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-rose-600" />
                  Record New Petty Cash Out from Register
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-rose-500 focus:outline-none"
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Paid To (Optional)
                    </label>
                    <input
                      type="text"
                      value={payoutPaidTo}
                      onChange={(e) => setPayoutPaidTo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                      placeholder="e.g. Tea stall / Ramesh"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Reason / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutReason}
                    onChange={(e) => setPayoutReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                    placeholder="e.g. Office tea & snacks, Courier charges, Cleaning supplies"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    {loading ? "Recording..." : "Deduct & Save Payout"}
                  </button>
                </div>
              </form>

              {/* Payouts History for this shift */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">Shift Payouts Log</div>
                {currentShift.payouts && currentShift.payouts.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-white">
                    {currentShift.payouts.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{p.reason}</div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(p.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            {p.paidTo ? ` • Paid to: ${p.paidTo}` : ""}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-rose-600">
                          -₹{Number(p.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                    No petty cash payouts recorded for this shift.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CLOSE SHIFT & DENOMINATIONS COUNTER */}
          {currentShift && activeTab === "close" && (
            <div className="space-y-5">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Expected Cash in Till: </span>
                    <span className="font-bold text-slate-900 text-sm">₹{expectedCashInTill.toFixed(2)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Actual Counted: </span>
                    <span className="font-bold text-slate-900 text-sm">₹{actualTotalCounted.toFixed(2)}</span>
                  </div>
                  <div>
                    {Math.abs(variance) < 0.01 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        <CheckCircle className="h-3.5 w-3.5" /> BALANCED (₹0.00)
                      </span>
                    ) : variance > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                        <AlertTriangle className="h-3.5 w-3.5" /> EXCESS (+₹{variance.toFixed(2)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                        <AlertTriangle className="h-3.5 w-3.5" /> SHORTAGE (-₹{Math.abs(variance).toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Denomination Counter Inputs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-500" />
                    Indian Currency Denomination Counter
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setC500("");
                      setC200("");
                      setC100("");
                      setC50("");
                      setC20("");
                      setC10("");
                      setCoins("");
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 transition"
                  >
                    Clear Counter
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "₹500 Notes", count: c500, setter: setC500, unit: 500, val: num500 * 500 },
                    { label: "₹200 Notes", count: c200, setter: setC200, unit: 200, val: num200 * 200 },
                    { label: "₹100 Notes", count: c100, setter: setC100, unit: 100, val: num100 * 100 },
                    { label: "₹50 Notes",  count: c50,  setter: setC50,  unit: 50,  val: num50 * 50 },
                    { label: "₹20 Notes",  count: c20,  setter: setC20,  unit: 20,  val: num20 * 20 },
                    { label: "₹10 Notes",  count: c10,  setter: setC10,  unit: 10,  val: num10 * 10 },
                  ].map((denom) => (
                    <div key={denom.label} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span>{denom.label}</span>
                        <span className="text-emerald-700 font-bold">₹{denom.val}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={denom.count}
                          onChange={(e) => denom.setter(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-center font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coins / Loose Cash */}
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700">
                    <div>Loose Coins & Change (₹)</div>
                    <div className="text-[10px] text-slate-400">Total coin value in till</div>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={coins}
                      onChange={(e) => setCoins(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-right font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Day-End Closing Notes (Optional)
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Discrepancy explanation or handover to evening cashier"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCloseShift}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  <Lock className="h-4 w-4 text-emerald-400" />
                  {loading ? "Closing Shift & Auditing..." : "Close Register & Generate Official Z-Report"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
