'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';

interface Report {
  date: string;
  summary: {
    bills: number;
    revenue: number;
    subtotal: number;
    tax: number;
    avgBill: number;
    covers: number;
    revenuePerCover: number;
  };
  leakage: {
    voidedItems: number;
    voidedValue: number;
    discountedLines: number;
    discountValue: number;
    complimentaryLines: number;
    complimentaryValue: number;
  };
  payment: { mode: string; count: number; amount: number }[];
  hourly: { hour: number; bills: number; amount: number }[];
  topDishes: { name: string; qty: number; amount: number }[];
  byWaiter: { name: string; kots: number; amount: number }[];
}

const inr = (n: number) =>
  '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const hourLabel = (h: number) => {
  const suffix = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${suffix}`;
};

export default function RestaurantReportPage() {
  const todayIst = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIst);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurant/report?date=${d}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load report');
      setReport(data);
    } catch (e: any) {
      setReport(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
  }, [date]);

  const peak = report ? Math.max(1, ...report.hourly.map((h) => h.amount)) : 1;
  const activeHours = report ? report.hourly.filter((h) => h.bills > 0) : [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/restaurant"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
              <span>Daily F&amp;B Sales Report</span>
            </h1>
            <p className="text-xs text-slate-500">
              Revenue, top dishes, peak hours, payment mix and leakage for the day
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayIst}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={() => load(date)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && <div className="py-16 text-center text-xs text-slate-400">Loading report…</div>}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {report && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Revenue (incl. GST)', value: inr(report.summary.revenue), sub: `${report.summary.bills} bills` },
              { label: 'Average bill', value: inr(report.summary.avgBill), sub: `Before GST ${inr(report.summary.subtotal)}` },
              { label: 'Covers (guests)', value: String(report.summary.covers), sub: 'From KOT guest counts' },
              { label: 'Revenue per cover', value: inr(report.summary.revenuePerCover), sub: `GST collected ${inr(report.summary.tax)}` },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">{k.label}</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{k.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {report.summary.bills === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
              No settled restaurant bills on {report.date}.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-indigo-600" /> Hourly sales
              </h2>
              {activeHours.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">No sales yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {activeHours.map((h) => (
                    <div key={h.hour} className="flex items-center gap-2 text-[11px]">
                      <span className="w-10 text-slate-500 font-semibold">{hourLabel(h.hour)}</span>
                      <div className="flex-1 h-4 rounded bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${Math.max(3, (h.amount / peak) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right font-bold text-slate-700">{inr(h.amount)}</span>
                      <span className="w-12 text-right text-slate-400">{h.bills} bill{h.bills > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Top dishes</h2>
              {report.topDishes.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">No dishes sold.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="pb-1.5 font-semibold">Dish</th>
                      <th className="pb-1.5 font-semibold text-right">Qty</th>
                      <th className="pb-1.5 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topDishes.map((d, idx) => (
                      <tr key={d.name} className="border-t border-slate-100">
                        <td className="py-1.5 font-semibold text-slate-800">
                          <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                          {d.name}
                        </td>
                        <td className="py-1.5 text-right text-slate-700">{d.qty}</td>
                        <td className="py-1.5 text-right font-bold text-slate-900">{inr(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Payment mix</h2>
              {report.payment.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">No payments.</div>
              ) : (
                <div className="space-y-2">
                  {report.payment.map((p) => (
                    <div key={p.mode} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{p.mode.replace('_', ' ')}</span>
                      <span className="text-slate-400">{p.count} bill{p.count > 1 ? 's' : ''}</span>
                      <span className="font-bold text-slate-900">{inr(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Sales by captain</h2>
              {report.byWaiter.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">No orders.</div>
              ) : (
                <div className="space-y-2">
                  {report.byWaiter.map((w) => (
                    <div key={w.name} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{w.name}</span>
                      <span className="text-slate-400">{w.kots} KOT{w.kots > 1 ? 's' : ''}</span>
                      <span className="font-bold text-slate-900">{inr(w.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4" /> Leakage watch
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-amber-800 font-semibold">Voided items</div>
                <div className="text-lg font-bold text-slate-900">{report.leakage.voidedItems}</div>
                <div className="text-slate-500">Worth {inr(report.leakage.voidedValue)}</div>
              </div>
              <div>
                <div className="text-amber-800 font-semibold">Discounts given</div>
                <div className="text-lg font-bold text-slate-900">{inr(report.leakage.discountValue)}</div>
                <div className="text-slate-500">{report.leakage.discountedLines} line(s)</div>
              </div>
              <div>
                <div className="text-amber-800 font-semibold">Complimentary</div>
                <div className="text-lg font-bold text-slate-900">{inr(report.leakage.complimentaryValue)}</div>
                <div className="text-slate-500">{report.leakage.complimentaryLines} line(s)</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Every void, discount and comp is also recorded in the audit trail with the staff name.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
