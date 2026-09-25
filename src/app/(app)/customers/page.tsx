'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Phone,
  ArrowUpRight,
  RefreshCw,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Plus,
  X,
  Banknote,
  CreditCard,
  QrCode,
  TrendingDown,
  Star,
  UserPlus,
  ChevronRight,
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  gstin?: string;
  stateCode?: string;
  territory?: { name: string; zone?: string | null };
  outstandingBalance: number;
  loyaltyPoints: number;
  totalBills: number;
}

interface Summary {
  total: number;
  totalOutstanding: number;
  overdueCount: number;
  clearedCount: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
    const [territories, setTerritories] = useState<any[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add customer modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addGstin, setAddGstin] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addPincode, setAddPincode] = useState('');
  const [addStateCode, setAddStateCode] = useState('');
    const [addTerritoryId, setAddTerritoryId] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // Record Payment modal
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState('');
  const [payError, setPayError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = search ? `/api/customers?q=${encodeURIComponent(search)}` : '/api/customers';
      const res = await fetch(url);
        const tRes = await fetch('/api/territories');
        const tData = await tRes.json();
        if (tData.success) setTerritories(tData.territories || []);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    setAddError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          phone: addPhone,
          gstin: addGstin || undefined,
          email: addEmail || undefined,
          address: addAddress || undefined,
          pincode: addPincode || undefined,
          stateCode: addStateCode || undefined,
            territoryId: addTerritoryId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      setShowAddModal(false);
      setAddName(''); setAddPhone(''); setAddGstin(''); setAddEmail(''); setAddAddress(''); setAddPincode(''); setAddStateCode(''); setAddTerritoryId('');
      load();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddSaving(false);
    }
  };

  const openPayModal = (c: Customer) => {
    setPayCustomer(c);
    setPayAmount(c.outstandingBalance.toFixed(2));
    setPayMode('CASH');
    setPayNotes('');
    setPaySuccess('');
    setPayError('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer) return;
    setPayLoading(true);
    setPayError('');
    setPaySuccess('');
    try {
      const res = await fetch(`/api/customers/${payCustomer.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(payAmount), mode: payMode, notes: payNotes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to record payment');
      setPaySuccess(data.message);
      load();
      setTimeout(() => { setPayCustomer(null); setPaySuccess(''); }, 2200);
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const buildWhatsApp = (c: Customer) => {
    const phone = (c.phone || '').replace(/\D/g, '');
    const msg = `Hello *${c.name}*,\n\nThis is a gentle reminder from our store.\n\nYour current outstanding *Receivables balance is ₹${c.outstandingBalance.toFixed(2)}*.\n\nKindly clear at your earliest convenience.\n\nThank you! 🙏`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <span>Customer Accounts & Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Track customer profiles, credit balances, and loyalty points</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/customers/aging"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            Aging Report
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Customers</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{summary.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{summary.clearedCount} Cleared</p>
          </div>
          <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Total Receivables</p>
            <p className="text-2xl font-black text-rose-600 mt-1">
              ₹{summary.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-rose-500 mt-0.5">{summary.overdueCount} with pending balance</p>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Cleared Accounts</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{summary.clearedCount}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Zero outstanding balance</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Overdue Accounts</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{summary.overdueCount}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Need follow-up</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by name, phone or GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-14 text-slate-400 flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-xs">Loading customer records...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-25" />
            <p className="text-sm font-semibold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400 mt-1">Customers auto-save when you create bills, or add them manually above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Bills</th>
                  <th className="px-4 py-3 text-right">Loyalty Pts</th>
                  <th className="px-4 py-3 text-right">Outstanding Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const bal = c.outstandingBalance;
                  const isOverdue = bal > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{c.name}</div>
                          {c.territory && <div className="text-[10px] text-indigo-500 font-bold">{c.territory.name}</div>}
                        {c.gstin && (
                          <div className="text-[10px] text-slate-400 font-mono">{c.gstin}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {c.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 font-semibold">{c.totalBills}</td>
                      <td className="px-4 py-3 text-right">
                        {c.loyaltyPoints > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-700 font-bold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {c.loyaltyPoints}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-black text-sm ${isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            <Clock className="h-3 w-3" />
                            Due Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Clear
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Record Payment */}
                          {isOverdue && (
                            <button
                              onClick={() => openPayModal(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                              title="Record Receivables Payment"
                            >
                              <IndianRupee className="h-3 w-3" />
                              Collect
                            </button>
                          )}
                          {/* WhatsApp Reminder */}
                          {isOverdue && (
                            <a
                              href={buildWhatsApp(c)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold transition"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Remind
                            </a>
                          )}
                          {/* View Invoices */}
                          <Link
                            href={`/invoices?q=${encodeURIComponent(c.phone)}`}
                            className="inline-flex items-center gap-0.5 text-slate-400 hover:text-indigo-600 text-[11px] font-bold transition"
                            title="View All Invoices"
                          >
                            Bills
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Add New Customer
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Rajan Enterprises"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Mobile Number (WhatsApp) *</label>
                <input
                  required
                  type="tel"
                  maxLength={10}
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">GSTIN (optional)</label>
                <input
                  type="text"
                  value={addGstin}
                  onChange={(e) => setAddGstin(e.target.value.toUpperCase())}
                  placeholder="29AAAAA0000A1Z5"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">EMAIL (optional)</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="e.g. raj@example.com"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">STATE CODE (optional)</label>
                  <input
                    type="text"
                    value={addStateCode}
                    onChange={(e) => setAddStateCode(e.target.value)}
                    placeholder="e.g. 32"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">ADDRESS (optional)</label>
                  <textarea
                    rows={2}
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="Full physical address"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs resize-none focus:border-indigo-500 focus:outline-none"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">PINCODE (optional)</label>
                  <input
                    type="text"
                    value={addPincode}
                    onChange={(e) => setAddPincode(e.target.value)}
                    placeholder="e.g. 682001"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">TERRITORY / BEAT (optional)</label>
                  <select
                    value={addTerritoryId}
                    onChange={(e) => setAddTerritoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Select Territory --</option>
                    {territories.map(t => (
                      <option key={t.id} value={t.id}>{t.zone ? `${t.zone} - ` : ''}{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {addError && (

                <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-2 rounded-lg">{addError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-60"
                >
                  {addSaving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Collect Receivables Payment</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{payCustomer.name} • {payCustomer.phone}</p>
              </div>
              <button onClick={() => setPayCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Outstanding summary */}
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Outstanding Balance</p>
              <p className="text-2xl font-black text-rose-600 mt-0.5">
                ₹{payCustomer.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {paySuccess ? (
              <div className="flex flex-col items-center py-6 space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="text-sm font-black text-emerald-700 text-center">{paySuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRecordPayment} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Amount Received (₹)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    max={payCustomer.outstandingBalance}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none text-right"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Payment Mode</label>
                  <div className="flex gap-2">
                    {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayMode(m)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-[11px] font-bold transition ${
                          payMode === m
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        {m === 'CASH' && <Banknote className="h-4 w-4" />}
                        {m === 'UPI' && <QrCode className="h-4 w-4" />}
                        {m === 'CARD' && <CreditCard className="h-4 w-4" />}
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Partial payment via Paytm"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {payError && (
                  <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-2 rounded-lg">
                    <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />{payError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPayCustomer(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition disabled:opacity-60 shadow-sm"
                  >
                    {payLoading ? 'Recording...' : '✓ Record Payment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
