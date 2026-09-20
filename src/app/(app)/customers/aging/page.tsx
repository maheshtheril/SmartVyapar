'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingDown,
  Download,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Phone
} from 'lucide-react';

export default function CustomerAgingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchAging = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customers/aging');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to compute customer aging');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading aging report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAging();
  }, []);

  const summary = data?.summary;
  const filteredRows = (data?.rows || []).filter((r: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.customerName.toLowerCase().includes(q) ||
      (r.customerPhone && r.customerPhone.includes(q)) ||
      (r.customerGstin && r.customerGstin.toLowerCase().includes(q))
    );
  });

  const handleExportCsv = () => {
    if (!filteredRows.length) return;
    const headers = ['Customer Name', 'Phone', 'GSTIN', 'Total Outstanding', '0-30 Days', '31-60 Days', '61-90 Days', '>90 Days'];
    const csvContent = [
      headers.join(','),
      ...filteredRows.map((r: any) =>
        [
          `"${r.customerName}"`,
          `"${r.customerPhone}"`,
          `"${r.customerGstin || ''}"`,
          r.totalOutstanding,
          r.current0to30,
          r.days31to60,
          r.days61to90,
          r.days90Plus,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Aging_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Accounts Receivable & Customer Aging Analysis
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Debtors credit control, aging buckets (0-30, 31-60, 61-90, 90+ days), and automated WhatsApp dunning
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAging}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!filteredRows.length}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Aging CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</p>
          <p className="text-xl font-black text-slate-900 mt-1">
            ₹{Number(summary?.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{summary?.customerCount || 0} Debtors</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">0 - 30 Days (Current)</p>
          <p className="text-xl font-black text-emerald-600 mt-1">
            ₹{Number(summary?.total0to30 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Healthy credit range</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">31 - 60 Days</p>
          <p className="text-xl font-black text-amber-600 mt-1">
            ₹{Number(summary?.total31to60 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Due for follow-up</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">61 - 90 Days</p>
          <p className="text-xl font-black text-orange-600 mt-1">
            ₹{Number(summary?.total61to90 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-orange-600 font-medium mt-0.5">High risk alert</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">&gt; 90 Days (Critical)</p>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-600 mt-1">
            ₹{Number(summary?.total90Plus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-rose-600 font-medium mt-0.5">Default / Overdue risk</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-6 flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Customer Name, Phone, or GSTIN..."
          className="w-full text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 mr-2">
            Clear
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Customer & Contact</th>
                <th className="p-3.5 text-right font-black">Total Outstanding</th>
                <th className="p-3.5 text-right text-emerald-700">0 - 30 Days</th>
                <th className="p-3.5 text-right text-amber-700">31 - 60 Days</th>
                <th className="p-3.5 text-right text-orange-700">61 - 90 Days</th>
                <th className="p-3.5 text-right text-rose-700 font-black">&gt; 90 Days</th>
                <th className="p-3.5 text-center">Follow-up Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Computing debtor aging matrix...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No customers with outstanding credit balance found. All accounts settled!
                  </td>
                </tr>
              ) : (
                filteredRows.map((row: any) => (
                  <tr key={row.customerId} className="hover:bg-slate-50/60 transition text-slate-800">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{row.customerName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {row.customerPhone}
                        {row.customerGstin && <span className="font-mono text-indigo-600 ml-1">({row.customerGstin})</span>}
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900">
                      ₹{row.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">
                      {row.current0to30 > 0 ? `₹${row.current0to30.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-amber-700 font-bold">
                      {row.days31to60 > 0 ? `₹${row.days31to60.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-orange-700 font-bold">
                      {row.days61to90 > 0 ? `₹${row.days61to90.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-700 font-black">
                      {row.days90Plus > 0 ? `₹${row.days90Plus.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3.5 text-center">
                      <a
                        href={row.whatsappNoticeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition shadow-2xs"
                      >
                        <MessageSquare className="h-3 w-3" />
                        WhatsApp Notice
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
