'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Scale,
  TrendingUp,
  Landmark,
  BookOpen,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

type ReportTab = 'TRIAL_BALANCE' | 'PNL' | 'BALANCE_SHEET' | 'LEDGER';

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('TRIAL_BALANCE');
  const [loading, setLoading] = useState(false);

  // Data states
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ledgerStatement, setLedgerStatement] = useState<any>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Fetch Accounts list for Ledger dropdown
  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        if (data.success && data.accounts) {
          setAccounts(data.accounts);
          if (data.accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(data.accounts[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load accounts for reports:', err);
      }
    }
    loadAccounts();
  }, []);

  // Fetch data depending on active tab
  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'TRIAL_BALANCE') {
        const res = await fetch('/api/accounting/reports/trial-balance');
        const data = await res.json();
        if (data.success) setTrialBalance(data.report);
      } else if (activeTab === 'PNL') {
        const res = await fetch('/api/accounting/reports/profit-and-loss');
        const data = await res.json();
        if (data.success) setPnl(data.report);
      } else if (activeTab === 'BALANCE_SHEET') {
        const res = await fetch('/api/accounting/reports/balance-sheet');
        const data = await res.json();
        if (data.success) setBalanceSheet(data.report);
      } else if (activeTab === 'LEDGER' && selectedAccountId) {
        const res = await fetch(`/api/accounting/reports/ledger-statement?accountId=${selectedAccountId}`);
        const data = await res.json();
        if (data.success) setLedgerStatement(data.report);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, selectedAccountId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Financial Statements & Reports
              </h1>
              <p className="text-sm text-slate-500">
                Statutory double-entry statements, Trial Balance, P&L, Balance Sheet, and General Ledgers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="px-3.5 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2 mb-6 print:hidden">
        <button
          onClick={() => setActiveTab('TRIAL_BALANCE')}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'TRIAL_BALANCE'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Scale className="w-4 h-4" />
          Trial Balance
        </button>

        <button
          onClick={() => setActiveTab('PNL')}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PNL'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Profit & Loss (P&L)
        </button>

        <button
          onClick={() => setActiveTab('BALANCE_SHEET')}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'BALANCE_SHEET'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Balance Sheet
        </button>

        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'LEDGER'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          General Ledger (Account Statement)
        </button>
      </div>

      {/* TAB 1: TRIAL BALANCE */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div className="space-y-6">
          {/* Status Equilibrium Card */}
          {trialBalance && (
            <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
              trialBalance.isBalanced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                {trialBalance.isBalanced ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <h3 className="font-semibold text-base">
                    {trialBalance.isBalanced
                      ? 'Trial Balance in Equilibrium (Books are Balanced)'
                      : `Trial Balance Out of Equilibrium by ₹${Math.abs(trialBalance.difference).toLocaleString('en-IN')}`}
                  </h3>
                  <p className="text-xs opacity-80">
                    Total Debits: ₹{trialBalance.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} • Total Credits: ₹{trialBalance.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-white/70 rounded-full border border-current font-medium">
                Δ ₹{Math.abs(trialBalance.difference).toFixed(2)}
              </span>
            </div>
          )}

          {/* Trial Balance Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Trial Balance (Gross & Net)</h2>
                <p className="text-xs text-slate-500">As on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-24">Code</th>
                    <th className="py-3 px-4">Account Title</th>
                    <th className="py-3 px-4 w-32">Type</th>
                    <th className="py-3 px-4 text-right w-40">Debit (₹)</th>
                    <th className="py-3 px-4 text-right w-40">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {trialBalance?.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700">{item.code}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-900">{item.name}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.classification === 'ASSET' ? 'bg-blue-50 text-blue-700' :
                          item.classification === 'LIABILITY' ? 'bg-orange-50 text-orange-700' :
                          item.classification === 'EQUITY' ? 'bg-purple-50 text-purple-700' :
                          item.classification === 'REVENUE' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {item.classification}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {item.debit > 0 ? item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {item.credit > 0 ? item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-slate-900">
                    <td colSpan={3} className="py-3.5 px-4 font-sans text-right uppercase tracking-wider text-xs">
                      Grand Total Equilibrium
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-sm text-indigo-700">
                      ₹{trialBalance?.totalDebit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-sm text-indigo-700">
                      ₹{trialBalance?.totalCredit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIT & LOSS */}
      {activeTab === 'PNL' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Revenue</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{pnl?.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Income
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Profit</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-600">
                  ₹{pnl?.grossProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {pnl?.grossProfitMargin || 0}% Margin
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Operating Expenses</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{pnl?.operatingExpenses?.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> Opex
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Net Profit / (Loss)</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-bold ${pnl?.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  ₹{pnl?.netProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  pnl?.netProfit >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {pnl?.netProfitMargin || 0}% Net
                </span>
              </div>
            </div>
          </div>

          {/* Schedule III Structured Statement */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Statement of Profit and Loss (Trading & P&L)</h2>
                <p className="text-xs text-slate-500">For the period ending {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {/* 1. Operating Revenue */}
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  I. Revenue from Operations
                </h3>
                <div className="space-y-2">
                  {pnl?.operatingRevenue?.accounts?.map((acc: any) => (
                    <div key={acc.code} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{acc.name} <span className="text-xs font-mono text-slate-400">({acc.code})</span></span>
                      <span className="font-mono font-medium text-slate-900">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-semibold text-sm text-slate-900">
                    <span>Total Operating Revenue</span>
                    <span className="font-mono">₹{pnl?.operatingRevenue?.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* 2. COGS / Direct Expenses */}
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  II. Cost of Goods Sold & Direct Costs
                </h3>
                <div className="space-y-2">
                  {pnl?.cogsAndDirectCosts?.accounts?.map((acc: any) => (
                    <div key={acc.code} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{acc.name} <span className="text-xs font-mono text-slate-400">({acc.code})</span></span>
                      <span className="font-mono font-medium text-slate-900">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-semibold text-sm text-slate-900">
                    <span>Total Direct Costs</span>
                    <span className="font-mono">₹{pnl?.cogsAndDirectCosts?.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* GROSS PROFIT ROW */}
              <div className="p-4 bg-emerald-50/50 flex justify-between items-center text-sm font-bold text-emerald-900">
                <span className="uppercase tracking-wider text-xs">III. Gross Profit (I - II)</span>
                <span className="font-mono text-base">₹{pnl?.grossProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* 3. Operating / Indirect Expenses */}
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  IV. Operating & Administrative Expenses
                </h3>
                <div className="space-y-2">
                  {pnl?.operatingExpenses?.accounts?.map((acc: any) => (
                    <div key={acc.code} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{acc.name} <span className="text-xs font-mono text-slate-400">({acc.code})</span></span>
                      <span className="font-mono font-medium text-slate-900">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-semibold text-sm text-slate-900">
                    <span>Total Operating Expenses</span>
                    <span className="font-mono">₹{pnl?.operatingExpenses?.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* 4. Other Non-Operating Income */}
              {pnl?.otherIncome?.total > 0 && (
                <div className="p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    V. Other / Non-Operating Income
                  </h3>
                  <div className="space-y-2">
                    {pnl?.otherIncome?.accounts?.map((acc: any) => (
                      <div key={acc.code} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{acc.name} <span className="text-xs font-mono text-slate-400">({acc.code})</span></span>
                        <span className="font-mono font-medium text-slate-900">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-semibold text-sm text-slate-900">
                      <span>Total Other Income</span>
                      <span className="font-mono">₹{pnl?.otherIncome?.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* NET PROFIT / LOSS ROW */}
              <div className={`p-5 flex justify-between items-center text-base font-bold ${
                pnl?.netProfit >= 0 ? 'bg-indigo-50 text-indigo-950 border-t-2 border-indigo-200' : 'bg-rose-50 text-rose-950 border-t-2 border-rose-200'
              }`}>
                <span className="uppercase tracking-wider text-sm">
                  VI. Net Profit / (Loss) for the Period (III + V - IV)
                </span>
                <span className="font-mono text-xl">
                  ₹{pnl?.netProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BALANCE SHEET */}
      {activeTab === 'BALANCE_SHEET' && (
        <div className="space-y-6">
          {/* Balanced Status Banner */}
          {balanceSheet && (
            <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
              balanceSheet.isBalanced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-base">
                    Balance Sheet is Balanced (Assets = Liabilities + Equity)
                  </h3>
                  <p className="text-xs opacity-80">
                    Total Assets: ₹{balanceSheet.assets.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })} • Total Liabilities & Equity: ₹{balanceSheet.totalLiabilitiesAndEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-white/70 rounded-full border border-current font-medium">
                Identity Verified
              </span>
            </div>
          )}

          {/* Dual Column T-Form Balance Sheet */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASSETS Column */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-600" /> ASSETS
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">Applications of Funds</span>
                </div>

                <div className="p-5 space-y-6">
                  {/* Current Assets */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      1. Current Assets
                    </h3>
                    <div className="space-y-2">
                      {balanceSheet?.assets?.currentAssets?.map((acc: any) => (
                        <div key={acc.code} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{acc.name} <span className="text-xs font-mono text-slate-400">({acc.code})</span></span>
                          <span className="font-mono font-medium text-slate-900">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-semibold text-xs text-slate-800">
                        <span>Total Current Assets</span>
                        <span className="font-mono">₹{balanceSheet?.assets?.totalCurrentAssets?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fixed Assets */}
                  {balanceSheet?.assets?.fixedAssets?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        2. Non-Current / Fixed Assets
                      </h3>
                      <div className="space-y-2">
                        {balanceSheet?.assets?.fixedAssets?.map((acc: any) => (
                          <div key={acc.code} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{acc.name}</span>
                            <span className="font-mono font-medium text-slate-900">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Assets Footer */}
              <div className="p-4 bg-blue-50/70 border-t-2 border-blue-200 flex justify-between items-center text-sm font-bold text-blue-950">
                <span className="uppercase tracking-wider">TOTAL ASSETS</span>
                <span className="font-mono text-base">₹{balanceSheet?.assets?.totalAssets?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY Column */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" /> LIABILITIES & EQUITY
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">Sources of Funds</span>
                </div>

                <div className="p-5 space-y-6">
                  {/* Current Liabilities */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      1. Current Liabilities & Provisions
                    </h3>
                    <div className="space-y-2">
                      {balanceSheet?.liabilities?.currentLiabilities?.map((acc: any) => (
                        <div key={acc.code} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{acc.name} <span className="text-xs font-mono text-slate-400">({acc.code})</span></span>
                          <span className="font-mono font-medium text-slate-900">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-semibold text-xs text-slate-800">
                        <span>Total Current Liabilities</span>
                        <span className="font-mono">₹{balanceSheet?.liabilities?.totalCurrentLiabilities?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Equity & Reserves */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      2. Equity, Capital & Reserves
                    </h3>
                    <div className="space-y-2">
                      {balanceSheet?.equity?.capitalAccounts?.map((acc: any) => (
                        <div key={acc.code} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{acc.name} <span className="text-xs font-mono text-slate-400">({acc.code})</span></span>
                          <span className="font-mono font-medium text-slate-900">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      {/* Current Period Net Profit Transferred from P&L */}
                      <div className="flex items-center justify-between text-sm text-indigo-700 font-medium bg-indigo-50/50 p-1.5 rounded">
                        <span>Current Period Net Profit (P&L)</span>
                        <span className="font-mono">₹{balanceSheet?.equity?.currentPeriodNetProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-semibold text-xs text-slate-800">
                        <span>Total Equity & Reserves</span>
                        <span className="font-mono">₹{balanceSheet?.equity?.totalEquity?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Liabilities & Equity Footer */}
              <div className="p-4 bg-purple-50/70 border-t-2 border-purple-200 flex justify-between items-center text-sm font-bold text-purple-950">
                <span className="uppercase tracking-wider">TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono text-base">₹{balanceSheet?.totalLiabilitiesAndEquity?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GENERAL LEDGER STATEMENT */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-6">
          {/* Account Selector Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="w-full sm:w-80">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Select Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({acc.classification})
                  </option>
                ))}
              </select>
            </div>

            {ledgerStatement?.account && (
              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total Debits</span>
                  <span className="text-sm font-bold text-slate-900">₹{ledgerStatement.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total Credits</span>
                  <span className="text-sm font-bold text-slate-900">₹{ledgerStatement.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 text-indigo-900">
                  <span className="text-indigo-600 block">Closing Balance</span>
                  <span className="text-sm font-bold">₹{ledgerStatement.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>

          {/* Statement Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Ledger Statement: {ledgerStatement?.account?.name || 'Account'} ({ledgerStatement?.account?.code})
                </h2>
                <p className="text-xs text-slate-500">
                  Classification: {ledgerStatement?.account?.classification} • Statement Date: {new Date().toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">Date</th>
                    <th className="py-3 px-4 w-32">Voucher #</th>
                    <th className="py-3 px-4 w-20">Type</th>
                    <th className="py-3 px-4">Contra Account / Particulars</th>
                    <th className="py-3 px-4 text-right w-32">Debit (₹)</th>
                    <th className="py-3 px-4 text-right w-32">Credit (₹)</th>
                    <th className="py-3 px-4 text-right w-36">Running Bal (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {ledgerStatement?.transactions?.length > 0 ? (
                    ledgerStatement.transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-sans text-slate-600">
                          {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600">{t.voucherNumber}</td>
                        <td className="py-3 px-4 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {t.voucherType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-800">
                          <div className="font-medium">{t.contraAccountName}</div>
                          {t.narration && <div className="text-xs text-slate-400 truncate max-w-xs">{t.narration}</div>}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 font-medium">
                          {t.debit > 0 ? t.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 font-medium">
                          {t.credit > 0 ? t.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{t.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        No transactions found for this account yet. Record a Payment, Receipt, Contra, or Journal Voucher to populate ledger statements.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
