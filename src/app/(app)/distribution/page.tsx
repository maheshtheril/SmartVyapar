'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Package,
  Layers,
  Receipt,
  IndianRupee,
  RefreshCw,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Search,
  ArrowRight,
  FileText,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

export default function DistributionCommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    todayBillingTotal: 0,
    totalMarketReceivables: 0,
    activeChallansCount: 0,
    warehouseCount: 0,
    totalSkusCount: 0,
    totalInventoryUnits: 0,
    invoiceCount: 0,
  });

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'inventory' | 'challans' | 'debtors' | 'warehouses' | 'invoices'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setWarehouses(data.warehouses || []);
        setChallans(data.challans || []);
        setCustomers(data.customers || []);
        setProducts(data.products || []);
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to load distribution dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Truck className="w-3.5 h-3.5" />
              B2B FMCG & Wholesale Distribution Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Wholesale & Distribution Command Center
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Beat route order processing, Delivery Challans (GST Rule 55), dual-unit packaging (PCS &amp; Master Case), and Accounts Receivable (AR) credit aging.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/inventory/challans"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
            >
              <FileText className="w-4 h-4" />
              + New Challan (Rule 55)
            </Link>
            <Link
              href="/pos"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Receipt className="w-4 h-4" />
              Wholesale Dispatch
            </Link>
            <button
              onClick={() => loadData()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-Time KPI Cards (Dynamic from Database) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's B2B Billing */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Billing</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              ₹{Number(stats.todayBillingTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {stats.invoiceCount} B2B invoices generated
          </div>
        </div>

        {/* Market Receivables / Udhar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Market Receivables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-700">
              ₹{Number(stats.totalMarketReceivables || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {customers.length} retail trade accounts
          </div>
        </div>

        {/* Active Delivery Challans */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Challans</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.activeChallansCount}</span>
            <span className="text-xs text-blue-600 font-medium">Dispatched</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            GST Rule 55 in transit
          </div>
        </div>

        {/* Depot & Van Network */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Depots &amp; Vans</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.warehouseCount}</span>
            <span className="text-xs text-indigo-600 font-medium">Locations</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.totalSkusCount} active FMCG SKUs
          </div>
        </div>
      </div>

      {/* 3. Quick Distribution Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/inventory/challans"
          className="p-3 bg-white hover:bg-blue-50/50 border border-slate-200 rounded-xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Delivery Challans</div>
              <div className="text-[10px] text-slate-500">GST Rule 55 Dispatch</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/field-sales"
          className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 rounded-xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Van &amp; Field Sales</div>
              <div className="text-[10px] text-slate-500">Beat Route Orders</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/inventory/price-lists"
          className="p-3 bg-white hover:bg-purple-50/50 border border-slate-200 rounded-xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Tiered Price Lists</div>
              <div className="text-[10px] text-slate-500">Wholesale vs Retailer</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/customers/aging"
          className="p-3 bg-white hover:bg-amber-50/50 border border-slate-200 rounded-xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Receivables &amp; Aging (AR)</div>
              <div className="text-[10px] text-slate-500">Retailer Credit Aging</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* 4. Tab Switcher Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          FMCG Dual-Pack Stock ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('challans')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'challans'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Delivery Challans ({challans.length})
        </button>
        <button
          onClick={() => setActiveTab('debtors')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'debtors'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Receivables &amp; Debtors ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'warehouses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Depot &amp; Van Units ({warehouses.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Recent Invoices ({invoices.length})
        </button>
      </div>

      {/* TAB 1: FMCG DUAL-PACK INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-700">
              Dual Packaging Units: Track inventory in both atomic units (Pieces/Packs) and Master Cases (Cartons/Boxes).
            </div>
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FMCG item, brand, SKU..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">FMCG Product &amp; Brand</th>
                    <th className="py-3 px-4">Dual Packaging (Conversion)</th>
                    <th className="py-3 px-4">HSN Code</th>
                    <th className="py-3 px-4">Available Stock</th>
                    <th className="py-3 px-4">Case Wholesale Price</th>
                    <th className="py-3 px-4">Unit MRP</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredProducts.map((p) => {
                    const factor = Number(p.conversionFactor || 1);
                    const stock = Number(p.currentStock || 0);
                    const boxes = Math.floor(stock / factor);
                    const loose = stock % factor;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-blue-600">{p.brand || 'FMCG Brand'}</span>
                            <span>•</span>
                            <span>SKU: {p.sku}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-medium">
                            <span>1 {p.altUnit || 'BOX'}</span>
                            <span className="text-slate-400">=</span>
                            <span className="font-bold text-blue-700">{factor} {p.baseUnit}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600">
                          {p.hsnCode} ({p.gstRate}%)
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {boxes} {p.altUnit || 'BOX'}
                            {loose > 0 && <span className="text-slate-500 font-normal text-xs ml-1">+ {loose} {p.baseUnit}</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Total: {stock} {p.baseUnit}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-xs">
                            ₹{Number(p.sellingPricePerAlt || (Number(p.sellingPrice) * factor)).toLocaleString('en-IN')}
                            <span className="text-slate-500 font-normal text-[10px]"> / {p.altUnit || 'BOX'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            ₹{Number(p.sellingPrice).toLocaleString('en-IN')} / {p.baseUnit}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-900">
                          ₹{Number(p.mrp || p.sellingPrice).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Link
                            href="/pos"
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition-colors inline-block"
                          >
                            Dispatch
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DELIVERY CHALLANS (GST RULE 55) */}
      {activeTab === 'challans' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delivery Challans (Statutory GST Rule 55)</h3>
              <p className="text-xs text-slate-500">Goods dispatched on delivery vans for route supply prior to final invoice generation.</p>
            </div>
            <Link
              href="/inventory/challans"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Manage All Challans
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {challans.map((ch) => (
              <div key={ch.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 text-sm">{ch.challanNumber}</span>
                      <span className="text-xs font-semibold text-slate-900">{ch.recipientName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        ch.status === 'DISPATCHED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        ● {ch.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>Vehicle: <strong className="text-slate-800 font-mono">{ch.vehicleNo || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Transporter: <strong className="text-slate-800">{ch.transporterName || 'Fleet'}</strong></span>
                      <span>•</span>
                      <span>Date: {new Date(ch.challanDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      {ch.recipientGstin && <span>• GST: <span className="font-mono">{ch.recipientGstin}</span></span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900">
                      ₹{Number(ch.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-slate-500">Subtotal: ₹{Number(ch.subtotal).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Items in Challan */}
                {ch.items?.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                    {ch.items.map((it: any, iIdx: number) => (
                      <div key={iIdx} className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-800 font-medium">{it.productName}</span>
                        <span className="font-semibold text-slate-900">
                          {Number(it.quantity)} {it.unit} @ ₹{Number(it.unitPrice).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: B2B RETAILER RECEIVABLES & CREDIT LEDGER */}
      {activeTab === 'debtors' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">B2B Retailer Receivables &amp; Credit Ledger</h3>
              <p className="text-xs text-slate-500">Track outstanding dues, authorized credit limits, and payment collection aging across retail accounts.</p>
            </div>
            <Link
              href="/customers/aging"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              View Aging Report
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {customers.map((c) => {
              const out = Number(c.outstandingBalance || 0);
              const limit = Number(c.creditLimit || 1);
              const usagePercent = Math.min(100, Math.round((out / limit) * 100));

              return (
                <div key={c.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{c.name}</span>
                        {c.gstin && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {c.gstin}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span className="font-mono">{c.phone}</span>
                        {c.address && (
                          <>
                            <span>•</span>
                            <span>{c.address}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-amber-700">
                        ₹{out.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Credit Limit: ₹{limit.toLocaleString('en-IN')} ({usagePercent}% used)
                      </div>
                    </div>
                  </div>

                  {/* Usage Bar */}
                  <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: MULTI-DEPOT & VAN NETWORK */}
      {activeTab === 'warehouses' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Depots &amp; Mobile Sales Van Network</h3>
              <p className="text-xs text-slate-500">Physical master godowns, district depots, and mobile van route sales stock units.</p>
            </div>
            <Link
              href="/inventory/transfers"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              Transfer Stock Between Depots
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {warehouses.map((wh) => (
              <div key={wh.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                      {wh.code?.startsWith('VAN') ? <Truck className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{wh.name}</h4>
                      <span className="font-mono text-xs text-slate-500">{wh.code}</span>
                    </div>
                  </div>

                  {wh.isDefault ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      Primary Godown
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-full">
                      Sub-Depot
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{wh.city || 'Regional Distribution Hub'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: RECENT B2B INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Wholesale Invoices</h3>
            <span className="text-xs text-slate-500">{invoices.length} invoices found</span>
          </div>

          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 text-sm">{inv.invoiceNumber}</span>
                      <span className="text-xs font-semibold text-slate-900">{inv.customerName}</span>
                      <span className="text-xs text-slate-500 font-mono">({inv.customerPhone})</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>{new Date(inv.invoiceDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">{inv.paymentMode}</span>
                      {inv.notes && <span className="text-blue-700 font-medium">({inv.notes})</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <span className={`text-[11px] font-semibold ${
                      inv.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {inv.paymentStatus === 'PAID' ? 'Paid in Full' : 'Credit Sale (Unpaid)'}
                    </span>
                  </div>
                </div>

                {inv.items?.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                    {inv.items.map((it: any, iIdx: number) => (
                      <div key={iIdx} className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1 rounded">
                        <span className="text-slate-800">{it.productName} ({Number(it.quantity)} {it.unitSold})</span>
                        <span className="font-semibold text-slate-900">₹{Number(it.lineTotal).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
