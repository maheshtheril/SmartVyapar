'use client';

import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Truck,
  Building2,
  Calendar,
  Percent,
  Plus,
  Trash2,
  Printer,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowRight,
  TrendingUp,
  Landmark,
  FileText,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Layers
} from 'lucide-react';
import BarcodeSvg from '@/components/BarcodeSvg';

interface PurchaseItemRow {
  productId?: string;
  productName: string;
  hsnCode: string;
  unit: string;
  quantity: number;
  packageSize: number;
  purchasePrice: number;
  discountPercent: number;
  marginPercent: number;
  sellingPrice: number;
  mrp: number;
  gstRate: number;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
}

export default function PurchaseInwardPage() {
  const [activeTab, setActiveTab] = useState<'NEW_BILL' | 'REGISTER'>('NEW_BILL');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);

  // Inward Register & History
  const [bills, setBills] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [searchFilter, setSearchFilter] = useState('');

  // Selected Bill for GRN Print or Barcode Print Modal
  const [selectedBillForGrn, setSelectedBillForGrn] = useState<any>(null);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState<any>(null);
  const [barcodeLabelCount, setBarcodeLabelCount] = useState<number>(10);
  const [barcodeLayout, setBarcodeLayout] = useState<'50x25' | '38x25' | 'a4'>('50x25');

  // New Purchase Bill Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('CREDIT');
  const [notes, setNotes] = useState('');

  // Line items
  const [items, setItems] = useState<PurchaseItemRow[]>([
    {
      productName: '',
      hsnCode: '8708',
      unit: 'PCS',
      quantity: 1,
      packageSize: 1,
      purchasePrice: 0,
      discountPercent: 0,
      marginPercent: 30,
      sellingPrice: 0,
      mrp: 0,
      gstRate: 18,
      batchNumber: '',
      mfgDate: '',
      expiryDate: '',
    },
  ]);

  // Load products, warehouses, and tenant metadata
  const loadInitialData = async () => {
    try {
      const [prodRes, whRes, tenantRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/warehouses'),
        fetch('/api/tenant'),
      ]);

      const prodData = await prodRes.json();
      const whData = await whRes.json();
      const tenantData = await tenantRes.json();

      if (prodData.success && prodData.products) setProducts(prodData.products);
      if (whData.success && whData.warehouses) {
        setWarehouses(whData.warehouses);
        if (whData.warehouses.length > 0 && !warehouseId) {
          const def = whData.warehouses.find((w: any) => w.isDefault) || whData.warehouses[0];
          setWarehouseId(def.id);
        }
      }
      if (tenantData.success && tenantData.tenant) setTenant(tenantData.tenant);
    } catch (err) {
      console.error('Failed to load purchase master data:', err);
    }
  };

  // Load purchase bills register
  const loadBills = async () => {
    setLoading(true);
    try {
      const url = searchFilter ? `/api/purchase?search=${encodeURIComponent(searchFilter)}` : '/api/purchase';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBills(data.bills || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load purchase bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'REGISTER') {
      loadBills();
    }
  }, [activeTab, searchFilter]);

  // Quick Supplier Auto-fill presets
  const applySupplierPreset = (preset: 'BOSCH' | 'CASTROL' | 'EXIDE') => {
    if (preset === 'BOSCH') {
      setSupplierName('Bosch Automotive Aftermarket India Ltd');
      setSupplierGstin('29AAACB2021A1Z8');
      setSupplierPhone('1800 108 1234');
    } else if (preset === 'CASTROL') {
      setSupplierName('Castrol Lubricants Distribution Ltd');
      setSupplierGstin('32AABCC3344P1ZV');
      setSupplierPhone('1800 222 100');
    } else if (preset === 'EXIDE') {
      setSupplierName('Exide Industries India Ltd');
      setSupplierGstin('32AAACE4455Q1ZT');
      setSupplierPhone('1800 103 5454');
    }
  };

  // Handle line item field change with bidirectional margin calculation
  const updateItem = (index: number, field: keyof PurchaseItemRow, value: any) => {
    const updated = [...items];
    const row: any = { ...updated[index], [field]: value };

    // If product selected from catalog
    if (field === 'productId') {
      const selected = products.find((p) => p.id === value);
      if (selected) {
        row.productName = selected.name;
        row.hsnCode = selected.hsnCode || '8708';
        row.unit = selected.baseUnit || 'PCS';
        row.purchasePrice = Number(selected.purchasePrice || 0);
        row.gstRate = Number(selected.gstRate || 18);
        row.sellingPrice = Number(selected.sellingPrice || 0);
        row.mrp = Number(selected.mrp || selected.sellingPrice || 0);
        if (row.purchasePrice > 0 && row.sellingPrice > 0) {
          row.marginPercent = Math.round(((row.sellingPrice - row.purchasePrice) / row.purchasePrice) * 1000) / 10;
        }
      }
    }

    // Bidirectional Margin Engine:
    // If purchasePrice, discount, or marginPercent changed -> compute new sellingPrice
    if (field === 'purchasePrice' || field === 'discountPercent' || field === 'marginPercent') {
      const cost = Number(row.purchasePrice || 0) * (1 - Number(row.discountPercent || 0) / 100);
      const margin = Number(row.marginPercent || 0);
      row.sellingPrice = Math.round(cost * (1 + margin / 100) * 100) / 100;
      if (!row.mrp || Number(row.mrp) < row.sellingPrice) {
        row.mrp = row.sellingPrice;
      }
    } else if (field === 'sellingPrice') {
      // If user manually changed sellingPrice -> compute marginPercent
      const cost = Number(row.purchasePrice || 0) * (1 - Number(row.discountPercent || 0) / 100);
      const sp = Number(value || 0);
      if (cost > 0) {
        row.marginPercent = Math.round(((sp - cost) / cost) * 1000) / 10;
      }
      if (!row.mrp || Number(row.mrp) < sp) {
        row.mrp = sp;
      }
    }

    updated[index] = row;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        productName: '',
        hsnCode: '8708',
        unit: 'PCS',
        quantity: 1,
        packageSize: 1,
        purchasePrice: 0,
        discountPercent: 0,
        marginPercent: 30,
        sellingPrice: 0,
        mrp: 0,
        gstRate: 18,
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Tax and Total Calculations
  const isInterState = supplierGstin && supplierGstin.length >= 2 && tenant?.stateCode
    ? supplierGstin.substring(0, 2) !== tenant.stateCode
    : false;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let grandTotal = 0;
  let projectedGrossProfit = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity || 0);
    const cost = Number(item.purchasePrice || 0) * (1 - Number(item.discountPercent || 0) / 100);
    const taxable = Math.round(cost * qty * 100) / 100;
    const gst = Number(item.gstRate || 18);

    totalTaxable += taxable;

    if (isInterState) {
      totalIgst += Math.round((taxable * gst) / 100 * 100) / 100;
    } else {
      totalCgst += Math.round((taxable * (gst / 2)) / 100 * 100) / 100;
      totalSgst += Math.round((taxable * (gst / 2)) / 100 * 100) / 100;
    }

    const sp = Number(item.sellingPrice || 0);
    projectedGrossProfit += Math.max(0, (sp - cost) * qty * Number(item.packageSize || 1));
  });

  grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;

  // Submit Form
  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !billNumber) {
      alert('Please provide Supplier Name and Bill Number');
      return;
    }

    if (items.some((i) => !i.productName || Number(i.quantity) <= 0 || Number(i.purchasePrice) <= 0)) {
      alert('Please ensure all items have a valid Part Name, Quantity (>0), and Purchase Price (>0)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierName,
        supplierGstin,
        supplierPhone,
        billNumber,
        billDate,
        warehouseId,
        paymentTerms,
        notes,
        items,
      };

      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create purchase bill');
      }

      alert(`✅ Success! Purchase Bill & GRN ${data.bill?.grnNumber || ''} has been confirmed and posted to inventory & ledger.`);
      
      // Reset form
      setBillNumber('');
      setSupplierName('');
      setSupplierGstin('');
      setNotes('');
      setItems([
        {
          productName: '',
          hsnCode: '8708',
          unit: 'PCS',
          quantity: 1,
          packageSize: 1,
          purchasePrice: 0,
          discountPercent: 0,
          marginPercent: 30,
          sellingPrice: 0,
          mrp: 0,
          gstRate: 18,
          batchNumber: '',
          mfgDate: '',
          expiryDate: '',
        },
      ]);
      setActiveTab('REGISTER');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-100">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Purchase Bills & GRN Inward
              </h1>
              <p className="text-sm text-slate-500">
                Batchwise Goods Receipt Note (GRN), dynamic sales margin engine, and barcode label printing
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setActiveTab('NEW_BILL')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'NEW_BILL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Plus className="w-4 h-4" />
            New Purchase / GRN
          </button>
          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'REGISTER'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Inward Register
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Purchases</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            ₹{summary.totalPurchaseValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-[11px] text-slate-400">{summary.totalBillsCount || 0} Bills Inwarded</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Input Tax Credit (ITC)</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            ₹{summary.totalItcClaimed?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-[11px] text-emerald-700">Claimable against Sales GST</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Accounts Payable (Khata)</span>
          <div className="text-xl font-bold text-amber-600 mt-1">
            ₹{summary.totalUnpaidPayables?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-[11px] text-amber-700">Pending Distributor Settlements</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Projected Consignment Profit</span>
          <div className="text-xl font-bold text-blue-600 mt-1">
            ₹{projectedGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-blue-700">From Current Purchase Consignment</span>
        </div>
      </div>

      {/* TAB 1: NEW PURCHASE BILL & GRN FORM */}
      {activeTab === 'NEW_BILL' && (
        <form onSubmit={handleSubmitBill} className="space-y-6">
          {/* Supplier & Consignment Header Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" /> Supplier & Consignment Header
                </h2>
                <p className="text-xs text-slate-500">Enter vendor bill metadata and receiving warehouse details</p>
              </div>

              {/* Quick Supplier Presets */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 text-[11px] mr-1">Quick Vendor:</span>
                <button
                  type="button"
                  onClick={() => applySupplierPreset('CASTROL')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                >
                  Castrol
                </button>
                <button
                  type="button"
                  onClick={() => applySupplierPreset('BOSCH')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                >
                  Bosch
                </button>
                <button
                  type="button"
                  onClick={() => applySupplierPreset('EXIDE')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                >
                  Exide
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Supplier Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bosch Automotive India Ltd"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Supplier GSTIN
                </label>
                <input
                  type="text"
                  placeholder="e.g. 29AAACB2021A1Z8"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Supplier Bill / Invoice # <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOS-INV-2026-99"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Bill Date
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Receiving Warehouse / Godown
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="CREDIT">Credit Khata (Creditor Payable - A/c 2000)</option>
                  <option value="BANK_TRANSFER">Bank Net Banking / RTGS (A/c 1010)</option>
                  <option value="UPI">UPI Payment (A/c 1010)</option>
                  <option value="CASH">Counter Cash Payout (A/c 1000)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tax Supply Type
                </label>
                <div className="text-xs px-3 py-2 rounded-lg bg-slate-100 font-semibold flex items-center justify-between">
                  <span>{isInterState ? 'Inter-State Inward (IGST)' : 'Intra-State Inward (CGST + SGST)'}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${isInterState ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isInterState ? 'IGST' : 'CGST/SGST'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Fledged Line Items Grid with Margin Engine */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Line Items (Batchwise Inward & Sales Margin Engine)
                </h2>
                <p className="text-xs text-slate-500">
                  Set cost price, target sales margin %, and auto-calculate selling price with batch & expiry
                </p>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Part / Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Item Title / SKU</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Batch & Expiry</th>
                    <th className="py-2.5 px-3 w-28">Qty & Unit</th>
                    <th className="py-2.5 px-3 w-28 text-right">Cost Price (₹)</th>
                    <th className="py-2.5 px-3 w-24 text-right">Disc %</th>
                    <th className="py-2.5 px-3 min-w-[140px] text-center bg-blue-50/50 text-blue-900">Margin % & Selling Price</th>
                    <th className="py-2.5 px-3 w-24 text-right">MRP (₹)</th>
                    <th className="py-2.5 px-3 w-20 text-center">GST %</th>
                    <th className="py-2.5 px-3 w-28 text-right">Line Total (₹)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => {
                    const cost = Number(row.purchasePrice || 0) * (1 - Number(row.discountPercent || 0) / 100);
                    const sp = Number(row.sellingPrice || 0);
                    const unitProfit = Math.round((sp - cost) * 100) / 100;
                    const taxable = Math.round(cost * Number(row.quantity || 0) * 100) / 100;
                    const gst = Number(row.gstRate || 18);
                    const lineTotal = Math.round((taxable * (1 + gst / 100)) * 100) / 100;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-center">{idx + 1}</td>

                        {/* Part Name / Product Selection */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            required
                            placeholder="Part Name (e.g. Castrol 5W40 Oil)"
                            value={row.productName}
                            onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-medium mb-1"
                          />
                          <select
                            onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                            className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-500 bg-slate-50"
                          >
                            <option value="">-- Match from Product Catalog --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Batch Number & Expiry Date */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Batch # (CAS-2026)"
                            value={row.batchNumber}
                            onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono mb-1 uppercase"
                          />
                          <input
                            type="date"
                            placeholder="Expiry Date"
                            value={row.expiryDate}
                            onChange={(e) => updateItem(idx, 'expiryDate', e.target.value)}
                            className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 bg-slate-50"
                          />
                        </td>

                        {/* Quantity & Unit */}
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1 mb-1">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              required
                              value={row.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className="w-16 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                            />
                            <select
                              value={row.unit}
                              onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                              className="w-14 border border-slate-300 rounded px-1 py-1 text-[11px] font-semibold"
                            >
                              <option value="PCS">PCS</option>
                              <option value="CAN">CAN</option>
                              <option value="BOX">BOX</option>
                              <option value="SET">SET</option>
                              <option value="KG">KG</option>
                              <option value="LTR">LTR</option>
                            </select>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            HSN: <input
                              type="text"
                              value={row.hsnCode}
                              onChange={(e) => updateItem(idx, 'hsnCode', e.target.value)}
                              className="w-12 border-b border-slate-300 font-mono text-[10px]"
                            />
                          </div>
                        </td>

                        {/* Purchase Cost Price */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={row.purchasePrice}
                            onChange={(e) => updateItem(idx, 'purchasePrice', e.target.value)}
                            className="w-20 border border-slate-300 rounded px-2 py-1 text-xs text-right font-mono font-bold"
                          />
                          {row.discountPercent > 0 && (
                            <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                              Net: ₹{cost.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Discount % */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={row.discountPercent}
                            onChange={(e) => updateItem(idx, 'discountPercent', e.target.value)}
                            className="w-14 border border-slate-300 rounded px-1.5 py-1 text-xs text-right font-mono"
                          />
                        </td>

                        {/* SALES MARGIN & SELLING PRICE (WORLD STANDARD BIDIRECTIONAL ENGINE) */}
                        <td className="py-2.5 px-3 bg-blue-50/40">
                          <div className="flex items-center gap-1.5 justify-center mb-1">
                            <div className="flex items-center">
                              <input
                                type="number"
                                step="0.1"
                                value={row.marginPercent}
                                onChange={(e) => updateItem(idx, 'marginPercent', e.target.value)}
                                className="w-12 border border-blue-300 rounded px-1 py-0.5 text-xs text-right font-mono font-bold text-blue-700 bg-white"
                              />
                              <span className="text-[10px] font-bold text-blue-700 ml-0.5">%</span>
                            </div>
                            <span className="text-slate-400 text-[10px]">&rarr;</span>
                            <div className="flex items-center">
                              <span className="text-[10px] font-bold text-slate-500 mr-0.5">₹</span>
                              <input
                                type="number"
                                step="any"
                                value={row.sellingPrice}
                                onChange={(e) => updateItem(idx, 'sellingPrice', e.target.value)}
                                className="w-16 border border-emerald-300 rounded px-1.5 py-0.5 text-xs text-right font-mono font-bold text-emerald-700 bg-white"
                              />
                            </div>
                          </div>
                          {/* Live Profit Margin Badge */}
                          <div className="text-center">
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                              unitProfit > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              Profit: ₹{unitProfit.toFixed(2)} ({row.marginPercent}%)
                            </span>
                          </div>
                        </td>

                        {/* MRP */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={row.mrp}
                            onChange={(e) => updateItem(idx, 'mrp', e.target.value)}
                            className="w-20 border border-slate-300 rounded px-2 py-1 text-xs text-right font-mono"
                          />
                        </td>

                        {/* GST % */}
                        <td className="py-2.5 px-3 text-center">
                          <select
                            value={row.gstRate}
                            onChange={(e) => updateItem(idx, 'gstRate', e.target.value)}
                            className="border border-slate-300 rounded px-1.5 py-1 text-xs font-mono font-bold bg-white"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>

                        {/* Line Total */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Delete Button */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className="text-slate-400 hover:text-rose-600 transition disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Consignment Financial Summary Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block">Taxable Subtotal:</span>
                  <span className="font-bold text-slate-800">₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total GST Input Credit:</span>
                  <span className="font-bold text-emerald-600">₹{(totalCgst + totalSgst + totalIgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Projected Retail Margin:</span>
                  <span className="font-bold text-blue-600">₹{projectedGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold block">Grand Total Inward:</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Confirming Inward...' : 'Confirm Inward & Post to Books'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: INWARD REGISTER & BILLS HISTORY */}
      {activeTab === 'REGISTER' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by GRN #, Supplier Bill #, Vendor..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={loadBills}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">GRN #</th>
                    <th className="py-3 px-4">Supplier Bill #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Items Count</th>
                    <th className="py-3 px-4 text-right">Taxable (₹)</th>
                    <th className="py-3 px-4 text-right">GST (₹)</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {bills.length > 0 ? (
                    bills.map((bill) => {
                      const gstTotal = Number(bill.cgstAmount) + Number(bill.sgstAmount) + Number(bill.igstAmount);
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-blue-700">{bill.grnNumber || 'GRN-MANUAL'}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{bill.billNumber}</td>
                          <td className="py-3 px-4 font-sans text-slate-600">
                            {new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-900">{bill.supplierName}</td>
                          <td className="py-3 px-4 font-sans text-slate-600">{bill.items?.length || 0} Parts</td>
                          <td className="py-3 px-4 text-right text-slate-700">
                            ₹{Number(bill.totalTaxable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                            ₹{gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            ₹{Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center font-sans">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedBillForGrn(bill)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" /> GRN Slip
                              </button>
                              {bill.items && bill.items.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedItemForBarcode(bill.items[0]);
                                    setBarcodeLabelCount(Math.max(1, Math.floor(Number(bill.items[0].quantity || 10))));
                                  }}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold flex items-center gap-1"
                                >
                                  <Barcode className="w-3 h-3" /> Barcodes
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                        No purchase bills found. Create your first inward bill above to generate GRNs and batches.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: STATUTORY GOODS RECEIPT NOTE (GRN) SLIP */}
      {selectedBillForGrn && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Statutory Goods Receipt</span>
                <h2 className="text-xl font-bold text-slate-900">Goods Receipt Note (GRN)</h2>
                <span className="font-mono text-xs text-slate-500 font-bold">{selectedBillForGrn.grnNumber || 'GRN-2026-XXXX'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print GRN
                </button>
                <button
                  onClick={() => setSelectedBillForGrn(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>

            {/* GRN Body */}
            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Supplier Details:</span>
                  <strong className="text-slate-900 text-xs block">{selectedBillForGrn.supplierName}</strong>
                  {selectedBillForGrn.supplierGstin && <div>GSTIN: {selectedBillForGrn.supplierGstin}</div>}
                  <div>Supplier Invoice: <strong>{selectedBillForGrn.billNumber}</strong></div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Consignment Metadata:</span>
                  <div>Receipt Date: {new Date(selectedBillForGrn.billDate).toLocaleDateString('en-IN')}</div>
                  <div>Payment Terms: <strong>{selectedBillForGrn.paymentTerms}</strong></div>
                  <div>QC Inspection Status: <strong className="text-emerald-700">PASSED & ACCEPTED</strong></div>
                </div>
              </div>

              {/* Items Received Table */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2">Part Description</th>
                    <th className="p-2">Batch #</th>
                    <th className="p-2 text-right">Inward Qty</th>
                    <th className="p-2 text-right">Unit Rate (₹)</th>
                    <th className="p-2 text-right">GST %</th>
                    <th className="p-2 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {selectedBillForGrn.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-2 font-sans font-medium text-slate-900">{item.productName}</td>
                      <td className="p-2 font-bold text-blue-700">{item.batchNumber || 'STD'}</td>
                      <td className="p-2 text-right font-bold">{item.quantity} {item.unit}</td>
                      <td className="p-2 text-right">₹{Number(item.purchasePrice).toFixed(2)}</td>
                      <td className="p-2 text-right">{item.gstRate}%</td>
                      <td className="p-2 text-right font-bold">₹{Number(item.lineTotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Dual Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs font-mono border-t border-slate-200 mt-6">
                <div>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-semibold text-slate-700">
                    Goods Received & Inspected By (Storekeeper)
                  </div>
                </div>
                <div>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-semibold text-slate-700">
                    Authorized Signatory (Finance & Accounts)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THERMAL BARCODE LABEL PRINTER */}
      {selectedItemForBarcode && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Instant Shelf Labels</span>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-blue-600" /> Print Thermal Barcode Labels
                </h2>
                <p className="text-xs text-slate-500">Generate labels for newly inwarded stock</p>
              </div>
              <button
                onClick={() => setSelectedItemForBarcode(null)}
                className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            {/* Sticker Configuration Controls */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Number of Stickers</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={barcodeLabelCount}
                  onChange={(e) => setBarcodeLabelCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Label Geometry</label>
                <select
                  value={barcodeLayout}
                  onChange={(e: any) => setBarcodeLayout(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-medium"
                >
                  <option value="50x25">50mm x 25mm (Standard 1-Up Roll)</option>
                  <option value="38x25">38mm x 25mm (2-Up Roll)</option>
                  <option value="a4">A4 Sheet (24 Stickers / Page)</option>
                </select>
              </div>
            </div>

            {/* Live Sticker Preview Card */}
            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex justify-center mb-4">
              <div className="w-[50mm] h-[25mm] bg-white border border-slate-300 rounded shadow-xs p-1.5 flex flex-col justify-between items-center text-center font-sans">
                <span className="text-[8px] font-bold text-slate-800 uppercase truncate max-w-full">
                  {tenant?.businessName || 'APEX MOTORS & SPARES'}
                </span>
                <span className="text-[7.5px] font-semibold text-slate-900 truncate max-w-full">
                  {selectedItemForBarcode.productName}
                </span>

                {/* Scannable Code-128 Barcode */}
                <div className="my-0.5">
                  <BarcodeSvg
                    value={selectedItemForBarcode.batchNumber || selectedItemForBarcode.product?.sku || '8901030012345'}
                    height={16}
                    width={1.0}
                    fontSize={7}
                  />
                </div>

                <div className="w-full flex justify-between text-[7px] font-mono px-1">
                  <span>Batch: {selectedItemForBarcode.batchNumber || 'STD'}</span>
                  <span>Sale: <strong>₹{Number(selectedItemForBarcode.sellingPrice || selectedItemForBarcode.purchasePrice * 1.3).toFixed(0)}</strong></span>
                </div>
              </div>
            </div>

            {/* Print Action */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print {barcodeLabelCount} Stickers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
