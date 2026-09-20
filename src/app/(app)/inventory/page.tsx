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
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import BulkImportModal from '@/components/BulkImportModal';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Stock Adjustment State
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<"DEDUCT" | "ADD" | "SET_EXACT">("DEDUCT");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("Damaged / Broken");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Stock History State
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<any>(null);
  const [stockHistoryData, setStockHistoryData] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const openStockHistory = async (product: any) => {
    setSelectedProductForHistory(product);
    setLoadingHistory(true);
    setStockHistoryData(null);
    try {
      const res = await fetch(`/api/inventory/stock-history?productId=${product.id}`);
      const data = await res.json();
      if (data.success) {
        setStockHistoryData(data);
      }
    } catch (err) {
      console.error("Failed to load stock history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust || !adjustQty) return;
    setIsAdjusting(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForAdjust.id,
          type: adjustType,
          quantity: Number(adjustQty),
          reason: adjustReason,
          notes: adjustNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to adjust stock");
      }
      setSelectedProductForAdjust(null);
      setAdjustQty("");
      setAdjustNotes("");
      loadProducts();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsAdjusting(false);
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
                        <button
                          type="button"
                          onClick={() => openStockHistory(item)}
                          className="text-left hover:text-indigo-600 transition group cursor-pointer"
                          title="Click to view full Stock Audit Ledger"
                        >
                          <div className="flex items-center space-x-1">
                            <span className="underline decoration-dotted underline-offset-2">{stockNum} {baseUnit}</span>
                            <History className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition" />
                          </div>
                        </button>
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
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForAdjust(item);
                              setAdjustType("DEDUCT");
                              setAdjustQty("");
                              setAdjustReason("Damaged / Broken");
                              setAdjustNotes("");
                            }}
                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition"
                            title="Adjust stock (damages, physical audit count, etc.)"
                          >
                            <SlidersHorizontal className="h-3 w-3 text-amber-600" />
                            <span>Adjust</span>
                          </button>
                          <Link
                            href="/inventory/barcode-generator"
                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition"
                          >
                            <Printer className="h-3 w-3 text-indigo-500" />
                            <span>Barcode</span>
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

      {/* Stock Adjustment Modal */}
      {selectedProductForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                  <span>Adjust Physical Stock</span>
                </h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {selectedProductForAdjust.name} (Current: <span className="font-bold text-slate-800">{Number(selectedProductForAdjust.currentStock)} {selectedProductForAdjust.baseUnit}</span>)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForAdjust(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-4">
              {/* Action Type Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Adjustment Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("DEDUCT")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 border ${
                      adjustType === "DEDUCT"
                        ? "bg-rose-50 text-rose-700 border-rose-300 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                    <span>Deduct Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADD")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 border ${
                      adjustType === "ADD"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span>Add Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("SET_EXACT")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 border ${
                      adjustType === "SET_EXACT"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span>Set Exact Count</span>
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reason / Cause *</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {adjustType === "DEDUCT" ? (
                    <>
                      <option value="Damaged / Broken in Transit">Damaged / Broken</option>
                      <option value="Expired / Past Shelf Life">Expired / Past Shelf Life</option>
                      <option value="Physical Stocktake Audit Shortage">Physical Stocktake Shortage</option>
                      <option value="Internal Use / Store Consumption">Internal Use / Store Consumption</option>
                      <option value="Theft / Inventory Shrinkage">Theft / Inventory Shrinkage</option>
                      <option value="Other Deduction">Other Deduction</option>
                    </>
                  ) : adjustType === "ADD" ? (
                    <>
                      <option value="Physical Stocktake Audit Surplus">Physical Stocktake Surplus (Found Extra)</option>
                      <option value="Supplier Free Sample / Promotion">Supplier Free Sample / Promotion</option>
                      <option value="Unrecorded Goods Receipt">Unrecorded Goods Receipt</option>
                      <option value="Other Addition">Other Addition</option>
                    </>
                  ) : (
                    <>
                      <option value="Physical Inventory Stocktake Count">Physical Inventory Stocktake Count</option>
                      <option value="Annual / Quarterly Audit Reconciliation">Quarterly / Annual Audit</option>
                    </>
                  )}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {adjustType === "SET_EXACT" ? "Actual Physical Count On Hand *" : "Quantity to " + (adjustType === "ADD" ? "Add" : "Deduct") + " *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    placeholder="0"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none pr-12"
                  />
                  <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
                    {selectedProductForAdjust.baseUnit}
                  </span>
                </div>
              </div>

              {/* Live Impact Preview */}
              {adjustQty && Number(adjustQty) > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-500">Resulting Stock:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Number(selectedProductForAdjust.currentStock)}
                    {" "}
                    {adjustType === "ADD" ? (
                      <span className="text-emerald-600">+{Number(adjustQty)}</span>
                    ) : adjustType === "DEDUCT" ? (
                      <span className="text-rose-600">-{Number(adjustQty)}</span>
                    ) : (
                      <span className="text-indigo-600">→</span>
                    )}
                    {" = "}
                    {adjustType === "ADD"
                      ? Number(selectedProductForAdjust.currentStock) + Number(adjustQty)
                      : adjustType === "DEDUCT"
                      ? Math.max(0, Number(selectedProductForAdjust.currentStock) - Number(adjustQty))
                      : Number(adjustQty)}{" "}
                    {selectedProductForAdjust.baseUnit}
                  </span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Audit Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Broken packaging discovered in Rack A3"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForAdjust(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAdjusting ? "Updating Stock..." : "Post Stock Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History / Complete Audit Ledger Modal */}
      {selectedProductForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Immutable Stock Ledger & Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedProductForHistory.name} {selectedProductForHistory.sku ? `(SKU: ${selectedProductForHistory.sku})` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForHistory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs">Loading immutable ledger entries...</span>
              </div>
            ) : stockHistoryData ? (
              <div className="space-y-4 pt-4 overflow-y-auto pr-1">
                {/* Categorized Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Opening Stock</span>
                    <p className="text-sm font-black font-mono text-slate-800 mt-0.5">
                      +{stockHistoryData.summary.openingStock}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase text-emerald-600">Purchases (+)</span>
                    <p className="text-sm font-black font-mono text-emerald-700 mt-0.5">
                      +{stockHistoryData.summary.totalPurchases}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200">
                    <span className="text-[10px] font-bold uppercase text-teal-600">Sales Returns (+)</span>
                    <p className="text-sm font-black font-mono text-teal-700 mt-0.5">
                      +{stockHistoryData.summary.totalSalesReturns}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                    <span className="text-[10px] font-bold uppercase text-rose-600">Sales Out (-)</span>
                    <p className="text-sm font-black font-mono text-rose-700 mt-0.5">
                      -{stockHistoryData.summary.totalSales}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="text-[10px] font-bold uppercase text-amber-700">Purchase Returns (-)</span>
                    <p className="text-sm font-black font-mono text-amber-800 mt-0.5">
                      -{stockHistoryData.summary.totalPurchaseReturns}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                    <span className="text-[10px] font-bold uppercase text-purple-700">Adjustments (+/-)</span>
                    <p className="text-sm font-black font-mono text-purple-800 mt-0.5">
                      {stockHistoryData.summary.totalAdjustments >= 0 ? "+" : ""}{stockHistoryData.summary.totalAdjustments}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 text-white flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Current Stock</span>
                      {stockHistoryData.summary.isAccurate ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="w-2.5 h-2.5" /> 100% Reconciled
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-400">Variance</span>
                      )}
                    </div>
                    <p className="text-lg font-black font-mono text-white mt-1">
                      {stockHistoryData.summary.liveStock} {stockHistoryData.product.baseUnit}
                    </p>
                  </div>
                </div>

                {/* Timeline Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Chronological Stock Movements</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {stockHistoryData.timeline.length} transactions recorded
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Date & Time</th>
                          <th className="px-3 py-2 font-semibold">Event Type</th>
                          <th className="px-3 py-2 font-semibold text-right">Change</th>
                          <th className="px-3 py-2 font-semibold text-right">Running Stock</th>
                          <th className="px-3 py-2 font-semibold">Reference / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockHistoryData.timeline.map((entry: any) => {
                          const isAdd = entry.changeQty > 0;
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                              <td className="px-3 py-2 text-slate-500 whitespace-nowrap font-sans">
                                {new Date(entry.date).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  entry.type === 'PURCHASE_IN'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : entry.type === 'RETURN_IN'
                                    ? 'bg-teal-100 text-teal-800'
                                    : entry.type === 'SALE_OUT'
                                    ? 'bg-rose-100 text-rose-800'
                                    : entry.type === 'CONSUMPTION_OUT'
                                    ? 'bg-amber-100 text-amber-800'
                                    : entry.type === 'INITIAL'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className={`px-3 py-2 text-right font-bold ${isAdd ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isAdd ? `+${entry.changeQty}` : entry.changeQty}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-900">
                                {entry.runningBalance}
                              </td>
                              <td className="px-3 py-2 text-slate-600 font-sans text-xs truncate max-w-xs" title={entry.note || entry.referenceId}>
                                {entry.note || entry.referenceId || "Direct ledger posting"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-100 flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setSelectedProductForHistory(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
