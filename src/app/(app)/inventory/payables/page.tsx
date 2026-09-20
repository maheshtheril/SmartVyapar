'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Building2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingDown,
  Download,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

export default function VendorPayablesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPayables = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/purchase/payables');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to compute vendor payables');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading payables report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const summary = data?.summary;
  const filteredRows = (data?.rows || []).filter((r: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.supplierName.toLowerCase().includes(q) ||
      (r.supplierGstin && r.supplierGstin.toLowerCase().includes(q))
    );
  });

  const handleExportCsv = () => {
    if (!filteredRows.length) return;
    const headers = ['Supplier Name', 'GSTIN', 'Total Payable', '0-30 Days', '31-60 Days', '61-90 Days', '>90 Days', 'Bills Count'];
    const csvContent = [
      headers.join(','),
      ...filteredRows.map((r: any) =>
        [
          `"${r.supplierName}"`,
          `"${r.supplierGstin || ''}"`,
          r.totalPayable,
          r.current0to30,
          r.days31to60,
          r.days61to90,
          r.days90Plus,
          r.billsCount,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vendor_Payables_Aging_${new Date().toISOString().split('T')[0]}.csv`;
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
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Accounts Payable & Vendor Aging Analysis
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Supplier bills outstanding, credit periods, payment aging buckets, and cash outflow planning
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayables}
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
            Export Payables CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Accounts Payable</p>
          <p className="text-xl font-black text-slate-900 mt-1">
            ₹{Number(summary?.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{summary?.supplierCount || 0} Creditors</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">0 - 30 Days (Current)</p>
          <p className="text-xl font-black text-emerald-600 mt-1">
            ₹{Number(summary?.total0to30 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Within standard terms</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">31 - 60 Days</p>
          <p className="text-xl font-black text-amber-600 mt-1">
            ₹{Number(summary?.total31to60 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Due for payment</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">61 - 90 Days</p>
          <p className="text-xl font-black text-orange-600 mt-1">
            ₹{Number(summary?.total61to90 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-orange-600 font-medium mt-0.5">Delayed payment</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 md:col-span-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">&gt; 90 Days (Overdue)</p>
          <p className="text-xl font-black text-rose-600 mt-1">
            ₹{Number(summary?.total90Plus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-rose-600 font-medium mt-0.5">High vendor dispute risk</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-6 flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Supplier Name or GSTIN..."
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
                <th className="p-3.5">Supplier Name & GSTIN</th>
                <th className="p-3.5 text-center">Bills</th>
                <th className="p-3.5 text-right font-black">Total Payable</th>
                <th className="p-3.5 text-right text-emerald-700">0 - 30 Days</th>
                <th className="p-3.5 text-right text-amber-700">31 - 60 Days</th>
                <th className="p-3.5 text-right text-orange-700">61 - 90 Days</th>
                <th className="p-3.5 text-right text-rose-700 font-black">&gt; 90 Days</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Calculating accounts payable aging...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No outstanding payables to suppliers. All bills settled!
                  </td>
                </tr>
              ) : (
                filteredRows.map((row: any) => {
                  const isExpanded = expandedVendor === row.supplierName;
                  return (
                    <React.Fragment key={row.supplierName}>
                      <tr className="hover:bg-slate-50/60 transition text-slate-800">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{row.supplierName}</div>
                          {row.supplierGstin && (
                            <div className="text-[10px] font-mono text-indigo-600 mt-0.5">
                              {row.supplierGstin}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setExpandedVendor(isExpanded ? null : row.supplierName)}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold transition"
                          >
                            {row.billsCount} Bills
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-slate-900">
                          ₹{row.totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                          <Link
                            href={`/accounting/vouchers?type=PAYMENT&narration=${encodeURIComponent(`Payment to ${row.supplierName}`)}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition shadow-2xs"
                          >
                            <FileCheck className="h-3 w-3" />
                            Pay (PV)
                          </Link>
                        </td>
                      </tr>

                      {/* Expandable Bills Subtable */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="p-4 pl-8">
                            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2.5">Bill Number</th>
                                    <th className="p-2.5">Bill Date</th>
                                    <th className="p-2.5">Payment Terms</th>
                                    <th className="p-2.5 text-right">Bill Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {row.bills.map((b: any) => (
                                    <tr key={b.id}>
                                      <td className="p-2.5 font-mono font-bold text-indigo-600">{b.billNumber}</td>
                                      <td className="p-2.5 text-slate-600">
                                        {new Date(b.billDate).toLocaleDateString('en-IN')}
                                      </td>
                                      <td className="p-2.5">
                                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                          {b.paymentTerms || 'CREDIT'}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                        ₹{b.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
