'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Scale,
  Calendar,
  CreditCard,
  Building2,
  Trash2,
} from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  classification: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
}

interface VoucherLine {
  accountId: string;
  account?: Account;
  debit: number;
  credit: number;
  narration?: string;
}

interface Voucher {
  id: string;
  voucherNumber: string;
  voucherType: 'PAYMENT' | 'RECEIPT' | 'CONTRA' | 'JOURNAL';
  date: string;
  narration: string;
  referenceNo?: string;
  totalAmount: number;
  lines: VoucherLine[];
  createdAt: string;
}

const TYPE_CONFIG = {
  PAYMENT: {
    label: 'Payment (PV)',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: TrendingDown,
    color: 'text-rose-600',
    title: 'PAYMENT VOUCHER',
  },
  RECEIPT: {
    label: 'Receipt (RV)',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: TrendingUp,
    color: 'text-emerald-600',
    title: 'RECEIPT VOUCHER',
  },
  CONTRA: {
    label: 'Contra (CV)',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: ArrowRightLeft,
    color: 'text-blue-600',
    title: 'CONTRA VOUCHER',
  },
  JOURNAL: {
    label: 'Journal (JV)',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Scale,
    color: 'text-purple-600',
    title: 'JOURNAL VOUCHER',
  },
};

export default function AccountingVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVoucherForSlip, setSelectedVoucherForSlip] = useState<Voucher | null>(null);

  // Modal State
  const [voucherType, setVoucherType] = useState<'PAYMENT' | 'RECEIPT' | 'CONTRA' | 'JOURNAL'>('PAYMENT');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Simplified Form Fields (for PV, RV, CV)
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [amount, setAmount] = useState('');

  // Multi-line Journal Fields (for JV)
  const [journalLines, setJournalLines] = useState<
    Array<{ accountId: string; debit: string; credit: string; narration: string }>
  >([
    { accountId: '', debit: '', credit: '', narration: '' },
    { accountId: '', debit: '', credit: '', narration: '' },
  ]);

  // Load Accounts & Vouchers
  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, vchRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/accounting/vouchers'),
      ]);

      const accData = await accRes.json();
      const vchData = await vchRes.json();

      if (accData.success) {
        setAccounts(accData.accounts || []);
      }
      if (vchData.success) {
        setVouchers(vchData.vouchers || []);
      }
    } catch (err) {
      console.error('Failed to load accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered cash & bank accounts (Assets)
  const cashAndBankAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.classification === 'ASSET' &&
        (a.name.toLowerCase().includes('cash') ||
          a.name.toLowerCase().includes('bank') ||
          a.name.toLowerCase().includes('petty') ||
          a.name.toLowerCase().includes('hdfc') ||
          a.name.toLowerCase().includes('sbi') ||
          a.code.startsWith('10'))
    );
  }, [accounts]);

  // Filtered expense & payable accounts
  const expenseAndLiabilityAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.classification === 'EXPENSE' || a.classification === 'LIABILITY'
    );
  }, [accounts]);

  // Filtered revenue & receivable accounts
  const revenueAndAssetAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.classification === 'REVENUE' || a.classification === 'ASSET'
    );
  }, [accounts]);

  // JV Balance Calculation
  const { jvTotalDebit, jvTotalCredit, isJvBalanced, jvDiff } = useMemo(() => {
    let deb = 0;
    let cred = 0;
    journalLines.forEach((l) => {
      deb += Number(l.debit || 0);
      cred += Number(l.credit || 0);
    });
    const diff = Math.abs(deb - cred);
    return {
      jvTotalDebit: deb,
      jvTotalCredit: cred,
      isJvBalanced: deb > 0 && diff < 0.01,
      jvDiff: diff,
    };
  }, [journalLines]);

  // Handle Quick Add Line in JV
  const handleAddJournalLine = () => {
    setJournalLines((prev) => [
      ...prev,
      { accountId: '', debit: '', credit: '', narration: '' },
    ]);
  };

  // Handle Remove Line in JV
  const handleRemoveJournalLine = (index: number) => {
    if (journalLines.length <= 2) return;
    setJournalLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Submit Voucher
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      let linesPayload: Array<{ accountId: string; debit: number; credit: number; narration?: string }> = [];

      if (voucherType === 'PAYMENT') {
        if (!sourceAccountId || !destAccountId || !amount || Number(amount) <= 0) {
          throw new Error('Please select both Paid-From and Expense accounts and enter a valid amount.');
        }
        if (sourceAccountId === destAccountId) {
          throw new Error('Paid-From and Expense accounts must be different.');
        }
        const val = Number(amount);
        linesPayload = [
          { accountId: destAccountId, debit: val, credit: 0, narration: narration || 'Expense/Vendor payment' },
          { accountId: sourceAccountId, debit: 0, credit: val, narration: referenceNo ? `Ref: ${referenceNo}` : 'Paid via Cash/Bank' },
        ];
      } else if (voucherType === 'RECEIPT') {
        if (!sourceAccountId || !destAccountId || !amount || Number(amount) <= 0) {
          throw new Error('Please select Deposited-To and Income accounts and enter a valid amount.');
        }
        if (sourceAccountId === destAccountId) {
          throw new Error('Deposited-To and Income accounts must be different.');
        }
        const val = Number(amount);
        linesPayload = [
          { accountId: destAccountId, debit: val, credit: 0, narration: referenceNo ? `Ref: ${referenceNo}` : 'Received in Cash/Bank' },
          { accountId: sourceAccountId, debit: 0, credit: val, narration: narration || 'Income/Customer receipt' },
        ];
      } else if (voucherType === 'CONTRA') {
        if (!sourceAccountId || !destAccountId || !amount || Number(amount) <= 0) {
          throw new Error('Please select Source and Destination accounts and enter a valid amount.');
        }
        if (sourceAccountId === destAccountId) {
          throw new Error('Source and Destination accounts must be different in a Contra transfer.');
        }
        const val = Number(amount);
        linesPayload = [
          { accountId: destAccountId, debit: val, credit: 0, narration: 'Transferred to account' },
          { accountId: sourceAccountId, debit: 0, credit: val, narration: 'Transferred from account' },
        ];
      } else if (voucherType === 'JOURNAL') {
        if (!isJvBalanced) {
          throw new Error(`Journal voucher is unbalanced! Debits: ₹${jvTotalDebit.toFixed(2)}, Credits: ₹${jvTotalCredit.toFixed(2)}`);
        }
        linesPayload = journalLines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0),
            narration: l.narration || undefined,
          }));

        if (linesPayload.length < 2) {
          throw new Error('At least two valid ledger rows are required.');
        }
      }

      const res = await fetch('/api/accounting/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherType,
          date: voucherDate,
          narration: narration.trim() || `${TYPE_CONFIG[voucherType].label} entry`,
          referenceNo: referenceNo.trim() || undefined,
          lines: linesPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create voucher');
      }

      setShowCreateModal(false);
      // Reset form
      setAmount('');
      setSourceAccountId('');
      setDestAccountId('');
      setReferenceNo('');
      setNarration('');
      setJournalLines([
        { accountId: '', debit: '', credit: '', narration: '' },
        { accountId: '', debit: '', credit: '', narration: '' },
      ]);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error recording voucher');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Vouchers List
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchType = activeFilter === 'ALL' || v.voucherType === activeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        v.voucherNumber.toLowerCase().includes(q) ||
        v.narration.toLowerCase().includes(q) ||
        (v.referenceNo && v.referenceNo.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [vouchers, activeFilter, searchQuery]);

  // KPI calculations
  const kpis = useMemo(() => {
    let payments = 0;
    let receipts = 0;
    let contra = 0;
    let journals = 0;

    vouchers.forEach((v) => {
      const amt = Number(v.totalAmount || 0);
      if (v.voucherType === 'PAYMENT') payments += amt;
      else if (v.voucherType === 'RECEIPT') receipts += amt;
      else if (v.voucherType === 'CONTRA') contra += amt;
      else if (v.voucherType === 'JOURNAL') journals += amt;
    });

    return { payments, receipts, contra, journals, totalCount: vouchers.length };
  }, [vouchers]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Landmark className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Accounting Vouchers & Transactions
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Double-entry financial vouchers (Payment, Receipt, Contra, and General Journal entries).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Record New Voucher</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Payments (PV)</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900">₹{kpis.payments.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">Expense & vendor outflows</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Receipts (RV)</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900">₹{kpis.receipts.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">Incomes & customer inflows</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contra Transfers (CV)</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900">₹{kpis.contra.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">Cash ⟷ Bank transfers</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Journal Entries (JV)</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900">₹{kpis.journals.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">{kpis.totalCount} total vouchers recorded</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        {/* Type Filter Buttons */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {['ALL', 'PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeFilter === t
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL' ? 'All Vouchers' : TYPE_CONFIG[t as keyof typeof TYPE_CONFIG].label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voucher # or narration..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-indigo-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">Voucher #</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Narration & Reference</th>
                <th className="py-3 px-4 font-bold">Accounts Involved</th>
                <th className="py-3 px-4 font-bold text-right">Amount (₹)</th>
                <th className="py-3 px-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading accounting vouchers...</span>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No vouchers found</p>
                    <p className="text-[11px] mt-1">Click &quot;Record New Voucher&quot; to add your first transaction.</p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const cfg = TYPE_CONFIG[v.voucherType];
                  const Icon = cfg.icon;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-indigo-600">
                        {v.voucherNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(v.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        <p className="font-semibold text-slate-800 truncate">{v.narration}</p>
                        {v.referenceNo && (
                          <p className="text-[10px] text-slate-400 truncate">Ref: {v.referenceNo}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {v.lines.map((l, i) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                l.debit > 0
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {l.account?.name || 'Ledger'}: {l.debit > 0 ? `Dr ₹${l.debit}` : `Cr ₹${l.credit}`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 text-right whitespace-nowrap">
                        ₹{Number(v.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedVoucherForSlip(v)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] shadow-2xs transition"
                        >
                          <Printer className="h-3 w-3 text-slate-500" />
                          <span>Print Slip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE VOUCHER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">Record Accounting Voucher</h2>
                <p className="text-xs text-slate-500">Atomic double-entry transaction posting to Chart of Accounts</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Voucher Type Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-3 bg-slate-50 border-b border-slate-100">
              {(['PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL'] as const).map((t) => {
                const cfg = TYPE_CONFIG[t];
                const Icon = cfg.icon;
                const isSelected = voucherType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setVoucherType(t);
                      setFormError(null);
                    }}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span className="text-[11px] truncate">{cfg.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Content */}
            <form onSubmit={handleCreateVoucher} className="p-5 space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Common Date & Reference Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Voucher Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Reference / Cheque / UTR #
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. UTR-982103, CHQ-00129"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* PAYMENT VOUCHER FORM */}
              {voucherType === 'PAYMENT' && (
                <div className="space-y-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Paid From Account (Credit Cash / Bank) *
                    </label>
                    <select
                      required
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="">Select Cash in Hand or Bank Account...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.code}] {a.name} ({a.classification} • Bal: ₹{Number(a.balance).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Paid To Account (Debit Expense / Vendor / Liability) *
                    </label>
                    <select
                      required
                      value={destAccountId}
                      onChange={(e) => setDestAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="">Select Expense or Payable Account...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.code}] {a.name} ({a.classification})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Payment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* RECEIPT VOUCHER FORM */}
              {voucherType === 'RECEIPT' && (
                <div className="space-y-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Deposited Into Account (Debit Cash / Bank) *
                    </label>
                    <select
                      required
                      value={destAccountId}
                      onChange={(e) => setDestAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="">Select Cash in Hand or Bank Account...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.code}] {a.name} ({a.classification} • Bal: ₹{Number(a.balance).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Received From Account (Credit Revenue / Debtor / Customer) *
                    </label>
                    <select
                      required
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="">Select Revenue or Customer Account...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.code}] {a.name} ({a.classification})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Receipt Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CONTRA VOUCHER FORM */}
              {voucherType === 'CONTRA' && (
                <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Source Account (Credit - e.g. Cash in Hand) *
                    </label>
                    <select
                      required
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="">Select Source Cash/Bank...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.code}] {a.name} ({a.classification} • Bal: ₹{Number(a.balance).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Destination Account (Debit - e.g. Bank Account) *
                    </label>
                    <select
                      required
                      value={destAccountId}
                      onChange={(e) => setDestAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="">Select Destination Bank/Cash...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.code}] {a.name} ({a.classification} • Bal: ₹{Number(a.balance).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Transfer Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* MULTI-LINE JOURNAL VOUCHER (JV) */}
              {voucherType === 'JOURNAL' && (
                <div className="space-y-3 bg-purple-50/40 p-4 rounded-2xl border border-purple-100">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-bold text-slate-700 uppercase">Double-Entry Ledger Lines</span>
                    <button
                      type="button"
                      onClick={handleAddJournalLine}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Ledger Row</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {journalLines.map((row, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200">
                        <div className="flex-1 min-w-0">
                          <select
                            required
                            value={row.accountId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJournalLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, accountId: val } : l))
                              );
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                          >
                            <option value="">Select Ledger Account...</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                [{a.code}] {a.name} ({a.classification})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Dr (₹)"
                            value={row.debit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJournalLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, debit: val, credit: val ? '' : l.credit } : l
                                )
                              );
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-emerald-700 focus:outline-none"
                          />
                        </div>

                        <div className="w-24">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Cr (₹)"
                            value={row.credit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJournalLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, credit: val, debit: val ? '' : l.debit } : l
                                )
                              );
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                          />
                        </div>

                        {journalLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveJournalLine(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Balance Tally Bar */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold ${
                      isJvBalanced
                        ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100/70 text-amber-900 border border-amber-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span>Total Debit: ₹{jvTotalDebit.toFixed(2)}</span>
                      <span>•</span>
                      <span>Total Credit: ₹{jvTotalCredit.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {isJvBalanced ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                          <span>Balanced</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-amber-700" />
                          <span>Unbalanced (Diff: ₹{jvDiff.toFixed(2)})</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Narration Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Narration / Purpose Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="e.g. Shop electricity bill payment for September 2026 via NEFT"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (voucherType === 'JOURNAL' && !isJvBalanced)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Posting to Ledgers...' : 'Post & Save Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOUCHER SLIP VIEW / PRINT MODAL */}
      {selectedVoucherForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Official Voucher Slip
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-2xs transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSelectedVoucherForSlip(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Slip Printable Body */}
            <div className="space-y-4 border-2 border-slate-800 p-5 rounded-xl bg-white text-slate-900">
              {/* Slip Header */}
              <div className="text-center border-b border-slate-300 pb-3">
                <h3 className="text-base font-black tracking-wide uppercase">
                  {TYPE_CONFIG[selectedVoucherForSlip.voucherType].title}
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  SmartVyapar Accounting System
                </p>
              </div>

              {/* Metadata row */}
              <div className="grid grid-cols-2 text-xs gap-2 py-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">Voucher Number</span>
                  <span className="font-extrabold text-sm">{selectedVoucherForSlip.voucherNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Date</span>
                  <span className="font-bold">
                    {new Date(selectedVoucherForSlip.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {selectedVoucherForSlip.referenceNo && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px]">Reference / UTR / Cheque</span>
                    <span className="font-semibold text-xs">{selectedVoucherForSlip.referenceNo}</span>
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border-collapse text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase">
                    <th className="p-2 border-r border-slate-300">Particulars / Account</th>
                    <th className="p-2 text-right border-r border-slate-300 w-24">Debit (₹)</th>
                    <th className="p-2 text-right w-24">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedVoucherForSlip.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="p-2 border-r border-slate-300">
                        <span className="font-bold block">[{l.account?.code}] {l.account?.name}</span>
                        {l.narration && <span className="text-[10px] text-slate-500 block">{l.narration}</span>}
                      </td>
                      <td className="p-2 text-right font-bold border-r border-slate-300">
                        {l.debit > 0 ? `₹${Number(l.debit).toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2 text-right font-bold">
                        {l.credit > 0 ? `₹${Number(l.credit).toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black border-t-2 border-slate-400">
                    <td className="p-2 border-r border-slate-300">Total</td>
                    <td className="p-2 text-right border-r border-slate-300">
                      ₹{Number(selectedVoucherForSlip.totalAmount).toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      ₹{Number(selectedVoucherForSlip.totalAmount).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Narration */}
              <div className="text-xs pt-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Narration:</span>
                <p className="italic text-slate-700">&quot;{selectedVoucherForSlip.narration}&quot;</p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-10 text-center text-[10px] font-bold text-slate-600">
                <div className="border-t border-slate-400 pt-1">
                  <span>Prepared By</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <span>Checked & Verified</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <span>Authorised Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
