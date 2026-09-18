'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  RefreshCw, 
  X, 
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';

const CLASSIFICATION_CONFIG: Record<string, { label: string; badgeColor: string }> = {
  ASSET: { label: "Asset", badgeColor: "text-blue-700 bg-blue-50 border-blue-200" },
  LIABILITY: { label: "Liability", badgeColor: "text-orange-700 bg-orange-50 border-orange-200" },
  EQUITY: { label: "Equity", badgeColor: "text-purple-700 bg-purple-50 border-purple-200" },
  REVENUE: { label: "Revenue / Income", badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  EXPENSE: { label: "Expense", badgeColor: "text-rose-700 bg-rose-50 border-rose-200" },
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("ASSET");
  const [newBalance, setNewBalance] = useState("0");

  const loadAccounts = async () => {
    setLoading(true);
    try {
      let url = "/api/accounts";
      if (selectedClass !== "ALL") url += `?classification=${selectedClass}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error("Error loading accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [selectedClass]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) {
      alert("Account Code and Name are required");
      return;
    }

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          classification: newClass,
          balance: Number(newBalance || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create account");
      }

      setShowModal(false);
      setNewCode("");
      setNewName("");
      setNewBalance("0");
      loadAccounts();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filtered = accounts.filter((acc) => {
    const q = search.toLowerCase();
    return acc.code.toLowerCase().includes(q) || acc.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <span>Chart of Accounts (General Ledger)</span>
          </h1>
          <p className="text-xs text-slate-500">
            World-standard double-entry ledger accounts (Assets, Liabilities, Equity, Revenue, Expenses)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 flex items-center space-x-1.5 transition"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Account</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
          <span className="text-[10px] font-bold text-blue-700 uppercase">Total Assets</span>
          <p className="text-base font-extrabold text-blue-950 mt-1">
            ₹{(summary.totalAssets || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3">
          <span className="text-[10px] font-bold text-orange-700 uppercase">Liabilities</span>
          <p className="text-base font-extrabold text-orange-950 mt-1">
            ₹{(summary.totalLiabilities || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3">
          <span className="text-[10px] font-bold text-purple-700 uppercase">Equity</span>
          <p className="text-base font-extrabold text-purple-950 mt-1">
            ₹{(summary.totalEquity || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Revenue</span>
          <p className="text-base font-extrabold text-emerald-950 mt-1">
            ₹{(summary.totalRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
          <span className="text-[10px] font-bold text-rose-700 uppercase">Expenses</span>
          <p className="text-base font-extrabold text-rose-950 mt-1">
            ₹{(summary.totalExpenses || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
          {["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                selectedClass === cls
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cls === "ALL" ? "All Accounts" : cls.charAt(0) + cls.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code or account name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
            <span className="text-xs">Loading ledger accounts...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-700">No accounts found</p>
            <p className="text-xs text-slate-400">Click &apos;+ Add Account&apos; to create a new ledger account</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Account Code</th>
                  <th className="px-4 py-3 font-semibold">Account Name</th>
                  <th className="px-4 py-3 font-semibold">Classification</th>
                  <th className="px-4 py-3 font-semibold text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((acc) => {
                  const conf = CLASSIFICATION_CONFIG[acc.classification] || {
                    label: acc.classification,
                    badgeColor: "text-slate-700 bg-slate-100",
                  };
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{acc.code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{acc.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.badgeColor}`}>
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 text-right">
                        ₹{Number(acc.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Account */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Add Account to Ledger</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Account Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1020"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Classification *</label>
                  <select
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value="ASSET">Asset (1000s)</option>
                    <option value="LIABILITY">Liability (2000s)</option>
                    <option value="EQUITY">Equity (3000s)</option>
                    <option value="REVENUE">Revenue (4000s)</option>
                    <option value="EXPENSE">Expense (5000s)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India Current A/C"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
