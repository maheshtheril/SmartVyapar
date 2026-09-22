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
  ArrowDownRight,
  Sparkles,
  Layers,
  Calculator,
  Percent,
  Info,
  ShoppingBag,
  ChefHat,
  Barcode,
  HelpCircle,
  Zap,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Camera,
  Maximize2,
  Minimize2,
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

  // Form State - World Standard ERP Product Master
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState<"RETAIL_ITEM"|"RAW_MATERIAL"|"FINISHED_GOOD">("RETAIL_ITEM");
  const [hsnCode, setHsnCode] = useState("9983");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [baseUnit, setBaseUnit] = useState("PCS");
  const [hasAltUnit, setHasAltUnit] = useState(false);
  const [altUnit, setAltUnit] = useState("");
  const [conversionFactor, setConversionFactor] = useState("10");
  const [initialStock, setInitialStock] = useState("0");
  const [minStockAlert, setMinStockAlert] = useState("5");
  const [hasBatchTracking, setHasBatchTracking] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string|null>(null);
  const [activeTab, setActiveTab] = useState<"GENERAL" | "PRICING" | "PACKAGING" | "INVENTORY">("GENERAL");
  const [isMaximized, setIsMaximized] = useState(true);

  // Handle local image file upload & conversion to Data URL
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 1MB limit: a 1MB file becomes ~1.35MB base64 — safely under Next.js 4MB body limit
    // (a 2MB file would become ~2.7MB base64 and risk silent 413 failures)
    if (file.size > 1 * 1024 * 1024) {
      setFormError("Product image file size must be under 1MB. Tip: compress the image before uploading.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageUrl(result);
      setImagePreview(result);
      setFormError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setImagePreview(null);
  };

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

  // Auto-generate EAN-13 Barcode (Prefix 890 for India)
  const generateEanBarcode = () => {
    const prefix = "890";
    let body = "";
    for (let i = 0; i < 9; i++) {
      body += Math.floor(Math.random() * 10);
    }
    const raw = prefix + body;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(raw[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setBarcode(`${raw}${checkDigit}`);
  };

  // Auto-generate SKU based on product name
  const generateSkuCode = () => {
    if (!name.trim()) return;
    const clean = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const prefix = clean.slice(0, 4) || "ITEM";
    const rand = Math.floor(1000 + Math.random() * 9000);
    setSku(`${prefix}-${rand}`);
  };

  // Auto-calculate selling price from cost + target margin %
  const handleMarginChange = (marginVal: string) => {
    const m = parseFloat(marginVal);
    const cost = parseFloat(purchasePrice || "0");
    if (!isNaN(m) && cost > 0 && m < 100) {
      const calcSelling = cost / (1 - m / 100);
      setSellingPrice(calcSelling.toFixed(2));
    }
  };

  // Live Gross Margin & Pricing Math
  const costNum = parseFloat(purchasePrice || "0");
  const sellNum = parseFloat(sellingPrice || "0");
  const mrpNum = parseFloat(mrp || "0");
  const profitNum = sellNum - costNum;
  const marginPct = sellNum > 0 ? ((profitNum / sellNum) * 100).toFixed(1) : "0";
  const markupPct = costNum > 0 ? ((profitNum / costNum) * 100).toFixed(1) : "0";
  const isSellingAboveMrp = mrpNum > 0 && sellNum > mrpNum;
  const isLoss = costNum > 0 && sellNum > 0 && profitNum < 0;

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Product Name is required");
      setActiveTab("GENERAL");
      return;
    }
    if (!sellingPrice || Number(sellingPrice) < 0) {
      setFormError("Valid Selling Price is required");
      setActiveTab("PRICING");
      return;
    }
    if (mrp && Number(sellingPrice) > Number(mrp)) {
      setFormError(`Selling Price (₹${sellingPrice}) cannot exceed Maximum Retail Price MRP (₹${mrp}) under Legal Metrology Act`);
      setActiveTab("PRICING");
      return;
    }
    if (hasAltUnit && (!altUnit.trim() || Number(conversionFactor) <= 1)) {
      setFormError("When packaging unit is enabled, Packaging Unit Name and conversion factor (> 1) are required");
      setActiveTab("PACKAGING");
      return;
    }

    setSaving(true);
    try {
      const conv = hasAltUnit ? Number(conversionFactor || 1) : 1;
      const cost = Number(purchasePrice || 0);
      const sell = Number(sellingPrice);

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || undefined,
          productType,
          sku: sku.trim() || undefined,
          barcode: barcode.trim() || undefined,
          hsnCode: hsnCode.trim() || "9983",
          baseUnit,
          hasAltUnit,
          altUnit: hasAltUnit && altUnit.trim() ? altUnit.trim().toUpperCase() : undefined,
          conversionFactor: conv,
          purchasePrice: cost,
          purchasePricePerAlt: hasAltUnit ? cost * conv : undefined,
          sellingPrice: sell,
          sellingPricePerAlt: hasAltUnit ? sell * conv : undefined,
          mrp: mrp ? Number(mrp) : undefined,
          gstRate: Number(gstRate),
          initialStock: Number(initialStock || 0),
          minStockAlert: Number(minStockAlert || 5),
          hasBatchTracking,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      // Handle 413 Payload Too Large — typically caused by a large base64 image
      if (res.status === 413) {
        throw new Error("Request too large — the product image is too big. Please use an image under 1MB.");
      }
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to create product");
      }

      setShowModal(false);
      // Reset form
      setName("");
      setCategory("");
      setImageUrl("");
      setImagePreview(null);
      setProductType("RETAIL_ITEM");
      setSku("");
      setBarcode("");
      setHsnCode("9983");
      setPurchasePrice("");
      setSellingPrice("");
      setMrp("");
      setGstRate("18");
      setBaseUnit("PCS");
      setHasAltUnit(false);
      setAltUnit("");
      setConversionFactor("10");
      setInitialStock("0");
      setMinStockAlert("5");
      setHasBatchTracking(false);
      setFormError(null);
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || "Failed to create product");
    } finally {
      setSaving(false);
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

      {/* Low Stock Alert Banner */}
      {(() => {
        const lowStockItems = products.filter(
          (p) => Number(p.currentStock) <= Number(p.minStockAlert)
        );
        if (lowStockItems.length === 0) return null;
        return (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-rose-800">
                    ⚠️ {lowStockItems.length} Product{lowStockItems.length > 1 ? 's' : ''} Below Reorder Level
                  </p>
                  <p className="text-[11px] text-rose-600 font-medium">
                    Restock these items before they run out completely
                  </p>
                </div>
              </div>
              <Link
                href="/inventory/barcode-generator"
                className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-white border border-rose-200 px-2.5 py-1.5 rounded-xl hover:bg-rose-100 transition shadow-xs"
              >
                <Tag className="h-3.5 w-3.5" />
                Print Restock Labels
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lowStockItems.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-xl px-2.5 py-1.5 text-[11px] shadow-xs"
                >
                  <Package className="h-3 w-3 text-rose-400 shrink-0" />
                  <span className="font-bold text-slate-800 truncate max-w-[140px]">{item.name}</span>
                  <span className="text-rose-600 font-black whitespace-nowrap">
                    {Number(item.currentStock)}{item.baseUnit || 'PCS'}
                    <span className="text-slate-400 font-normal"> / min {Number(item.minStockAlert)}</span>
                  </span>
                </div>
              ))}
              {lowStockItems.length > 12 && (
                <div className="flex items-center px-2.5 py-1.5 text-[11px] font-bold text-rose-600">
                  +{lowStockItems.length - 12} more...
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <Package className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                              {item.sku && <span>SKU: {item.sku}</span>}
                              {item.barcode && <span>• Barcode: {item.barcode}</span>}
                            </div>
                          </div>
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

      {/* World-Standard ERP Product Master Studio Modal */}
      {showModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs ${isMaximized ? 'p-0 sm:p-2' : 'p-3 sm:p-6'} overflow-hidden`}>
          <div className={`w-full bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 ${
            isMaximized
              ? 'h-full sm:h-[97vh] max-w-[98vw] sm:rounded-2xl'
              : 'max-w-4xl max-h-[90vh] rounded-3xl my-auto'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-extrabold text-slate-900">Add New Product Master</h3>
                    <span className="rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5">
                      ERP Master
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Configure SKU, pricing, dual UOM packaging & statutory GST</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
                  title={isMaximized ? "Restore window size" : "Maximize window (Full Screen)"}
                >
                  {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Live Financial Margin KPI Strip */}
            <div className="bg-slate-900 px-6 py-3 text-white">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cost Price</span>
                  <p className="font-bold text-slate-200 text-sm mt-0.5">
                    ₹{costNum > 0 ? costNum.toFixed(2) : '0.00'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Selling Price</span>
                  <p className="font-bold text-white text-sm mt-0.5">
                    ₹{sellNum > 0 ? sellNum.toFixed(2) : '0.00'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Gross Margin</span>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <span className={`font-bold text-sm ${isLoss ? 'text-rose-400' : profitNum > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {profitNum >= 0 ? `+₹${profitNum.toFixed(2)}` : `-₹${Math.abs(profitNum).toFixed(2)}`}
                    </span>
                    {sellNum > 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${isLoss ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        {marginPct}%
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Legal Metrology</span>
                  <div className="mt-0.5">
                    {isSellingAboveMrp ? (
                      <span className="text-[11px] font-bold text-rose-400 flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Exceeds MRP!</span>
                      </span>
                    ) : mrpNum > 0 ? (
                      <span className="text-xs text-slate-300 font-semibold">MRP ₹{mrpNum.toFixed(2)}</span>
                    ) : (
                      <span className="text-xs text-slate-500">No MRP set</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-white px-6">
              {[
                { id: "GENERAL", label: "1. Identity & Classification", icon: ShoppingBag },
                { id: "PRICING", label: "2. Pricing & GST", icon: Calculator },
                { id: "PACKAGING", label: "3. Units & Packaging", icon: Layers },
                { id: "INVENTORY", label: "4. Stock & Tracking", icon: Boxes },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-3 px-3 text-xs font-bold border-b-2 transition ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Error Banner */}
            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Body / Tab Content */}
            <form onSubmit={handleCreateProduct} className="px-5 py-3 space-y-3 flex-1 overflow-y-auto">
              {/* TAB 1: Identity & Classification */}
              {activeTab === "GENERAL" && (
                <div className="space-y-3">
                  {/* Product Classification — compact inline pills */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Product Type *
                    </label>
                    <div className="flex items-center gap-2">
                      {[
                        { type: "RETAIL_ITEM", title: "Retail Goods", icon: "🛒" },
                        { type: "RAW_MATERIAL", title: "Raw Material", icon: "🧱" },
                        { type: "FINISHED_GOOD", title: "Finished Recipe", icon: "🍽️" },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setProductType(item.type as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            productType === item.type
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Product Image — compact inline row */}
                  <div className="flex items-center gap-3">
                    {/* Small thumbnail */}
                    <div className="relative h-13 w-13 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 group" style={{height:'52px',width:'52px'}}>
                      {imagePreview || imageUrl ? (
                        <>
                          <img src={imagePreview || imageUrl} alt="Product" className="h-full w-full object-cover" onError={() => setImagePreview(null)} />
                          <button type="button" onClick={handleRemoveImage} className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-xl">
                            <Trash2 className="h-3.5 w-3.5 text-rose-300" />
                          </button>
                        </>
                      ) : (
                        <label htmlFor="product-image-file" className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-slate-100 transition rounded-xl">
                          <Camera className="h-4 w-4 text-slate-400" />
                          <span className="text-[8px] font-bold text-indigo-500 mt-0.5">Photo</span>
                        </label>
                      )}
                    </div>
                    {/* Upload + URL input */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label htmlFor="product-image-file" className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shrink-0">
                          <UploadCloud className="h-3 w-3 text-indigo-500" />
                          <span>Browse from Computer / Device</span>
                        </label>
                        <input id="product-image-file" type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                        <span className="text-[10px] text-slate-400">PNG/JPG ≤ 1MB</span>
                        {(imagePreview || imageUrl) && (
                          <button type="button" onClick={handleRemoveImage} className="inline-flex items-center gap-1 text-[10px] text-rose-500 hover:text-rose-700 font-semibold">
                            <Trash2 className="h-3 w-3" /><span>Clear</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="Or paste image URL (https://...)"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value || null); }}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Product Name + Category — same row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Product / Item Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Amul Gold Milk 500ml"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 font-medium focus:border-indigo-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Category / Brand
                      </label>
                      <input
                        type="text"
                        list="category-suggestions"
                        placeholder="e.g. Electricals, Groceries"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                      <datalist id="category-suggestions">
                        <option value="Electrical & Lighting" />
                        <option value="Automobile Parts & Lubricants" />
                        <option value="Groceries & Packaged Foods" />
                        <option value="Beverages & Dairy" />
                        <option value="Hardware & Sanitary" />
                        <option value="Pharmaceuticals & Wellness" />
                        <option value="Textiles & Garments" />
                        <option value="Electronics & Accessories" />
                      </datalist>
                    </div>
                  </div>

                  {/* SKU, Barcode, HSN */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* SKU */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">SKU Code</label>
                        <button
                          type="button"
                          onClick={generateSkuCode}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5"
                        >
                          <Zap className="h-2.5 w-2.5" />
                          <span>Generate</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. POL-25-01"
                        value={sku}
                        onChange={(e) => setSku(e.target.value.toUpperCase())}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none uppercase"
                      />
                    </div>

                    {/* Barcode */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Barcode / EAN-13</label>
                        <button
                          type="button"
                          onClick={generateEanBarcode}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5"
                        >
                          <Barcode className="h-2.5 w-2.5" />
                          <span>Generate EAN</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 8901234567890"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>

                    {/* HSN Code */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        HSN / SAC Code *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 8544 or 8708"
                        value={hsnCode}
                        onChange={(e) => setHsnCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Common HSN quick selector badges */}
                  <div className="flex items-center space-x-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-400 font-semibold">Common HSNs:</span>
                    {[
                      { code: "8544", name: "Cables/Wires" },
                      { code: "8708", name: "Auto Parts" },
                      { code: "9983", name: "Services" },
                      { code: "2106", name: "Food Prep" },
                      { code: "3004", name: "Medicines" },
                      { code: "8471", name: "IT Hardware" },
                    ].map((hsn) => (
                      <button
                        key={hsn.code}
                        type="button"
                        onClick={() => setHsnCode(hsn.code)}
                        className={`rounded-md px-1.5 py-0.5 font-bold transition ${
                          hsnCode === hsn.code
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {hsn.code} ({hsn.name})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: Pricing & GST */}
              {activeTab === "PRICING" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Purchase Price */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Purchase Cost Price (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Cost per atomic unit excl. GST</p>
                    </div>

                    {/* Target Margin % */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Margin (%)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs font-bold">%</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="99"
                          placeholder="e.g. 25"
                          onChange={(e) => handleMarginChange(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-indigo-600 mt-1 font-medium">Auto-calculates selling price</p>
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Selling Price (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600 text-xs font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={sellingPrice}
                          onChange={(e) => setSellingPrice(e.target.value)}
                          className="w-full rounded-xl border border-indigo-400 pl-7 pr-3 py-2 text-xs font-mono font-black text-indigo-900 focus:border-indigo-600 focus:outline-none bg-indigo-50/20"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Base price charged to customers</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* MRP */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        MRP (Maximum Retail Price ₹)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Printed packet MRP"
                          value={mrp}
                          onChange={(e) => setMrp(e.target.value)}
                          className={`w-full rounded-xl border pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                            isSellingAboveMrp ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 text-slate-900 focus:border-indigo-600'
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Legal Metrology Act: Selling price cannot exceed MRP</p>
                    </div>

                    {/* GST Rate */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        GST Tax Rate (%)
                      </label>
                      <select
                        value={gstRate}
                        onChange={(e) => setGstRate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                      >
                        <option value="0">0% - Nil Rated / Exempt Goods</option>
                        <option value="5">5% - Essential Goods (Food/Medicines)</option>
                        <option value="12">12% - Standard Concessional</option>
                        <option value="18">18% - Standard GST Rate</option>
                        <option value="28">28% - Luxury & Automobile Parts</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">CGST + SGST split 50/50 automatically</p>
                    </div>
                  </div>

                  {/* Live Tax Computation Card */}
                  {sellNum > 0 && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Live Statutory Invoice Breakdown (at {gstRate}% GST)
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans">Taxable Value:</span>
                          <p className="font-bold text-slate-800">₹{sellNum.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans">GST Amount:</span>
                          <p className="font-bold text-indigo-600">+₹{(sellNum * (Number(gstRate) / 100)).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans">Final Invoice Total:</span>
                          <p className="font-black text-slate-900">₹{(sellNum * (1 + Number(gstRate) / 100)).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Units & Packaging */}
              {activeTab === "PACKAGING" && (
                <div className="space-y-4">
                  {/* Base Atomic Unit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Base Atomic Unit (Stock Tracking Unit) *
                    </label>
                    <select
                      value={baseUnit}
                      onChange={(e) => setBaseUnit(e.target.value)}
                      className="w-full sm:w-64 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                    >
                      <option value="PCS">PCS - Pieces / Units</option>
                      <option value="KG">KG - Kilograms</option>
                      <option value="GMS">GMS - Grams</option>
                      <option value="LTR">LTR - Litres</option>
                      <option value="ML">ML - Millilitres</option>
                      <option value="MTR">MTR - Metres</option>
                      <option value="BOX">BOX - Box</option>
                      <option value="NOS">NOS - Numbers</option>
                      <option value="CAN">CAN - Cans</option>
                      <option value="BTL">BTL - Bottles</option>
                      <option value="PKT">PKT - Packets</option>
                      <option value="DOZ">DOZ - Dozens</option>
                      <option value="SET">SET - Sets</option>
                      <option value="ROLL">ROLL - Rolls</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Every internal stock deduction and accounting entry will strictly track in this unit.
                    </p>
                  </div>

                  {/* Dual Packaging Toggle */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Enable Dual UOM / Bulk Packaging
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Allow buying and selling in wholesale boxes, cartons, or strips with automatic piece conversion.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasAltUnit}
                          onChange={(e) => setHasAltUnit(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {hasAltUnit && (
                      <div className="pt-2 border-t border-slate-200 space-y-3 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Packaging Unit Name (e.g. BOX, CASE, STRIP) *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. BOX"
                              value={altUnit}
                              onChange={(e) => setAltUnit(e.target.value.toUpperCase())}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold uppercase text-slate-900 focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Conversion Factor (1 {altUnit || 'BOX'} = ? {baseUnit}) *
                            </label>
                            <input
                              type="number"
                              min="2"
                              step="1"
                              placeholder="e.g. 10"
                              value={conversionFactor}
                              onChange={(e) => setConversionFactor(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        {/* Packaging Economics Preview */}
                        <div className="p-3 rounded-xl bg-white border border-indigo-100 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 font-sans">1 {altUnit || 'BOX'} Cost:</span>
                            <p className="font-bold text-slate-800">
                              ₹{(costNum * Number(conversionFactor || 1)).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-sans">1 {altUnit || 'BOX'} Sell Price:</span>
                            <p className="font-bold text-indigo-700">
                              ₹{(sellNum * Number(conversionFactor || 1)).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-sans">Unit Multiplier:</span>
                            <p className="font-bold text-slate-700">
                              {conversionFactor}x {baseUnit}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Stock & Tracking */}
              {activeTab === "INVENTORY" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Opening Stock */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Opening Stock Quantity (in {baseUnit})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="0"
                        value={initialStock}
                        onChange={(e) => setInitialStock(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Initial physical count at setup. Creates immutable INITIAL stock ledger log.
                      </p>
                    </div>

                    {/* Min Stock Alert */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Minimum Stock Alert Threshold (Re-Order Point)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="5"
                        value={minStockAlert}
                        onChange={(e) => setMinStockAlert(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Alert badge appears on dashboard when inventory falls to or below this level.
                      </p>
                    </div>
                  </div>

                  {/* Batch Tracking Checkbox */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="batch-tracking-checkbox"
                        checked={hasBatchTracking}
                        onChange={(e) => setHasBatchTracking(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="batch-tracking-checkbox" className="cursor-pointer">
                        <p className="text-xs font-bold text-slate-800">
                          Enable Batch & Expiry Date Tracking (FIFO / FEFO)
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Recommended for pharmaceuticals, perishable goods, chemicals, and cosmetics. Requires entering Batch Number, Mfd Date, and Exp Date during GRN purchase inward.
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Sticky Modal Action Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {activeTab !== "GENERAL" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === "INVENTORY") setActiveTab("PACKAGING");
                        else if (activeTab === "PACKAGING") setActiveTab("PRICING");
                        else if (activeTab === "PRICING") setActiveTab("GENERAL");
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      ← Previous
                    </button>
                  )}

                  {activeTab !== "INVENTORY" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === "GENERAL") setActiveTab("PRICING");
                        else if (activeTab === "PRICING") setActiveTab("PACKAGING");
                        else if (activeTab === "PACKAGING") setActiveTab("INVENTORY");
                      }}
                      className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition"
                    >
                      Next Step →
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving Product...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Save Product & Sync Inventory</span>
                      </>
                    )}
                  </button>
                </div>
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
