'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  Receipt, 
  Package, 
  AlertTriangle, 
  FileText, 
  Building2, 
  ArrowUpRight, 
  Camera, 
  CheckCircle2, 
  Clock, 
  IndianRupee,
  RefreshCw,
  Plus,
  Users
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    totalUdhar: 0,
    netGstOutput: 0,
    lowStockCount: 0,
    totalProductsCount: 0,
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();

      if (data.success) {
        setInvoices(data.recentInvoices || []);
        setLowStockItems(data.lowStockItems || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const handleSeedDemo = async (industry: string) => {
    setSeedingDemo(true);
    try {
      const res = await fetch('/api/demo/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDemoModal(false);
        // Reload to update sidebar and dashboard data
        window.location.reload();
      } else {
        alert(data.error || 'Failed to seed demo data');
      }
    } catch (err) {
      console.error('Error seeding demo data:', err);
    } finally {
      setSeedingDemo(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Business performance overview from your Neon PostgreSQL database</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setShowDemoModal(true)}
            className="rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2.5 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs"
            title="Load realistic sample data for instant demos"
          >
            <span className="text-sm">⚡</span>
            <span>Load Demo Data</span>
          </button>

          <Link
            href="/billing/new"
            className="flex-1 sm:flex-initial rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition flex items-center justify-center space-x-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Create Bill (POS)</span>
          </Link>

          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh database data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1-Click Demo Data Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">⚡</span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">1-Click Enterprise Demo Seeder</h3>
                  <p className="text-[11px] text-slate-500">Select an industry to instantly populate realistic sample products, batches, and records.</p>
                </div>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  id: 'PHARMACY',
                  title: 'Pharmacy & Healthcare',
                  emoji: '💊',
                  desc: 'Dolo 650, Augmentin 625, Azithral (Schedule H/H1), doctors, and 30-day near-expiry batches.',
                  badge: 'New Module',
                  badgeColor: 'bg-emerald-100 text-emerald-800',
                },
                {
                  id: 'RESTAURANT',
                  title: 'Restaurant & Cafe',
                  emoji: '🍽️',
                  desc: 'Biryani, Butter Chicken, Naan, 5 dining tables, KOTs, and takeaway counter.',
                  badge: 'F&B Ready',
                  badgeColor: 'bg-amber-100 text-amber-800',
                },
                {
                  id: 'RETAIL',
                  title: 'Supermarket & Retail',
                  emoji: '🛒',
                  desc: 'Basmati Rice, Sunflower Oil, Amul Butter, Britannia Cookies with EAN/Code128 barcodes.',
                  badge: 'High Speed POS',
                  badgeColor: 'bg-indigo-100 text-indigo-800',
                },
              ].map((ind) => (
                <button
                  key={ind.id}
                  disabled={seedingDemo}
                  onClick={() => handleSeedDemo(ind.id)}
                  className="flex items-start justify-between p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition text-left group"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl p-2 bg-slate-100 rounded-xl group-hover:bg-white">{ind.emoji}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{ind.title}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ind.badgeColor}`}>
                          {ind.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{ind.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {seedingDemo && (
              <div className="text-center py-2 text-xs font-bold text-indigo-600 animate-pulse">
                Seeding realistic enterprise catalog and database records...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Sales</span>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <IndianRupee className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              ₹{metrics.todaySales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Live</span>
          </div>
        </div>

        {/* Total Receivables */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Receivables</span>
            <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-amber-600">
              ₹{metrics.totalUdhar.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500">Outstanding dues</span>
          </div>
        </div>

        {/* Output GST Collected */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Output GST Collected</span>
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-indigo-600">
              ₹{metrics.netGstOutput.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500">GSTR-1 Ready</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Warnings</span>
            <span className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-rose-600">
              {metrics.lowStockCount} {metrics.lowStockCount === 1 ? "Product" : "Products"}
            </span>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Action needed</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/billing/new"
          className="group rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 hover:bg-indigo-50 transition flex items-center space-x-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Create Tax Invoice</div>
            <div className="text-[11px] text-slate-500">Fast POS with dynamic UPI QR</div>
          </div>
        </Link>

        <Link
          href="/inventory"
          className="group rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition flex items-center space-x-3 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Stock & Products</div>
            <div className="text-[11px] text-slate-500">{metrics.totalProductsCount || 0} live SKUs in Neon DB</div>
          </div>
        </Link>

        <Link
          href="/inventory/purchase"
          className="group rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition flex items-center space-x-3 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">AI Purchase Inward</div>
            <div className="text-[11px] text-slate-500">Scan bills, match audit & inward stock</div>
          </div>
        </Link>
      </div>

      {/* Main Split: Recent Invoices (Left) & Low Stock Watchlist (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Invoices Table (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
              <p className="text-[11px] text-slate-500">Last bills created across your stores</p>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>View All ({invoices.length})</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">No invoices generated yet</p>
              <Link href="/billing/new" className="text-xs text-indigo-600 hover:underline mt-1 block">
                + Create your first bill
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Bill #</th>
                    <th className="px-3 py-2.5 font-semibold">Customer</th>
                    <th className="px-3 py-2.5 font-semibold">Amount</th>
                    <th className="px-3 py-2.5 font-semibold">Balance Due</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{inv.customerName}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">₹{Number(inv.totalAmount).toFixed(2)}</td>
                      <td className="px-3 py-2.5 font-semibold text-rose-600">
                        {Number(inv.dueAmount) > 0 ? `₹${Number(inv.dueAmount).toFixed(2)}` : "₹0.00"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : inv.paymentStatus === "PARTIAL"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Watchlist (1 col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>Low Stock Alerts</span>
            </h2>
            <Link href="/inventory" className="text-xs font-bold text-indigo-600 hover:underline">
              Inventory
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-xs font-semibold text-slate-700">All stock healthy</p>
              <p className="text-[11px] text-slate-400">No items below alert threshold</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="truncate text-xs font-bold text-slate-900">{p.name}</div>
                    <div className="text-[10px] text-slate-500">Min Alert: {p.minStockAlert} units</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      {p.currentStock} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
