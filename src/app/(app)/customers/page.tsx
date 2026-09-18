'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  ArrowUpRight, 
  RefreshCw, 
  Clock, 
  IndianRupee 
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCustomers = async () => {
    setLoading(true);
    try {
      let url = "/api/customers";
      if (search) url += `?q=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error("Error loading customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <span>Customer Accounts & Khata</span>
          </h1>
          <p className="text-xs text-slate-500">Track customer profiles, contacts, and outstanding credit balances</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Customers: <span className="text-slate-900 font-bold">{customers.length}</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
            <span className="text-xs">Loading customer records...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400">Customers are saved automatically when creating bills!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer Name</th>
                  <th className="px-4 py-3 font-semibold">Phone (WhatsApp)</th>
                  <th className="px-4 py-3 font-semibold">State Code</th>
                  <th className="px-4 py-3 font-semibold">Outstanding Balance</th>
                  <th className="px-4 py-3 font-semibold">Credit Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const bal = Number(c.outstandingBalance || 0);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c.stateCode || "32"}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        ₹{bal.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {bal > 0 ? (
                          <span className="inline-flex items-center space-x-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            <Clock className="h-3 w-3" />
                            <span>Due Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <span>Clear</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(
                            `Hello ${c.name}, this is a gentle reminder that your current outstanding balance is ₹${bal.toFixed(2)}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <span>WhatsApp</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
