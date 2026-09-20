'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCode,
  Download,
  Calendar,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Table,
  Eye,
  Info
} from 'lucide-react';

export default function Gstr1FilingPage() {
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'B2B' | 'B2CS' | 'CDNR' | 'HSN' | 'DOCS'>('B2B');
  const [gspSubmitting, setGspSubmitting] = useState<boolean>(false);
  const [gspResult, setGspResult] = useState<any>(null);

  const fetchGstr1 = async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/gstr-1?period=${selectedPeriod}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch GSTR-1 data');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGstr1(period);
  }, [period]);

  const handleDownloadJson = () => {
    if (!data?.gstr1Payload) return;
    const blob = new Blob([JSON.stringify(data.gstr1Payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename || `GSTR1_${period}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGspDirectFile = async () => {
    setGspSubmitting(true);
    setGspResult(null);
    try {
      const res = await fetch('/api/gst/direct-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const result = await res.json();
      setGspResult(result);
    } catch (err: any) {
      setGspResult({ success: false, error: err.message || 'Direct upload failed' });
    } finally {
      setGspSubmitting(false);
    }
  };

  const payload = data?.gstr1Payload;
  const counts = data?.counts;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                GSTR-1 Portal Return & Filing Studio
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Government-ready Table 4 (B2B), Table 7 (B2CS), Table 9B (CDNR) & Table 12 (HSN) Specification
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Return Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              {[
                { label: 'August 2026', val: '082026' },
                { label: 'July 2026', val: '072026' },
                { label: 'June 2026', val: '062026' },
                { label: 'May 2026', val: '052026' },
                { label: 'April 2026', val: '042026' },
                { label: 'March 2026', val: '032026' },
              ].map((opt) => (
                <option key={opt.val} value={opt.val}>
                  {opt.label} ({opt.val})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchGstr1(period)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleDownloadJson}
            disabled={!data || loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download GSTN JSON
          </button>

          <button
            onClick={handleGspDirectFile}
            disabled={!data || gspSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {gspSubmitting ? 'Uploading to GSP...' : 'Direct File via GSP'}
          </button>
        </div>
      </div>

      {/* GSP Direct Result Alert */}
      {gspResult && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            gspResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {gspResult.success ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
            <span>{gspResult.success ? 'GSP Portal Filing Completed' : 'GSP Portal Notice'}</span>
          </div>
          <p className="text-xs mt-1">{gspResult.message || gspResult.error || JSON.stringify(gspResult)}</p>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Table 4: B2B Invoices</p>
          <p className="text-xl font-black text-slate-900 mt-1">{counts?.b2b || 0} Suppliers</p>
          <p className="text-[10px] text-slate-500 mt-0.5">With Valid Registered GSTIN</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Table 7: B2C Small</p>
          <p className="text-xl font-black text-slate-900 mt-1">{counts?.b2cs || 0} Line Items</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Retail Counter Customers</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Table 9B: Credit Notes</p>
          <p className="text-xl font-black text-slate-900 mt-1">{(counts?.cdnr || 0) + (counts?.cdnur || 0)} Returns</p>
          <p className="text-[10px] text-slate-500 mt-0.5">CDNR & CDNUR Deductions</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Table 12: HSN Summary</p>
          <p className="text-xl font-black text-slate-900 mt-1">{counts?.hsnLines || 0} Codes</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Aggregated Quantities & Tax</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 md:col-span-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Table 13: Doc Count</p>
          <p className="text-xl font-black text-indigo-600 mt-1">{(counts?.invoices || 0) + (counts?.creditNotes || 0)} Docs</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Sequential Invoices & CNs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        {[
          { id: 'B2B', label: `Table 4: B2B Invoices (${counts?.b2b || 0})` },
          { id: 'B2CS', label: `Table 7: B2C Small (${counts?.b2cs || 0})` },
          { id: 'CDNR', label: `Table 9B: Credit Notes (${(counts?.cdnr || 0) + (counts?.cdnur || 0)})` },
          { id: 'HSN', label: `Table 12: HSN Summary (${counts?.hsnLines || 0})` },
          { id: 'DOCS', label: `Table 13: Document Register` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Compiling official GSTN GSTR-1 payload...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* TAB 1: B2B */}
          {activeTab === 'B2B' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Customer GSTIN</th>
                    <th className="p-3.5">Invoice No</th>
                    <th className="p-3.5">Invoice Date</th>
                    <th className="p-3.5">Invoice Value</th>
                    <th className="p-3.5">Place of Supply</th>
                    <th className="p-3.5">Reverse Charge</th>
                    <th className="p-3.5">Taxable Value</th>
                    <th className="p-3.5">IGST</th>
                    <th className="p-3.5">CGST</th>
                    <th className="p-3.5">SGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!payload?.b2b || payload.b2b.length === 0) ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No registered B2B tax invoices recorded for this tax period.
                      </td>
                    </tr>
                  ) : (
                    payload.b2b.flatMap((entry: any, iIdx: number) =>
                      (entry.inv || []).flatMap((inv: any, jIdx: number) =>
                        (inv.items || []).map((it: any, kIdx: number) => (
                          <tr key={`${iIdx}-${jIdx}-${kIdx}`} className="hover:bg-slate-50/60 font-medium text-slate-800">
                            <td className="p-3.5 font-mono font-bold text-indigo-600">{entry.ctin}</td>
                            <td className="p-3.5 font-mono">{inv.inum}</td>
                            <td className="p-3.5">{inv.idt}</td>
                            <td className="p-3.5 font-bold">₹{Number(inv.val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3.5">{inv.pos}</td>
                            <td className="p-3.5">{inv.rchrg}</td>
                            <td className="p-3.5">₹{Number(it.itms_det?.txval || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3.5">₹{Number(it.itms_det?.iamt || 0).toFixed(2)}</td>
                            <td className="p-3.5">₹{Number(it.itms_det?.camt || 0).toFixed(2)}</td>
                            <td className="p-3.5">₹{Number(it.itms_det?.samt || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: B2CS */}
          {activeTab === 'B2CS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Place of Supply</th>
                    <th className="p-3.5">GST Rate (%)</th>
                    <th className="p-3.5">Taxable Value</th>
                    <th className="p-3.5">IGST</th>
                    <th className="p-3.5">CGST</th>
                    <th className="p-3.5">SGST</th>
                    <th className="p-3.5">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!payload?.b2cs || payload.b2cs.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No retail B2C consumer invoices found for this period.
                      </td>
                    </tr>
                  ) : (
                    payload.b2cs.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 font-medium text-slate-800">
                        <td className="p-3.5 font-bold text-slate-600">{item.sply_ty || 'INTRA'}</td>
                        <td className="p-3.5">{item.pos}</td>
                        <td className="p-3.5 font-bold text-indigo-600">{item.rt}%</td>
                        <td className="p-3.5 font-bold">₹{Number(item.txval || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3.5">₹{Number(item.iamt || 0).toFixed(2)}</td>
                        <td className="p-3.5">₹{Number(item.camt || 0).toFixed(2)}</td>
                        <td className="p-3.5">₹{Number(item.samt || 0).toFixed(2)}</td>
                        <td className="p-3.5">₹{Number(item.csamt || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: CDNR / CDNUR */}
          {activeTab === 'CDNR' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Customer / GSTIN</th>
                    <th className="p-3.5">Credit Note No</th>
                    <th className="p-3.5">Note Date</th>
                    <th className="p-3.5">Note Value</th>
                    <th className="p-3.5">Note Type</th>
                    <th className="p-3.5">Taxable Value</th>
                    <th className="p-3.5">CGST</th>
                    <th className="p-3.5">SGST</th>
                    <th className="p-3.5">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((!payload?.cdnr || payload.cdnr.length === 0) && (!payload?.cdnur || payload.cdnur.length === 0)) ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No Credit / Debit notes issued during this period.
                      </td>
                    </tr>
                  ) : (
                    [
                      ...(payload?.cdnr || []).flatMap((c: any) =>
                        (c.nt || []).map((nt: any) => ({ ...nt, ctin: c.ctin, isRegistered: true }))
                      ),
                      ...(payload?.cdnur || []).map((nt: any) => ({ ...nt, ctin: 'UNREGISTERED', isRegistered: false })),
                    ].map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 font-medium text-slate-800">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{row.ctin}</td>
                        <td className="p-3.5 font-mono">{row.nt_num}</td>
                        <td className="p-3.5">{row.nt_dt}</td>
                        <td className="p-3.5 font-bold text-rose-600">₹{Number(row.val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3.5">{row.ntty || 'C'}</td>
                        <td className="p-3.5">₹{Number(row.items?.[0]?.itms_det?.txval || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3.5">₹{Number(row.items?.[0]?.itms_det?.camt || 0).toFixed(2)}</td>
                        <td className="p-3.5">₹{Number(row.items?.[0]?.itms_det?.samt || 0).toFixed(2)}</td>
                        <td className="p-3.5">₹{Number(row.items?.[0]?.itms_det?.iamt || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: HSN */}
          {activeTab === 'HSN' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">HSN Code</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">UQC</th>
                    <th className="p-3.5">Total Qty</th>
                    <th className="p-3.5">Total Value</th>
                    <th className="p-3.5">Taxable Value</th>
                    <th className="p-3.5">IGST</th>
                    <th className="p-3.5">CGST</th>
                    <th className="p-3.5">SGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!payload?.hsn?.data || payload.hsn.data.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No HSN summary data generated.
                      </td>
                    </tr>
                  ) : (
                    payload.hsn.data.map((h: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 font-medium text-slate-800">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{h.hsn_sc}</td>
                        <td className="p-3.5">{h.desc || 'General Goods'}</td>
                        <td className="p-3.5">{h.uqc || 'NOS'}</td>
                        <td className="p-3.5 font-bold">{h.qty}</td>
                        <td className="p-3.5 font-bold">₹{Number(h.val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3.5">₹{Number(h.txval || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3.5">₹{Number(h.iamt || 0).toFixed(2)}</td>
                        <td className="p-3.5">₹{Number(h.camt || 0).toFixed(2)}</td>
                        <td className="p-3.5">₹{Number(h.samt || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: DOCS */}
          {activeTab === 'DOCS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Document Type</th>
                    <th className="p-3.5">From Serial No</th>
                    <th className="p-3.5">To Serial No</th>
                    <th className="p-3.5">Total Count</th>
                    <th className="p-3.5">Cancelled Count</th>
                    <th className="p-3.5">Net Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!payload?.doc_issue?.doc_det || payload.doc_issue.doc_det.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No sequential documents registered.
                      </td>
                    </tr>
                  ) : (
                    payload.doc_issue.doc_det.flatMap((doc: any) =>
                      (doc.docs || []).map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60 font-medium text-slate-800">
                          <td className="p-3.5 font-bold text-slate-800">
                            {doc.doc_num === 1 ? 'Invoices for Outward Supply' : 'Credit Notes'}
                          </td>
                          <td className="p-3.5 font-mono">{d.from}</td>
                          <td className="p-3.5 font-mono">{d.to}</td>
                          <td className="p-3.5 font-bold">{d.totnum}</td>
                          <td className="p-3.5 text-rose-600">{d.canc || 0}</td>
                          <td className="p-3.5 font-bold text-emerald-600">{d.net_issue}</td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
