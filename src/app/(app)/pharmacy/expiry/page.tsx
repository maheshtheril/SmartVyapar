'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  RotateCcw, 
  Printer, 
  RefreshCw, 
  Filter,
  DollarSign,
  Package
} from 'lucide-react';

export default function NearExpiryMonitorPage() {
  const [data, setData] = useState<any>({ summary: {}, batches: [] });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const loadExpiryData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacy/expiry?filter=${activeFilter}`);
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load expiry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpiryData();
  }, [activeFilter]);

  const summary = data.summary || {};
  const batches = data.batches || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Clock className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Near-Expiry Loss Prevention Monitor
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Track medicine batches nearing expiry (30, 60, 90 days) to initiate supplier returns and prevent dead stock losses.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/invoices/credit-notes"
            className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Supplier Return / Credit Note</span>
          </Link>
          <button
            onClick={handlePrint}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5 shadow-2xs"
          >
            <Printer className="h-4 w-4 text-indigo-600" />
            <span>Print List</span>
          </button>
          <button
            onClick={loadExpiryData}
            className="rounded-xl p-2 border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-2xs"
            title="Refresh monitor"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expired */}
        <div 
          onClick={() => setActiveFilter('EXPIRED')}
          className={`cursor-pointer rounded-2xl p-4 border transition ${
            activeFilter === 'EXPIRED' 
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400' 
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Already Expired</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-950 font-mono">
            {summary.expiredCount || 0} <span className="text-xs font-semibold text-rose-700">Batches</span>
          </div>
          <p className="mt-1 text-xs font-bold text-rose-700 font-mono">
            ₹{(summary.expiredValue || 0).toLocaleString('en-IN')} loss value
          </p>
        </div>

        {/* < 30 Days */}
        <div 
          onClick={() => setActiveFilter('30')}
          className={`cursor-pointer rounded-2xl p-4 border transition ${
            activeFilter === '30' 
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400' 
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Within 30 Days</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950 font-mono">
            {summary.days30Count || 0} <span className="text-xs font-semibold text-amber-700">Batches</span>
          </div>
          <p className="mt-1 text-xs font-bold text-amber-700 font-mono">
            ₹{(summary.days30Value || 0).toLocaleString('en-IN')} returnable
          </p>
        </div>

        {/* 31-60 Days */}
        <div 
          onClick={() => setActiveFilter('60')}
          className={`cursor-pointer rounded-2xl p-4 border transition ${
            activeFilter === '60' 
              ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-300' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">31 to 60 Days</span>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {summary.days60Count || 0} <span className="text-xs font-semibold text-slate-400">Batches</span>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-600 font-mono">
            ₹{(summary.days60Value || 0).toLocaleString('en-IN')} stock value
          </p>
        </div>

        {/* Total At-Risk Inventory Value */}
        <div className="rounded-2xl p-4 border border-indigo-200 bg-linear-to-br from-indigo-50/60 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Total At-Risk Value</span>
            <Package className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-950 font-mono">
            ₹{(summary.totalAtRiskValue || 0).toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs font-semibold text-indigo-700">
            Total inventory expiring within 90 days
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs w-fit">
        {[
          { id: 'ALL', label: 'All At-Risk Batches' },
          { id: 'EXPIRED', label: 'Expired' },
          { id: '30', label: '< 30 Days' },
          { id: '60', label: '31-60 Days' },
          { id: '90', label: '61-90 Days' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeFilter === tab.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-right">At-Risk Value</th>
                <th className="py-3 px-4 text-center">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    Scanning batch inventory for near-expiry medicines...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Clock className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-slate-800 font-bold text-sm">All Inventory Fresh & Healthy</p>
                    <p className="text-slate-400 text-xs mt-1">
                      No batches are currently expired or expiring within {activeFilter === 'ALL' ? '90' : activeFilter} days.
                    </p>
                  </td>
                </tr>
              ) : (
                batches.map((b: any) => {
                  const prod = b.product || {};
                  const isExpired = b.bucket === 'EXPIRED';
                  const is30 = b.bucket === '30_DAYS';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{prod.name}</div>
                        {prod.drugGenericName && (
                          <div className="text-[11px] text-slate-500 italic max-w-xs truncate">
                            {prod.drugGenericName}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {b.batchNumber}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={isExpired ? 'text-rose-600' : is30 ? 'text-amber-600' : 'text-slate-700'}>
                          {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          }) : 'N/A'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {Number(b.currentStock)} {prod.baseUnit || 'PCS'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ₹{Number(b.costPrice || prod.purchasePrice || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        ₹{Number(b.stockValue || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isExpired
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : is30
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isExpired ? 'EXPIRED' : is30 ? 'CRITICAL (<30d)' : 'WARNING (<90d)'}
                        </span>
                      </td>
                    </tr>
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
