'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Scissors,
  Tag,
  Grid,
  Search,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  IndianRupee,
  RefreshCw,
  PlusCircle,
  Copy,
  Check,
  X,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function ApparelCommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalVariantsCount: 0,
    totalGarmentsCount: 0,
    totalFabricMeters: 0,
    todaySales: 0,
    recentInvoiceCount: 0,
  });
  const [products, setProducts] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'matrix' | 'catalog' | 'fabrics' | 'invoices'>('matrix');
  const [selectedBrand, setSelectedBrand] = useState<'Raymond' | "Levi's">('Raymond');
  const [matrixData, setMatrixData] = useState<any>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [tagModalProduct, setTagModalProduct] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fabric Cut Calculator State
  const [calcFabricId, setCalcFabricId] = useState('');
  const [calcMeters, setCalcMeters] = useState('2.5');

  // Load Catalog & Stats
  const loadCatalog = async () => {
    setLoading(true);
    try {
      let url = `/api/apparel/catalog?category=${categoryFilter}`;
      if (searchQuery.trim()) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setProducts(data.products || []);
        setRecentInvoices(data.recentInvoices || []);
        const fabrics = data.products?.filter((p: any) => p.baseUnit === 'MTR');
        if (fabrics?.length && !calcFabricId) {
          setCalcFabricId(fabrics[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load apparel catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load 2D Matrix Data
  const loadMatrix = async (brand: string) => {
    setMatrixLoading(true);
    try {
      const res = await fetch(`/api/apparel/matrix?brand=${encodeURIComponent(brand)}`);
      const data = await res.json();
      if (data.success) {
        setMatrixData(data);
      }
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [categoryFilter]);

  useEffect(() => {
    loadMatrix(selectedBrand);
  }, [selectedBrand]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const selectedFabric = products.find((p) => p.id === calcFabricId);
  const fabricMetersNum = parseFloat(calcMeters) || 0;
  const fabricTotalCost = selectedFabric ? Math.round(Number(selectedFabric.sellingPrice) * fabricMetersNum) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Scissors className="w-3.5 h-3.5" />
              Textiles, Garments & Fashion Retail Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Textiles & Apparel Command Center
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              2D Size × Color stock matrix, thermal clothing hang-tags, unstitched fabric fractional meter cuts, and fast retail billing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/inventory"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              + Add Garment SKU
            </Link>
            <Link
              href="/pos"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Receipt className="w-4 h-4" />
              Fast Fashion POS
            </Link>
            <button
              onClick={() => {
                loadCatalog();
                loadMatrix(selectedBrand);
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-Time KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Garment Units in Stock */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Garments in Stock</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalGarmentsCount}</span>
            <span className="text-xs text-purple-600 font-medium">Pieces</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Ready on display racks & shelves
          </div>
        </div>

        {/* Today's Fashion Sales */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              ₹{Number(stats.todaySales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {stats.recentInvoiceCount} customer bills generated
          </div>
        </div>

        {/* Size-Color SKU Variants */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Size-Color SKUs</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Grid className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalVariantsCount}</span>
            <span className="text-xs text-indigo-600 font-medium">Active Variants</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Managed under parent styles
          </div>
        </div>

        {/* Fabric Stock in Meters */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unstitched Fabric</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalFabricMeters}</span>
            <span className="text-xs text-amber-600 font-medium">Meters</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Suiting, shirting & silk roll cuts
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'matrix'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Grid className="w-4 h-4" />
          2D Size × Color Stock Matrix
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'catalog'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          Garment Catalog & Barcodes ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('fabrics')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'fabrics'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scissors className="w-4 h-4" />
          Unstitched Fabric Meter Cuts
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'invoices'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Recent Invoices ({recentInvoices.length})
        </button>
      </div>

      {/* TAB 1: 2D SIZE × COLOR MATRIX VIEWER */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-1">
                <Grid className="w-3.5 h-3.5" />
                Live Variant Stock Grid
              </div>
              <h2 className="text-base font-bold text-slate-900">Interactive 2D Size × Color Inventory Matrix</h2>
              <p className="text-xs text-slate-500">View real-time stock levels for every size and color combination in one single view.</p>
            </div>

            {/* Brand Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedBrand('Raymond')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBrand === 'Raymond'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👔 Raymond (Formal Shirts)
              </button>
              <button
                onClick={() => setSelectedBrand("Levi's")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBrand === "Levi's"
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👖 Levi's (Denim Jeans)
              </button>
            </div>
          </div>

          {/* Matrix Grid */}
          {matrixLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
              Loading 2D Variant Matrix...
            </div>
          ) : matrixData ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 border-r border-slate-200 w-44 bg-slate-200/70">
                      Color Shade \ Size
                    </th>
                    {matrixData.sizes.map((s: string) => (
                      <th key={s} className="py-3 px-4 text-center border-r border-slate-200">
                        Size {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {matrixData.colors.map((colorName: string) => (
                    <tr key={colorName} className="hover:bg-slate-50/50">
                      {/* Row Header (Color) */}
                      <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-xs"
                            style={{
                              backgroundColor:
                                colorName.toLowerCase().includes('white') ? '#ffffff' :
                                colorName.toLowerCase().includes('sky') ? '#38bdf8' :
                                colorName.toLowerCase().includes('navy') ? '#1e3a8a' :
                                colorName.toLowerCase().includes('black') || colorName.toLowerCase().includes('carbon') ? '#0f172a' :
                                colorName.toLowerCase().includes('indigo') ? '#312e81' : '#64748b',
                            }}
                          />
                          <span>{colorName}</span>
                        </div>
                      </td>

                      {/* Matrix Cells */}
                      {matrixData.sizes.map((s: string) => {
                        const cell = matrixData.matrix[colorName]?.[s];
                        if (!cell) {
                          return (
                            <td key={s} className="py-3 px-4 text-center border-r border-slate-200 text-slate-300 italic">
                              —
                            </td>
                          );
                        }

                        const isLow = cell.currentStock <= cell.minStockAlert;
                        return (
                          <td key={s} className="py-3 px-4 text-center border-r border-slate-200 group relative">
                            <div className="p-2 rounded-lg bg-slate-50 hover:bg-purple-50 transition-colors border border-slate-200/60">
                              <div className="flex items-center justify-center gap-1">
                                <span className={`text-sm font-extrabold ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                                  {cell.currentStock}
                                </span>
                                <span className="text-[10px] text-slate-500">Pcs</span>
                              </div>
                              <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                                ₹{Number(cell.sellingPrice).toLocaleString('en-IN')}
                              </div>
                              <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">
                                {cell.barcode}
                              </div>

                              <button
                                onClick={() => setTagModalProduct(cell)}
                                className="mt-1.5 w-full py-0.5 bg-white hover:bg-purple-600 hover:text-white border border-slate-200 rounded text-[10px] font-semibold text-slate-700 shadow-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <Printer className="w-2.5 h-2.5" />
                                Tag
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: GARMENT CATALOG & BARCODES */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'Formal Shirts', 'Denim Jeans', 'Ethnic Sarees', 'Unstitched Fabric'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    categoryFilter === cat
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Collections' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCatalog()}
                placeholder="Search style, brand, barcode..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Garment Style & Brand</th>
                    <th className="py-3 px-4">Variant (Size / Color)</th>
                    <th className="py-3 px-4">EAN / Barcode</th>
                    <th className="py-3 px-4">HSN Code</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">MRP / Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-purple-700">{p.brand}</span>
                          <span>•</span>
                          <span>{p.category}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-800 font-semibold rounded text-xs border border-purple-200">
                          {p.displayName || p.name}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">
                            {p.barcode || p.sku}
                          </span>
                          <button
                            onClick={() => copyToClipboard(p.barcode || p.sku, p.id)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                          >
                            {copiedCode === p.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                        {p.hsnCode} ({p.gstRate}%)
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-sm">{Number(p.currentStock)}</span>
                        <span className="text-[11px] text-slate-500 ml-1">{p.baseUnit}</span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ₹{Number(p.sellingPrice).toLocaleString('en-IN')}
                        {p.mrp && Number(p.mrp) > Number(p.sellingPrice) && (
                          <span className="text-[10px] text-slate-400 line-through ml-1.5">
                            ₹{Number(p.mrp).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setTagModalProduct(p)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 font-semibold rounded-lg text-xs cursor-pointer transition-colors inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          Hang-Tag
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UNSTITCHED FABRIC METER CUTS */}
      {activeTab === 'fabrics' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-2">
              <Scissors className="w-3.5 h-3.5" />
              Fractional Meter Length Calculator
            </div>
            <h2 className="text-xl font-bold text-slate-900">Unstitched Fabric Cuts & Roll Inward</h2>
            <p className="text-xs text-slate-500 mt-1">
              Textile stores sell fabric from thaan rolls in exact fractional meter lengths (e.g. 2.25 MTR). Calculate instant line total and dispatch to POS.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Fabric Roll</label>
                <select
                  value={calcFabricId}
                  onChange={(e) => setCalcFabricId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                >
                  {products
                    .filter((p) => p.baseUnit === 'MTR')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} — ₹{f.sellingPrice}/MTR ({f.currentStock} Mtr Left)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Length Cut Required (Meters)</label>
                <input
                  type="number"
                  step="0.05"
                  value={calcMeters}
                  onChange={(e) => setCalcMeters(e.target.value)}
                  placeholder="e.g. 2.45"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Live Calculation Slip */}
            {selectedFabric && (
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-600 block">Cut Specification:</span>
                  <strong className="text-sm text-slate-900">{calcMeters} Meters of {selectedFabric.name}</strong>
                  <span className="text-[11px] text-slate-500 block font-mono">Rate: ₹{selectedFabric.sellingPrice}/MTR • HSN {selectedFabric.hsnCode} (GST 5%)</span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Calculated Total</span>
                  <span className="text-2xl font-black text-amber-800">₹{fabricTotalCost.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: RECENT FASHION INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Customer Apparel Bills</h3>
            <span className="text-xs text-slate-500">{recentInvoices.length} invoices found</span>
          </div>

          <div className="divide-y divide-slate-100">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-700 text-sm">{inv.invoiceNumber}</span>
                      <span className="text-xs font-semibold text-slate-900">{inv.customerName}</span>
                      <span className="text-xs text-slate-500 font-mono">({inv.customerPhone})</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>{new Date(inv.invoiceDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">{inv.paymentMode}</span>
                      {inv.notes && <span className="text-purple-700 font-medium">({inv.notes})</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">Paid in Full</span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                  {inv.items?.map((it: any, iIdx: number) => (
                    <div key={iIdx} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                      <div className="font-medium text-slate-800">
                        {it.productName} <span className="text-slate-500 font-mono">({it.quantity} {it.unitSold})</span>
                      </div>
                      <span className="font-semibold text-slate-900">₹{Number(it.lineTotal).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: 60mm x 40mm (2.5" x 1.5") Thermal Clothing Hang-Tag */}
      {tagModalProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">60×40mm Clothing Hang-Tag</h3>
              </div>
              <button
                onClick={() => setTagModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated 60x40mm Clothing Hang-Tag */}
            <div className="my-5 p-4 border-2 border-dashed border-slate-400 rounded-lg bg-white shadow-inner font-mono text-center">
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-800">
                {tagModalProduct.brand || 'VOGUE & VELVET'}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                {tagModalProduct.name}
              </div>

              {/* Big Size Tag Box */}
              <div className="my-2 py-1 px-3 bg-purple-50 border border-purple-200 rounded inline-block">
                <span className="text-base font-black text-purple-900">
                  {tagModalProduct.displayName || 'FREE SIZE'}
                </span>
              </div>

              {/* Barcode Simulation */}
              <div className="my-1.5 py-1 bg-slate-950 flex justify-center items-center h-8 px-4 rounded">
                <div className="w-full flex justify-between h-6 items-center bg-white px-2">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${i % 3 === 0 ? 'w-1 bg-black' : i % 2 === 0 ? 'w-0.5 bg-black' : 'w-1 bg-white'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="text-[10px] font-mono font-bold tracking-wider text-slate-900">
                {tagModalProduct.barcode || tagModalProduct.sku}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">HSN: {tagModalProduct.hsnCode || '6205'}</span>
                <span className="font-extrabold text-slate-900 text-xs">
                  MRP: ₹{Number(tagModalProduct.mrp || tagModalProduct.sellingPrice).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="text-[8px] text-slate-400 mt-1 uppercase">
                (Inclusive of all taxes • 100% Cotton • Warm Iron)
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">TSC / TVS Garment Tag Roll</span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
