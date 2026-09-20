"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  Printer,
  ArrowDownRight,
  TrendingUp,
  RefreshCw,
  Plus,
  ShieldCheck,
  Search,
} from "lucide-react";
import CashDrawerModal from "@/components/CashDrawerModal";
import ThermalZReportModal, { ZReportData } from "@/components/ThermalZReportModal";

export default function CashDrawerShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [selectedZReport, setSelectedZReport] = useState<ZReportData | null>(null);
  const [showZReportModal, setShowZReportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cash-drawer/history?limit=50");
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
      }
    } catch (err) {
      console.error("Failed to load shift history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleOpenZReport = (shift: any) => {
    let denoms = {};
    try {
      const raw = shift.denominationsJson || shift.denominations;
      if (raw) {
        denoms = typeof raw === "string" ? JSON.parse(raw) : raw;
      }
    } catch (e) {
      // ignore
    }

    const variance = Number(shift.cashDifference || 0);

    const report: ZReportData = {
      shift,
      billCount: undefined,
      sales: {
        cash: Number(shift.cashSales || 0),
        upi: Number(shift.upiSales || 0),
        card: Number(shift.cardSales || 0),
        credit: Number(shift.creditSales || 0),
        gross: Number(shift.grossSales || 0),
      },
      payouts: {
        total: Number(shift.cashPayouts || 0),
        items: shift.payouts || [],
      },
      reconciliation: {
        expectedCash: Number(shift.expectedCash || 0),
        actualCash: Number(shift.actualCashCounted || 0),
        variance,
        varianceType:
          Math.abs(variance) < 0.01
            ? "BALANCED"
            : variance > 0
            ? "EXCESS"
            : "SHORTAGE",
      },
      denominations: denoms,
      closedAt: shift.closedAt,
      closedByName: shift.closedByName,
    };

    setSelectedZReport(report);
    setShowZReportModal(true);
  };

  const filteredShifts = shifts.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.shiftNumber.toLowerCase().includes(q) ||
      (s.openedByName && s.openedByName.toLowerCase().includes(q)) ||
      (s.closedByName && s.closedByName.toLowerCase().includes(q))
    );
  });

  const activeShift = shifts.find((s) => s.status === "OPEN");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Cash Drawer & Shift Settlement
              </h1>
              <p className="text-xs text-slate-500">
                Register float audits, petty cash ledger, and statutory Thermal Z-Reports
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowDrawerModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Wallet className="h-4 w-4" />
            {activeShift ? "Manage Active Till" : "Open New Till Shift"}
          </button>
        </div>
      </div>

      {/* Active Shift Banner */}
      {activeShift && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{activeShift.shiftNumber}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    LIVE REGISTER OPEN
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Opened by <span className="font-semibold text-slate-800">{activeShift.openedByName}</span> at{" "}
                  {new Date(activeShift.openedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div>
                <div className="text-slate-500">Opening Float</div>
                <div className="text-sm font-bold text-slate-900">₹{Number(activeShift.openingFloat).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-slate-500">Petty Payouts</div>
                <div className="text-sm font-bold text-rose-600">₹{Number(activeShift.cashPayouts).toFixed(2)}</div>
              </div>
              <button
                onClick={() => setShowDrawerModal(true)}
                className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
              >
                Close & Count Cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shifts History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="font-bold text-sm text-slate-800">Past Register Shifts & Settlement History</div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shift # or cashier..."
              className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading shift audit history...</div>
        ) : filteredShifts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No register shifts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Shift #</th>
                  <th className="px-4 py-3">Cashier</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Closed</th>
                  <th className="px-4 py-3 text-right">Float</th>
                  <th className="px-4 py-3 text-right">Cash Sales</th>
                  <th className="px-4 py-3 text-right">Gross Sales</th>
                  <th className="px-4 py-3 text-right">Payouts</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">Audit Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredShifts.map((shift) => {
                  const variance = Number(shift.cashDifference || 0);
                  const isBalanced = Math.abs(variance) < 0.01;
                  const isExcess = variance > 0.01;
                  const isShortage = variance < -0.01;
                  const isOpen = shift.status === "OPEN";

                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/75 transition font-sans">
                      <td className="px-4 py-3 font-bold font-mono text-slate-900">
                        {shift.shiftNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold">{shift.openedByName}</div>
                        {shift.closedByName && shift.closedByName !== shift.openedByName && (
                          <div className="text-[10px] text-slate-400">Closed: {shift.closedByName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px]">
                        {new Date(shift.openedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}{" "}
                        {new Date(shift.openedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px]">
                        {shift.closedAt ? (
                          <>
                            {new Date(shift.closedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}{" "}
                            {new Date(shift.closedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        ₹{Number(shift.openingFloat).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                        ₹{Number(shift.cashSales).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(shift.grossSales).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-600 font-medium">
                        {Number(shift.cashPayouts) > 0 ? `-₹${Number(shift.cashPayouts).toFixed(2)}` : "₹0.00"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {isOpen ? (
                          <span className="text-slate-400 font-sans text-[11px]">In Progress</span>
                        ) : isBalanced ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px]">
                            <CheckCircle className="h-3 w-3" /> ₹0.00
                          </span>
                        ) : isExcess ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 text-[11px]">
                            <AlertTriangle className="h-3 w-3" /> +₹{variance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 text-[11px]">
                            <AlertTriangle className="h-3 w-3" /> -₹{Math.abs(variance).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {shift.status === "CLOSED" ? (
                          <button
                            onClick={() => handleOpenZReport(shift)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shadow-xs"
                          >
                            <Printer className="h-3.5 w-3.5 text-slate-500" />
                            Z-Report
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowDrawerModal(true)}
                            className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            Manage
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash Drawer Modal */}
      <CashDrawerModal
        isOpen={showDrawerModal}
        onClose={() => {
          setShowDrawerModal(false);
          fetchHistory();
        }}
        onShiftClosed={(zReport) => {
          fetchHistory();
          setSelectedZReport(zReport);
          setShowZReportModal(true);
        }}
      />

      {/* Thermal Z-Report Modal */}
      <ThermalZReportModal
        isOpen={showZReportModal}
        onClose={() => setShowZReportModal(false)}
        data={selectedZReport}
      />
    </div>
  );
}
