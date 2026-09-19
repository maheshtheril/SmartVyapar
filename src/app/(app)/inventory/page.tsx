'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  X,
  TrendingUp,
  Printer,
  Tag,
  Grid,
  Boxes,
  UploadCloud,
  Download,
  ArrowLeftRight
} from 'lucide-react';
import BulkImportModal from '@/components/BulkImportModal';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [hsnCode, setHsnCode] = useState("8544");
  const [sku, setSku] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [initialStock, setInitialStock] = useState("10");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sellingPrice) {
      alert("Product Name and Selling Price are required");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku: sku || undefined,
          hsnCode,
          purchasePrice: Number(purchasePrice || 0),
          sellingPrice: Number(sellingPrice),
          gstRate: Number(gstRate),
          initialStock: Number(initialStock || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create product");
      }

      setShowModal(false);
      setName("");
      setSku("");
      setPurchasePrice("");
      setSellingPrice("");
      loadProducts();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      p.hsnCode.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Package className="h-6 w-6 text-indigo-600" />
            <span>Stock & Inventory Management</span>
          </h1>
          <p className="text-xs text-slate-500">Live products catalog stored in Neon PostgreSQL</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/inventory/variants"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-100 flex items-center space-x-1.5 transition"
          >
            <Grid className="h-4 w-4 text-indigo-600" />
            <span>Variant Matrix (Size × Color)</span>
          </Link>
          <Link
            href="/inventory/batches"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-indigo-600 flex items-center space-x-1.5 transition"
          >
            <Boxes className="h-4 w-4 text-indigo-600" />
            <span>Batches & Expiry</span>
          </Link>
          <Link
            href="/inventory/transfers"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-indigo-600 flex items-center space-x-1.5 transition"
          >
            <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
            <span>Warehouses & Transfers</span>
          </Link>
          <Link
            href="/inventory/barcode-generator"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-indigo-600 flex items-center space-x-1.5 transition"
          >
            <Tag className="h-4 w-4 text-indigo-600" />
            <span>Print Barcodes</span>
          </Link>
          <a
            href="/api/inventory/export"
            download
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-indigo-600 flex items-center space-x-1.5 transition"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => setShowImportModal(true)}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-100 flex items-center space-x-1.5 transition"
          >
            <UploadCloud className="h-4 w-4 text-indigo-600" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 flex items-center space-x-1.5 transition"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or HSN code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Products: <span className="text-slate-900 font-bold">{products.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
            <span className="text-xs">Loading live products...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-700">No products found</p>
            <p className="text-xs text-slate-400 mb-4">Add your first product to start tracking inventory</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>+ Add a product</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product Name</th>
                  <th className="px-4 py-3 font-semibold">HSN</th>
                  <th className="px-4 py-3 font-semibold">Purchase Price</th>
                  <th className="px-4 py-3 font-semibold">Selling Price</th>
                  <th className="px-4 py-3 font-semibold">Margin %</th>
                  <th className="px-4 py-3 font-semibold">GST Slab</th>
                  <th className="px-4 py-3 font-semibold">Current Stock</th>
                  <th className="px-4 py-3 font-semibold">Stock Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const buy = Number(item.purchasePrice);
                  const sell = Number(item.sellingPrice);
                  const margin = sell > 0 ? (((sell - buy) / sell) * 100).toFixed(1) : "0.0";
                  const isLow = Number(item.currentStock) <= Number(item.minStockAlert);
                  const baseUnit = item.baseUnit || 'PCS';
                  const isPkg = item.hasAltUnit && item.altUnit && Number(item.conversionFactor) > 1;
                  const stockNum = Number(item.currentStock);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                          {item.sku && <span>SKU: {item.sku}</span>}
                          {item.barcode && <span>• Barcode: {item.barcode}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.hsnCode}</td>
                      <td className="px-4 py-3 text-slate-500">₹{buy.toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">₹{sell.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center space-x-0.5 font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                          <TrendingUp className="h-3 w-3" />
                          <span>{margin}%</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.gstRate}%</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div>{stockNum} {baseUnit}</div>
                        {isPkg && (
                          <div className="text-[10px] text-indigo-600 font-medium">
                            ≈ {Math.floor(stockNum / Number(item.conversionFactor))} {item.altUnit} {stockNum % Number(item.conversionFactor) > 0 ? `+ ${stockNum % Number(item.conversionFactor)} ${baseUnit}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <span className="inline-flex items-center space-x-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Low ({stockNum} left)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>In Stock</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href="/inventory/barcode-generator"
                          className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition"
                        >
                          <Printer className="h-3 w-3 text-indigo-500" />
                          <span>Barcode</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Product */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Add New Product to Inventory</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Polycab 2.5 Sq.mm Copper Wire"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SKU / Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. POL-25"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Price</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Price *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">GST (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Opening Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
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
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Inventory CSV / Excel Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={loadProducts}
      />
    </div>
  );
}
