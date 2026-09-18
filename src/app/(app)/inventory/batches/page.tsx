'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Boxes, 
  Plus, 
  Search, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  ArrowLeft, 
  Tag, 
  Printer, 
  ShieldAlert,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';
import BarcodeSvg from '@/components/BarcodeSvg';

interface BatchItem {
  id: string;
  productId: string;
  batchNumber: string;
  mfgDate: string | null;
  expiryDate: string | null;
  costPrice: string | number;
  sellingPrice: string | number;
  mrp: string | number;
  currentStock: string | number;
  expiryStatus: 'NORMAL' | 'EXPIRING_SOON' | 'EXPIRED';
  daysRemaining: number | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    baseUnit: string;
  };
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'EXPIRING_SOON' | 'EXPIRED' | 'IN_STOCK'>('ALL');
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [inwardStock, setInwardStock] = useState('10');

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchesRes, productsRes] = await fetch('/api/batches').then(async (res) => [
        await res.json(),
        await fetch('/api/products').then((r) => r.json()),
      ]);

      if (batchesRes.success) {
        setBatches(batchesRes.batches || []);
      }
      if (productsRes.success) {
        setProducts(productsRes.products || []);
        if (productsRes.products.length > 0 && !selectedProductId) {
          const first = productsRes.products[0];
          setSelectedProductId(first.id);
          setCostPrice(String(first.purchasePrice || ''));
          setSellingPrice(String(first.sellingPrice || ''));
          setMrp(String(first.mrp || first.sellingPrice || ''));
        }
      }
    } catch (err) {
      console.error('Error loading batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductSelect = (pId: string) => {
    setSelectedProductId(pId);
    const p = products.find((x) => x.id === pId);
    if (p) {
      setCostPrice(String(p.purchasePrice || ''));
      setSellingPrice(String(p.sellingPrice || ''));
      setMrp(String(p.mrp || p.sellingPrice || ''));
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !batchNumber || !sellingPrice || !mrp) {
      alert('Product, Batch Number, MRP, and Selling Price are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          batchNumber: batchNumber.trim().toUpperCase(),
          mfgDate: mfgDate || null,
          expiryDate: expiryDate || null,
          costPrice: Number(costPrice || 0),
          sellingPrice: Number(sellingPrice),
          mrp: Number(mrp),
          initialStock: Number(inwardStock || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create batch');
      }

      setShowModal(false);
      setBatchNumber('');
      setMfgDate('');
      setExpiryDate('');
      loadData();
    } catch (err: any) {
      alert('Error creating batch: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter batches
  const filtered = batches.filter((b) => {
    if (filter === 'EXPIRING_SOON' && b.expiryStatus !== 'EXPIRING_SOON') return false;
    if (filter === 'EXPIRED' && b.expiryStatus !== 'EXPIRED') return false;
    if (filter === 'IN_STOCK' && Number(b.currentStock) <= 0) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        b.batchNumber.toLowerCase().includes(q) ||
        b.product.name.toLowerCase().includes(q) ||
        (b.product.sku && b.product.sku.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const expiringSoonCount = batches.filter((b) => b.expiryStatus === 'EXPIRING_SOON').length;
  const expiredCount = batches.filter((b) => b.expiryStatus === 'EXPIRED').length;
  const totalStockValuation = batches.reduce(
    (acc, b) => acc + Number(b.currentStock) * Number(b.sellingPrice),
    0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/inventory"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Boxes className="h-6 w-6 text-indigo-600" />
              <span>Batch & Expiry Management</span>
            </h1>
            <p className="text-xs text-slate-500">
              Multiple MRPs, Multiple Sale Prices, FEFO Expiry tracking, and batchwise stock
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              setBatchNumber(`B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
              setShowModal(true);
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 flex items-center space-x-1.5 transition"
          >
            <Plus className="h-4 w-4" />
            <span>+ Inward New Batch</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Active Batches</span>
            <Boxes className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{batches.length}</div>
          <div className="mt-1 text-[11px] text-slate-400">Across FMCG, pharma & retail</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>Near Expiry (&lt; 30 Days)</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{expiringSoonCount}</div>
          <div className="mt-1 text-[11px] text-amber-700">Prioritize selling via FEFO</div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>Expired Batches</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">{expiredCount}</div>
          <div className="mt-1 text-[11px] text-rose-700">Remove from active POS sales</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Batch Stock Value</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            ₹{totalStockValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Based on batch sale prices</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search batch # or product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Batches ({batches.length})
          </button>
          <button
            onClick={() => setFilter('EXPIRING_SOON')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filter === 'EXPIRING_SOON' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Near Expiry ({expiringSoonCount})
          </button>
          <button
            onClick={() => setFilter('EXPIRED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filter === 'EXPIRED' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Expired ({expiredCount})
          </button>
          <button
            onClick={() => setFilter('IN_STOCK')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filter === 'IN_STOCK' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            In Stock Only
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
            <span className="text-xs">Loading batch records from Neon DB...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Boxes className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-700">No batch records found</p>
            <p className="text-xs text-slate-400 mb-4">Inward batches with different MRPs and expiry dates</p>
            <button
              onClick={() => {
                setBatchNumber(`B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
                setShowModal(true);
              }}
              className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>+ Create your first batch</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product Name</th>
                  <th className="px-4 py-3 font-semibold">Batch #</th>
                  <th className="px-4 py-3 font-semibold">Mfg Date</th>
                  <th className="px-4 py-3 font-semibold">Expiry Date</th>
                  <th className="px-4 py-3 font-semibold">Cost (₹)</th>
                  <th className="px-4 py-3 font-semibold">Sale Price (₹)</th>
                  <th className="px-4 py-3 font-semibold">MRP (₹)</th>
                  <th className="px-4 py-3 font-semibold">Batch Stock</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div>{b.product.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {b.product.sku || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                      {b.batchNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {b.mfgDate ? new Date(b.mfgDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {b.expiryDate ? (
                        <div>
                          <div className="font-semibold text-slate-900">
                            {new Date(b.expiryDate).toLocaleDateString('en-IN')}
                          </div>
                          {b.daysRemaining !== null && (
                            <div
                              className={`text-[10px] font-bold ${
                                b.daysRemaining < 0
                                  ? 'text-rose-600'
                                  : b.daysRemaining <= 30
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {b.daysRemaining < 0
                                ? `Expired ${Math.abs(b.daysRemaining)}d ago`
                                : `${b.daysRemaining} days left`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">₹{Number(b.costPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">₹{Number(b.sellingPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">₹{Number(b.mrp).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {Number(b.currentStock)} {b.product.baseUnit}
                    </td>
                    <td className="px-4 py-3">
                      {b.expiryStatus === 'EXPIRED' ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                          Expired
                        </span>
                      ) : b.expiryStatus === 'EXPIRING_SOON' ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Expiring Soon
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Fresh
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/inventory/barcode-generator?name=${encodeURIComponent(
                          b.product.name
                        )}&variant=${encodeURIComponent(
                          `Batch: ${b.batchNumber} | Exp: ${b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : 'N/A'}`
                        )}&mrp=${b.mrp}&price=${b.sellingPrice}&barcode=${b.product.barcode || b.batchNumber}`}
                        className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                        title="Print Barcode with Batch & Expiry"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print Sticker</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inward New Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center space-x-2">
                <Boxes className="h-5 w-5 text-indigo-600" />
                <span>Inward New Batch (Multiple MRP / Expiry)</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Base Price: ₹{p.sellingPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g. B-2026-X1"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold focus:border-indigo-500 focus:outline-none uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Inward Stock Qty *</label>
                  <input
                    type="number"
                    value={inwardStock}
                    onChange={(e) => setInwardStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mfg Date</label>
                  <input
                    type="date"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Specific Pricing for this Batch */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-3">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Batch Specific Pricing (Handles Price Hikes / Drops)
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Cost Price (₹)</label>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Batch MRP (₹) *</label>
                    <input
                      type="number"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold bg-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Sale Price (₹) *</label>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-emerald-700 bg-white focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Batch Inward</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
