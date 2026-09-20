'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Download,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Scale,
  DollarSign,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';

export default function Gstr3bPreparationPage() {
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchGstr3b = async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/gst/gstr-3b?period=${selectedPeriod}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to compute GSTR-3B');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching GSTR-3B');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGstr3b(period);
  }, [period]);

  const handleSaveDraft = async () => {
    if (!data?.report) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/gst/gstr-3b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          report: data.report,
          filingStatus: 'READY_TO_FILE',
        }),
      });
      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to save');
      }
      setSaveMessage('GSTR-3B return draft saved to database successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadJson = () => {
    if (!data?.report) return;
    const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR3B_${data.report.tenantGstin || 'PORTAL'}_${period}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const report = data?.report;
  const t31 = report?.table31?.taxableOutward;
  const t4 = report?.table4?.netItc;
  const t61 = report?.table61;

  const totalOutputTax = (t31?.iamt || 0) + (t31?.camt || 0) + (t31?.samt || 0);
  const totalItcAvailable = (t4?.iamt || 0) + (t4?.camt || 0) + (t4?.samt || 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                GSTR-3B Tax Return Preparation Assistant
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Auto-computed Table 3.1 Outward Liability, Table 4 Input Tax Credit (ITC), & Rule 88A Setoff Math
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Filing Period:</span>
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
            onClick={() => fetchGstr3b(period)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={!data || saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft Return'}
          </button>

          <button
            onClick={handleDownloadJson}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download GSTR-3B JSON
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Outward Tax</span>
          <p className="text-2xl font-black text-slate-900 mt-2">
            ₹{totalOutputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-2 text-[10px] text-slate-500 font-mono mt-1">
            <span>IGST: ₹{t31?.iamt?.toFixed(2) || '0.00'}</span>
            <span>• CGST: ₹{t31?.camt?.toFixed(2) || '0.00'}</span>
            <span>• SGST: ₹{t31?.samt?.toFixed(2) || '0.00'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Eligible ITC (Table 4)</span>
            {data?.metadata?.has2bReconciliation && (
              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded">GSTR-2B MATCHED</span>
            )}
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            ₹{totalItcAvailable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-2 text-[10px] text-slate-500 font-mono mt-1">
            <span>IGST: ₹{t4?.iamt?.toFixed(2) || '0.00'}</span>
            <span>• CGST: ₹{t4?.camt?.toFixed(2) || '0.00'}</span>
            <span>• SGST: ₹{t4?.samt?.toFixed(2) || '0.00'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ITC Setoff (Rule 88A)</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            ₹{(totalOutputTax - (t61?.taxPaidInCash?.total || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">100% Legal Utilization Ratio</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Cash Payable (Challan)</span>
          <p className="text-2xl font-black text-rose-600 mt-2">
            ₹{Number(t61?.taxPaidInCash?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Via PMT-06 Electronic Cash Ledger</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Synthesizing sales ledger and purchase input tax credits...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: Table 3.1 Details of Outward Supplies */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  3.1 Details of Outward Supplies & Inward Supplies liable to Reverse Charge
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">GST Form GSTR-3B Table 3.1</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Nature of Supply</th>
                    <th className="p-3.5 text-right">Total Taxable Value</th>
                    <th className="p-3.5 text-right">Integrated Tax (IGST)</th>
                    <th className="p-3.5 text-right">Central Tax (CGST)</th>
                    <th className="p-3.5 text-right">State Tax (SGST)</th>
                    <th className="p-3.5 text-right">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-800">
                      (a) Outward Taxable Supplies (other than zero rated, nil rated and exempted)
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold">
                      ₹{t31?.txval?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-indigo-600">₹{t31?.iamt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-700">₹{t31?.camt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-700">₹{t31?.samt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-400">₹0.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 text-slate-400">
                    <td className="p-3.5">(b) Outward Taxable Supplies (Zero Rated)</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">-</td>
                    <td className="p-3.5 text-right font-mono">-</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 text-slate-400">
                    <td className="p-3.5">(c) Other Outward Supplies (Nil Rated, Exempted)</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">-</td>
                    <td className="p-3.5 text-right font-mono">-</td>
                    <td className="p-3.5 text-right font-mono">-</td>
                    <td className="p-3.5 text-right font-mono">-</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 text-slate-400">
                    <td className="p-3.5">(d) Inward Supplies Liable to Reverse Charge (RCM)</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                  </tr>
                  <tr className="bg-slate-50/80 font-black text-slate-900 border-t border-slate-200">
                    <td className="p-3.5 uppercase tracking-wider">Total Outward Tax Liability</td>
                    <td className="p-3.5 text-right font-mono">
                      ₹{t31?.txval?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-indigo-700">₹{t31?.iamt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-900">₹{t31?.camt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-900">₹{t31?.samt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: Table 4 Eligible Input Tax Credit (ITC) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  4. Eligible Input Tax Credit (ITC)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">GST Form GSTR-3B Table 4</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Details</th>
                    <th className="p-3.5 text-right">Integrated Tax (IGST)</th>
                    <th className="p-3.5 text-right">Central Tax (CGST)</th>
                    <th className="p-3.5 text-right">State Tax (SGST)</th>
                    <th className="p-3.5 text-right">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-800">
                      (A) (5) All other ITC (Purchase Bills + Reconciled GSTR-2B)
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-indigo-600">₹{t4?.iamt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600">₹{t4?.camt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600">₹{t4?.samt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-400">₹0.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 text-slate-400">
                    <td className="p-3.5">(B) ITC Reversed (Rule 42 & 43)</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                  </tr>
                  <tr className="bg-slate-50/80 font-black text-slate-900 border-t border-slate-200">
                    <td className="p-3.5 uppercase tracking-wider">(C) Net ITC Available (A) - (B)</td>
                    <td className="p-3.5 text-right font-mono text-indigo-700">₹{t4?.iamt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">₹{t4?.camt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">₹{t4?.samt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: Table 6.1 Payment of Tax (Rule 88A Optimization) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  6.1 Payment of Tax (Rule 88A Electronic Credit Ledger Offset & Cash Challan)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">GST Form GSTR-3B Table 6.1</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Tax Head</th>
                    <th className="p-3.5 text-right">Tax Payable</th>
                    <th className="p-3.5 text-right">Paid by IGST Credit</th>
                    <th className="p-3.5 text-right">Paid by CGST Credit</th>
                    <th className="p-3.5 text-right">Paid by SGST Credit</th>
                    <th className="p-3.5 text-right font-black text-rose-600">Tax Paid in Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-indigo-700">Integrated Tax (IGST)</td>
                    <td className="p-3.5 text-right font-mono font-bold">₹{t61?.taxPayable?.iamt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">₹{t61?.paidThroughItc?.igstPaidWith?.igst?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">₹{t61?.paidThroughItc?.igstPaidWith?.cgst?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">₹{t61?.paidThroughItc?.igstPaidWith?.sgst?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600">₹{t61?.taxPaidInCash?.iamt?.toFixed(2) || '0.00'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-800">Central Tax (CGST)</td>
                    <td className="p-3.5 text-right font-mono font-bold">₹{t61?.taxPayable?.camt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">₹{t61?.paidThroughItc?.cgstPaidWith?.igst?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">₹{t61?.paidThroughItc?.cgstPaidWith?.cgst?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-300">- (Blocked)</td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600">₹{t61?.taxPaidInCash?.camt?.toFixed(2) || '0.00'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-800">State Tax (SGST)</td>
                    <td className="p-3.5 text-right font-mono font-bold">₹{t61?.taxPayable?.samt?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">₹{t61?.paidThroughItc?.sgstPaidWith?.igst?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-300">- (Blocked)</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">₹{t61?.paidThroughItc?.sgstPaidWith?.sgst?.toFixed(2) || '0.00'}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600">₹{t61?.taxPaidInCash?.samt?.toFixed(2) || '0.00'}</td>
                  </tr>
                  <tr className="bg-slate-50/80 font-black text-slate-900 border-t border-slate-200">
                    <td className="p-3.5 uppercase tracking-wider">Total Net Cash Liability</td>
                    <td className="p-3.5 text-right font-mono">
                      ₹{((t61?.taxPayable?.iamt || 0) + (t61?.taxPayable?.camt || 0) + (t61?.taxPayable?.samt || 0)).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-700" colSpan={3}>
                      Total Credit Utilized: ₹{(totalOutputTax - (t61?.taxPaidInCash?.total || 0)).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-700 text-sm">
                      ₹{Number(t61?.taxPaidInCash?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
