'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Landmark,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  FileSpreadsheet,
  Check,
  Scale,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export default function BankReconciliationPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [toleranceDays, setToleranceDays] = useState<number>(3);
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load accounts
  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        if (data.success && data.accounts) {
          // Filter to bank/cash/asset accounts or all
          const bankAccounts = data.accounts.filter(
            (a: any) => a.classification === 'ASSET' || a.name.toLowerCase().includes('bank')
          );
          setAccounts(bankAccounts.length > 0 ? bankAccounts : data.accounts);
          if (bankAccounts.length > 0) {
            setSelectedAccountId(bankAccounts[0].id);
          } else if (data.accounts.length > 0) {
            setSelectedAccountId(data.accounts[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
      }
    }
    loadAccounts();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setError(null);
    };
    reader.readAsText(file);
  };

  const loadDemoCsv = () => {
    const today = new Date().toISOString().split('T')[0];
    const demo = `Date,Narration,Ref No,Withdrawal,Deposit,Balance
${today},NEFT PAYMENT SUPPLIER INWARD,REF-PUR-001,15000.00,,85000.00
${today},UPI CUSTOMER COUNTER SETTLEMENT,UPI-POS-889,,4200.00,89200.00
${today},BANK MONTHLY SMS SERVICE CHARGE,CHG-998,59.00,,89141.00`;
    setCsvContent(demo);
    setFileName('sample_hdfc_bank_statement.csv');
    setError(null);
  };

  const runReconciliation = async () => {
    if (!selectedAccountId) {
      setError('Please select a bank account.');
      return;
    }
    if (!csvContent.trim()) {
      setError('Please upload or load a bank statement CSV.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/accounting/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          csvContent,
          toleranceDays,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reconciliation failed.');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error running reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const report = result?.report;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-100">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Bank Reconciliation Statement (BRS)
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  AI Auto-Match
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Match bank statement transactions against ERP General Ledger journal entries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/accounting/reports"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5"
          >
            <Scale className="w-4 h-4 text-slate-500" />
            <span>Trial Balance & Ledger</span>
          </Link>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Bank Account Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Select Bank Account Ledger
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} — {acc.name} ({acc.classification})
                </option>
              ))}
            </select>
          </div>

          {/* Tolerance Days */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Date Tolerance (± Days)
            </label>
            <input
              type="number"
              min="0"
              max="15"
              value={toleranceDays}
              onChange={(e) => setToleranceDays(parseInt(e.target.value, 10) || 0)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Demo Button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={loadDemoCsv}
              className="w-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl p-2.5 flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Load Sample Bank Statement</span>
            </button>
          </div>
        </div>

        {/* File Upload Zone */}
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition mb-4">
          <input
            type="file"
            accept=".csv,.txt"
            id="csv-file-input"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
            <UploadCloud className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-xs font-bold text-slate-800">
              {fileName ? fileName : 'Upload Bank Statement (.CSV / .TXT)'}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Compatible with HDFC, SBI, ICICI, Axis & Standard NetBanking CSV exports
            </span>
          </label>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={runReconciliation}
          disabled={loading || !csvContent}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 transition"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing & Matching Transactions...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Run Automated Reconciliation</span>
            </>
          )}
        </button>
      </div>

      {/* Results Dashboard */}
      {report && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Bank Statement Balance</span>
              <div className="text-lg font-black text-slate-900 mt-1">
                ₹{report.bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Net from uploaded CSV</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Books Ledger Balance</span>
              <div className="text-lg font-black text-slate-900 mt-1">
                ₹{report.bookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">General Ledger Closing</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled Matched
              </span>
              <div className="text-lg font-black text-emerald-900 mt-1">
                {report.matchedCount} Items
              </div>
              <span className="text-[10px] text-emerald-700">100% matched date & amount</span>
            </div>

            <div
              className={`p-4 rounded-2xl border shadow-sm ${
                report.variance === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <span className="text-xs font-bold flex items-center gap-1">
                {report.variance === 0 ? 'Reconciliation Status' : 'Discrepancy / Variance'}
              </span>
              <div className="text-lg font-black mt-1">
                ₹{Math.abs(report.variance).toFixed(2)}
              </div>
              <span className="text-[10px] opacity-80">
                {report.variance === 0 ? 'Fully Reconciled & Balanced' : 'Unmatched items pending clearance'}
              </span>
            </div>
          </div>

          {/* Split Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank Statement Transactions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                <span>Bank Statement Transactions ({report.statementRows.length})</span>
                <span className="text-[10px] font-normal text-slate-400">From Uploaded Statement</span>
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {report.statementRows.map((s: any) => (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      s.status === 'MATCHED'
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                        : 'border-amber-200 bg-amber-50/50 text-amber-950'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{s.description}</div>
                      <div className="text-[10px] text-slate-500">
                        {s.date} • Ref: {s.referenceNo || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">
                        {s.credit > 0 ? (
                          <span className="text-emerald-700">+₹{s.credit.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-800">-₹{s.debit.toFixed(2)}</span>
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          s.status === 'MATCHED'
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {s.status === 'MATCHED' ? 'RECONCILED' : 'UNMATCHED IN BOOKS'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Book Ledger Transactions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                <span>ERP Book Ledger Entries ({report.bookRows.length})</span>
                <span className="text-[10px] font-normal text-slate-400">General Ledger Journal</span>
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {report.bookRows.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No posted ledger entries found in this bank account for the current period.
                  </div>
                ) : (
                  report.bookRows.map((b: any) => (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        b.status === 'MATCHED'
                          ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                          : 'border-slate-200 bg-slate-50/80 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{b.description}</div>
                        <div className="text-[10px] text-slate-500">
                          {b.date} • Ref: {b.referenceNo || 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold">
                          {b.debit > 0 ? (
                            <span className="text-emerald-700">+₹{b.debit.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-800">-₹{b.credit.toFixed(2)}</span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            b.status === 'MATCHED'
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {b.status === 'MATCHED' ? 'RECONCILED' : 'PENDING CLEARANCE'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
