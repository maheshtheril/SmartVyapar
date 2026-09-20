'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Share2,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  FileText,
  Calendar,
  Building2,
  Download,
} from 'lucide-react';
import { ReconciliationReport, ReconciledRow, MatchStatus, formatPeriodName } from '@/lib/gstr2b-matcher';

export default function Gstr2bReconciliationPage() {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [selectedPeriod, setSelectedPeriod] = useState<string>('082026');
  const [activeTab, setActiveTab] = useState<MatchStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load latest or historical reconciliation
  const fetchReconciliation = async (period?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = period ? `/api/gst/reconcile-2b?period=${period}` : `/api/gst/reconcile-2b`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        if (data.report.returnPeriod) {
          setSelectedPeriod(data.report.returnPeriod);
        }
      }
    } catch (err: any) {
      console.error('Failed to load GSTR-2B:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, []);

  // Handle Drag & Drop / File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await runReconciliation({ jsonContent: text, fileName: file.name });
    };
    reader.readAsText(file);
  };

  // Run reconciliation API
  const runReconciliation = async (payload: {
    jsonContent?: string;
    isSample?: boolean;
    fileName?: string;
  }) => {
    setReconciling(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/gst/reconcile-2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          returnPeriod: selectedPeriod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reconcile GSTR-2B');
      }
      setReport(data.report);
      setSuccessMsg('GSTR-2B cross-match completed and saved to audit ledger!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  // 1-Click Demo Sample Load
  const handleLoadSample = async () => {
    setFileName('gstr2b_sample_aug2026.json');
    await runReconciliation({ isSample: true, fileName: 'gstr2b_sample_aug2026.json' });
  };

  // Filter rows
  const filteredRows = (report?.rows || []).filter((row) => {
    if (activeTab !== 'ALL' && row.status !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = row.supplierName.toLowerCase().includes(q);
      const gstinMatch = row.supplierGstin.toLowerCase().includes(q);
      const invMatch = row.invoiceNumber.toLowerCase().includes(q);
      return nameMatch || gstinMatch || invMatch;
    }
    return true;
  });

  // Export to CSV
  const handleExportCsv = () => {
    if (!report || report.rows.length === 0) return;
    const headers = [
      'Status',
      'Supplier Name',
      'Supplier GSTIN',
      'Invoice No',
      'Invoice Date',
      'Books Taxable',
      'Books Tax',
      'Books Total',
      '2B Taxable',
      '2B Tax',
      '2B Total',
      'Tax Difference',
    ];
    const csvLines = [headers.join(',')];
    for (const r of report.rows) {
      csvLines.push(
        [
          `"${r.status}"`,
          `"${r.supplierName}"`,
          `"${r.supplierGstin}"`,
          `"${r.invoiceNumber}"`,
          `"${r.invoiceDate}"`,
          (r.booksTaxable || 0).toFixed(2),
          (r.booksTax || 0).toFixed(2),
          (r.booksTotal || 0).toFixed(2),
          (r.gstr2bTaxable || 0).toFixed(2),
          (r.gstr2bTax || 0).toFixed(2),
          (r.gstr2bTotal || 0).toFixed(2),
          r.taxDiff.toFixed(2),
        ].join(',')
      );
    }
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR2B_Reconciliation_${report.returnPeriod}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/accounting"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="h-6 w-6 text-indigo-600" />
                <span>GSTR-2B vs. Purchase Register ITC Matcher</span>
              </h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                Rule 36(4)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cross-match GST Portal GSTR-2B JSON to guarantee 100% eligible Input Tax Credit in GSTR-3B
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                fetchReconciliation(e.target.value);
              }}
              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="082026">August 2026 (082026)</option>
              <option value="072026">July 2026 (072026)</option>
              <option value="062026">June 2026 (062026)</option>
              <option value="052026">May 2026 (052026)</option>
            </select>
          </div>

          {/* 1-Click Demo Sample Button */}
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={reconciling}
            className="flex items-center space-x-1.5 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 transition shadow-2xs disabled:opacity-50"
            title="Load realistic sample GSTR-2B data (Bosch, Castrol, Lumax) to test the engine instantly"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>Load Sample GSTR-2B</span>
          </button>

          {/* Upload File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={reconciling}
            className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" />
            <span>{reconciling ? 'Matching...' : 'Upload 2B JSON'}</span>
          </button>

          {report && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center space-x-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title="Download Audit Report as CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Banners */}
      {successMsg && (
        <div className="flex items-center space-x-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 animate-in fade-in">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: 🟢 Matched ITC */}
          <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/50 to-white p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Eligible ITC Matched
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-950">
              ₹{report.summary.matchedItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium">
              <span>{report.summary.matchedCount} bills 100% verified</span>
              <span className="rounded bg-emerald-100/80 px-1.5 py-0.5 text-[9px] font-bold">GSTR-3B Ready</span>
            </div>
          </div>

          {/* Card 2: 🔴 ITC At Risk (Missing in 2B) */}
          <div className="rounded-2xl border border-rose-200 bg-linear-to-br from-rose-50/50 to-white p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                ITC At Risk (Missing in 2B)
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                <AlertOctagon className="h-4 w-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-rose-950">
              ₹{report.summary.pendingItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-rose-700 font-medium">
              <span>{report.summary.missingIn2bCount} bills not filed by vendor</span>
              <span className="rounded bg-rose-100/80 px-1.5 py-0.5 text-[9px] font-bold">WhatsApp Notice</span>
            </div>
          </div>

          {/* Card 3: 🟡 Tax / Value Mismatch */}
          <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50/50 to-white p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Value / Tax Discrepancies
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-950">
              {report.summary.mismatchedCount} <span className="text-sm font-semibold text-slate-500">Invoices</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-amber-700 font-medium">
              <span>Rate or taxable difference</span>
              <span className="rounded bg-amber-100/80 px-1.5 py-0.5 text-[9px] font-bold">Verify Bill</span>
            </div>
          </div>

          {/* Card 4: 🔵 Missing in Books */}
          <div className="rounded-2xl border border-indigo-200 bg-linear-to-br from-indigo-50/50 to-white p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                Unrecorded in Books
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <HelpCircle className="h-4 w-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-950">
              {report.summary.missingInBooksCount} <span className="text-sm font-semibold text-slate-500">Invoices</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-indigo-700 font-medium">
              <span>Filed by vendor on portal</span>
              <span className="rounded bg-indigo-100/80 px-1.5 py-0.5 text-[9px] font-bold">Inward GRN</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Reconciliation Workspace */}
      {report ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Workspace Filter Bar & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 p-4 bg-slate-50/60">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Invoices', count: report.rows.length },
                { id: 'MATCHED', label: '🟢 Matched', count: report.summary.matchedCount },
                { id: 'VALUE_MISMATCH', label: '🟡 Mismatch', count: report.summary.mismatchedCount },
                { id: 'MISSING_IN_2B', label: '🔴 Missing in 2B', count: report.summary.missingIn2bCount },
                { id: 'MISSING_IN_BOOKS', label: '🔵 Missing in Books', count: report.summary.missingInBooksCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendor, GSTIN, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Audit Status</th>
                  <th className="px-4 py-3">Supplier & GSTIN</th>
                  <th className="px-4 py-3">Invoice # / Date</th>
                  <th className="px-4 py-3 text-right">Books Tax (ITC)</th>
                  <th className="px-4 py-3 text-right">GSTR-2B Tax</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No invoices found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      {/* Status Column */}
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            row.status === 'MATCHED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : row.status === 'MISSING_IN_2B'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : row.status === 'VALUE_MISMATCH'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {row.status === 'MATCHED' && <CheckCircle2 className="h-3 w-3" />}
                          {row.status === 'MISSING_IN_2B' && <AlertOctagon className="h-3 w-3" />}
                          {row.status === 'VALUE_MISMATCH' && <AlertTriangle className="h-3 w-3" />}
                          {row.status === 'MISSING_IN_BOOKS' && <HelpCircle className="h-3 w-3" />}
                          <span>{row.statusLabel}</span>
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-tight">
                          {row.statusDesc}
                        </div>
                      </td>

                      {/* Supplier Column */}
                      <td className="px-4 py-3 align-top">
                        <div className="font-bold text-slate-900">{row.supplierName}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          GSTIN: <span className="font-bold text-slate-700">{row.supplierGstin}</span>
                        </div>
                      </td>

                      {/* Invoice Column */}
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <div className="font-bold font-mono text-slate-900">{row.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Dt: {row.invoiceDate}</div>
                      </td>

                      {/* Books Tax Column */}
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        {row.booksTax !== undefined ? (
                          <div>
                            <div className="font-bold text-slate-900">₹{row.booksTax.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-400">
                              Val: ₹{(row.booksTaxable || 0).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not in Books</span>
                        )}
                      </td>

                      {/* GSTR-2B Tax Column */}
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        {row.gstr2bTax !== undefined ? (
                          <div>
                            <div className="font-bold text-slate-900">₹{row.gstr2bTax.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-400">
                              Val: ₹{(row.gstr2bTaxable || 0).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-bold text-[10px]">Unfiled on Portal</span>
                        )}
                      </td>

                      {/* Variance Column */}
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        {row.taxDiff > 0.01 ? (
                          <span className="font-bold text-amber-600">
                            ₹{row.taxDiff.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">₹0.00</span>
                        )}
                      </td>

                      {/* Action Column */}
                      <td className="px-4 py-3 align-top text-center whitespace-nowrap">
                        {row.status === 'MISSING_IN_2B' && row.whatsappUrl && (
                          <a
                            href={row.whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                            title="Send 1-Click WhatsApp Tax Notice to Supplier"
                          >
                            <Share2 className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {row.status === 'MISSING_IN_BOOKS' && (
                          <Link
                            href="/inventory/purchase"
                            className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            <span>Inward</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}

                        {row.status === 'MATCHED' && (
                          <span className="text-emerald-600 text-[11px] font-bold">
                            ✓ Verified
                          </span>
                        )}

                        {row.status === 'VALUE_MISMATCH' && (
                          <Link
                            href="/inventory/purchase"
                            className="inline-flex items-center space-x-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 transition"
                          >
                            <span>Inspect</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State / Upload Dropzone */
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1">
            No GSTR-2B Reconciliation Loaded Yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Upload the official GSTR-2B JSON file downloaded from the GST Portal (<span className="font-semibold text-slate-700">gst.gov.in</span>) or click below to load sample demo data.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={reconciling}
              className="flex items-center space-x-2 rounded-xl border border-purple-200 bg-purple-50 px-5 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition shadow-xs"
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>Load Sample GSTR-2B Demo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={reconciling}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-sm"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload Portal 2B JSON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
