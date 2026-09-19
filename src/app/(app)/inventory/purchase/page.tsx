'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Layers,
  X,
  Check
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

interface SupplierOption {
  name: string;
  gstin: string | null;
  phone: string | null;
  billsCount?: number;
  isPreset?: boolean;
}

const DEFAULT_SUPPLIERS: SupplierOption[] = [
  { name: 'Bosch Automotive Aftermarket India Ltd', gstin: '29AAACB2021A1Z8', phone: '1800 108 1234', isPreset: true },
  { name: 'Castrol Lubricants Distribution Ltd', gstin: '32AABCC3344P1ZV', phone: '1800 222 100', isPreset: true },
  { name: 'Exide Industries India Ltd', gstin: '32AAACE4455Q1ZT', phone: '1800 103 5454', isPreset: true },
  { name: 'Mann & Hummel Filters India Pvt Ltd', gstin: '27AABCM8899P1ZA', phone: '020 6675 3000', isPreset: true },
  { name: 'NGK Spark Plugs India Pvt Ltd', gstin: '27AABCN7788Q1ZB', phone: '0124 472 8888', isPreset: true },
  { name: 'Valeo India Auto Parts Pvt Ltd', gstin: '33AABCV1122R1ZC', phone: '044 6711 8000', isPreset: true },
];

export default function PurchaseInwardPage() {
  const [activeTab, setActiveTab] = useState<'NEW_BILL' | 'REGISTER'>('NEW_BILL');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);

  // Suppliers directory & searchable combobox state
  const [registeredSuppliers, setRegisteredSuppliers] = useState<SupplierOption[]>(DEFAULT_SUPPLIERS);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const supplierInputRef = useRef<HTMLInputElement>(null);

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

  // Active line-item product search dropdown row index
  const [activeItemDropdownIdx, setActiveItemDropdownIdx] = useState<number | null>(null);

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

  // Load products, warehouses, tenant metadata, and supplier directory
  const loadInitialData = async () => {
    try {
      const [prodRes, whRes, tenantRes, purchRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/warehouses'),
        fetch('/api/tenant'),
        fetch('/api/purchase'),
      ]);

      const prodData = await prodRes.json();
      const whData = await whRes.json();
      const tenantData = await tenantRes.json();
      const purchData = await purchRes.json();

      if (prodData.success && prodData.products) setProducts(prodData.products);
      if (whData.success && whData.warehouses) {
        setWarehouses(whData.warehouses);
        if (whData.warehouses.length > 0 && !warehouseId) {
          const def = whData.warehouses.find((w: any) => w.isDefault) || whData.warehouses[0];
          setWarehouseId(def.id);
        }
      }
      if (tenantData.success && tenantData.tenant) setTenant(tenantData.tenant);

      if (purchData.success && Array.isArray(purchData.suppliers) && purchData.suppliers.length > 0) {
        // Merge server suppliers with default presets
        const existingNames = new Set(purchData.suppliers.map((s: any) => s.name.toLowerCase()));
        const merged = [
          ...purchData.suppliers,
          ...DEFAULT_SUPPLIERS.filter((s) => !existingNames.has(s.name.toLowerCase())),
        ];
        setRegisteredSuppliers(merged);
      }
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
        if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
          const existingNames = new Set(data.suppliers.map((s: any) => s.name.toLowerCase()));
          const merged = [
            ...data.suppliers,
            ...DEFAULT_SUPPLIERS.filter((s) => !existingNames.has(s.name.toLowerCase())),
          ];
          setRegisteredSuppliers(merged);
        }
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

  // Filtered suppliers for live combobox
  const filteredSuppliers = useMemo(() => {
    if (!supplierName.trim()) {
      return registeredSuppliers;
    }
    const q = supplierName.toLowerCase();
    return registeredSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.gstin && s.gstin.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
    );
  }, [registeredSuppliers, supplierName]);

  // Filter catalog products for live item combobox
  const getFilteredProducts = (query: string) => {
    if (!query || !query.trim()) return products.slice(0, 10);
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 10);
  };

  // Handle line item field change with bidirectional margin calculation
  const updateItem = (index: number, field: keyof PurchaseItemRow, value: any) => {
    const updated = [...items];
    const row: any = { ...updated[index], [field]: value };

    // If product selected from catalog
    if (field === 'productId') {
      const selected = products.find((p) => p.id === value);
      if (selected) {
        row.productId = selected.id;
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
    const taxAmt = Math.round((taxable * gst / 100) * 100) / 100;

    totalTaxable += taxable;
    if (isInterState) {
      totalIgst += taxAmt;
    } else {
      totalCgst += Math.round((taxAmt / 2) * 100) / 100;
      totalSgst += Math.round((taxAmt / 2) * 100) / 100;
    }

    const sp = Number(item.sellingPrice || 0);
    projectedGrossProfit += (sp - cost) * qty;
  });

  grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;

  // Submit Purchase Bill & GRN
  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierName.trim()) {
      alert('Please enter or select a Supplier Name');
      return;
    }
    if (!billNumber.trim()) {
      alert('Please enter Supplier Bill / Invoice Number');
      return;
    }
    if (items.some((it) => !it.productName.trim() || Number(it.quantity) <= 0 || Number(it.purchasePrice) < 0)) {
      alert('Please verify line items: ensure description, quantity (> 0), and price are entered.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierName,
        supplierGstin: supplierGstin || undefined,
        supplierPhone: supplierPhone || undefined,
        billNumber,
        billDate,
        warehouseId: warehouseId || undefined,
        paymentTerms,
        notes: notes || undefined,
        items: items.map((it) => ({
          productId: it.productId || undefined,
          productName: it.productName,
          hsnCode: it.hsnCode,
          unit: it.unit,
          quantity: Number(it.quantity),
          packageSize: Number(it.packageSize || 1),
          purchasePrice: Number(it.purchasePrice),
          discountPercent: Number(it.discountPercent || 0),
          sellingPrice: Number(it.sellingPrice || 0),
          marginPercent: Number(it.marginPercent || 0),
          mrp: Number(it.mrp || it.sellingPrice || 0),
          gstRate: Number(it.gstRate || 18),
          batchNumber: it.batchNumber || undefined,
          mfgDate: it.mfgDate || undefined,
          expiryDate: it.expiryDate || undefined,
        })),
      };

      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to post purchase bill');
      }

      alert(`Success! Purchase Bill & ${data.bill?.grnNumber || 'GRN'} recorded into books.`);
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
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Trade Payables (Vendor Credit)</span>
          <div className="text-xl font-bold text-amber-600 mt-1">
            ₹{summary.totalUnpaidPayables?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-[11px] text-amber-700">Pending Supplier Invoices</span>
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
                <p className="text-xs text-slate-500">Search and select registered supplier or enter vendor details</p>
              </div>

              {/* Quick Supplier Presets */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 text-[11px] mr-1">Quick Select:</span>
                {DEFAULT_SUPPLIERS.slice(0, 3).map((sup) => (
                  <button
                    key={sup.name}
                    type="button"
                    onClick={() => {
                      setSupplierName(sup.name);
                      setSupplierGstin(sup.gstin || '');
                      setSupplierPhone(sup.phone || '');
                      setSupplierDropdownOpen(false);
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold text-[11px] transition"
                  >
                    {sup.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Searchable Supplier Combobox */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={supplierInputRef}
                    type="text"
                    required
                    placeholder="Search or enter supplier name..."
                    value={supplierName}
                    onFocus={() => setSupplierDropdownOpen(true)}
                    onChange={(e) => {
                      setSupplierName(e.target.value);
                      setSupplierDropdownOpen(true);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg pl-3 pr-8 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {supplierName && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierName('');
                          setSupplierGstin('');
                          setSupplierPhone('');
                          setSupplierDropdownOpen(true);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dropdown list of registered suppliers */}
                {supplierDropdownOpen && (
                  <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map((sup, sIdx) => (
                        <div
                          key={sIdx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSupplierName(sup.name);
                            setSupplierGstin(sup.gstin || '');
                            if (sup.phone) setSupplierPhone(sup.phone);
                            setSupplierDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {sup.name}
                              {sup.name === supplierName && <Check className="w-3 h-3 text-blue-600" />}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {sup.gstin ? `GSTIN: ${sup.gstin}` : 'No GSTIN'} {sup.phone ? `| Ph: ${sup.phone}` : ''}
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
                              sup.isPreset ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {sup.isPreset ? 'Verified Preset' : `${sup.billsCount || 1} Bills`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        No registered supplier found. Enter "{supplierName}" to proceed as new vendor.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier GSTIN
                </label>
                <input
                  type="text"
                  placeholder="e.g. 29AAACB2021A1Z8"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Bill / Invoice # <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOS-INV-2026-99"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bill Date
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receiving Warehouse / Godown
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="CREDIT">Supplier Credit (Trade Payables - A/c 2000)</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS (A/c 1100)</option>
                  <option value="UPI">UPI / Instant QR (A/c 1100)</option>
                  <option value="CASH">Cash Purchase (A/c 1000)</option>
                  <option value="CHEQUE">Cheque / Demand Draft (A/c 1100)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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

          {/* Full Fledged Line Items Grid with Clean Horizontal Control Alignment */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Line Items (Batchwise Inward & Sales Margin Engine)
                </h2>
                <p className="text-xs text-slate-500">
                  Search catalog products or type custom items. Each control is horizontally aligned across columns.
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
              <table className="min-w-[1360px] w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-2 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 w-80">Item Name & SKU</th>
                    <th className="py-2.5 px-2 w-20 text-center">HSN</th>
                    <th className="py-2.5 px-2 w-28">Batch #</th>
                    <th className="py-2.5 px-2 w-32">Expiry Date</th>
                    <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                    <th className="py-2.5 px-2 w-20 text-center">Unit</th>
                    <th className="py-2.5 px-2 w-24 text-right">Cost (₹)</th>
                    <th className="py-2.5 px-2 w-16 text-right">Disc %</th>
                    <th className="py-2.5 px-2 w-24 text-right bg-blue-50/70 text-blue-900">Margin %</th>
                    <th className="py-2.5 px-2 w-32 text-right bg-emerald-50/70 text-emerald-900">Selling Price (₹)</th>
                    <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                    <th className="py-2.5 px-3 w-28 text-right font-bold">Total (₹)</th>
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
                        {/* 1. Row Number */}
                        <td className="py-2 px-2 font-mono text-slate-400 text-center align-middle">{idx + 1}</td>

                        {/* 2. Item Name & SKU (Searchable Combobox) */}
                        <td className="py-2 px-3 align-middle relative">
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="Search catalog or type item..."
                              value={row.productName}
                              onFocus={() => setActiveItemDropdownIdx(idx)}
                              onChange={(e) => {
                                updateItem(idx, 'productName', e.target.value);
                                setActiveItemDropdownIdx(idx);
                              }}
                              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                            {row.productId && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Catalog SKU
                              </span>
                            )}
                          </div>

                          {/* Searchable Dropdown for Catalog Items */}
                          {activeItemDropdownIdx === idx && (
                            <div className="absolute z-50 left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                              {getFilteredProducts(row.productName).length > 0 ? (
                                getFilteredProducts(row.productName).map((prod) => (
                                  <div
                                    key={prod.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateItem(idx, 'productId', prod.id);
                                      setActiveItemDropdownIdx(null);
                                    }}
                                    className="p-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
                                  >
                                    <div>
                                      <span className="font-semibold text-slate-800">{prod.name}</span>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        SKU: {prod.sku} | HSN: {prod.hsnCode || '8708'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-mono font-bold text-slate-700">Cost: ₹{Number(prod.purchasePrice || 0).toFixed(2)}</span>
                                      <div className="text-[10px] text-emerald-600 font-semibold">Stock: {Number(prod.currentStock || 0)} {prod.baseUnit}</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-2 text-xs text-slate-500 text-center">
                                  No catalog item matches "{row.productName}". Will save as manual part.
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 3. HSN Code */}
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            placeholder="8708"
                            value={row.hsnCode}
                            onChange={(e) => updateItem(idx, 'hsnCode', e.target.value)}
                            className="w-full text-center border border-slate-300 rounded px-1.5 py-1.5 text-xs font-mono"
                          />
                        </td>

                        {/* 4. Batch Number */}
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            placeholder="CAS-2026"
                            value={row.batchNumber}
                            onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)}
                            className="w-full uppercase border border-slate-300 rounded px-2 py-1.5 text-xs font-mono font-bold"
                          />
                        </td>

                        {/* 5. Expiry Date */}
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="date"
                            value={row.expiryDate}
                            onChange={(e) => updateItem(idx, 'expiryDate', e.target.value)}
                            className="w-full border border-slate-300 rounded px-1.5 py-1.5 text-xs text-slate-700 font-sans"
                          />
                        </td>

                        {/* 6. Quantity */}
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            required
                            value={row.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="w-full text-center border border-slate-300 rounded px-1.5 py-1.5 text-xs font-mono font-bold"
                          />
                        </td>

                        {/* 7. Unit */}
                        <td className="py-2 px-2 align-middle">
                          <select
                            value={row.unit}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                            className="w-full border border-slate-300 rounded px-1 py-1.5 text-xs font-semibold bg-white text-center"
                          >
                            <option value="PCS">PCS</option>
                            <option value="CAN">CAN</option>
                            <option value="BOX">BOX</option>
                            <option value="SET">SET</option>
                            <option value="KG">KG</option>
                            <option value="LTR">LTR</option>
                            <option value="MTR">MTR</option>
                          </select>
                        </td>

                        {/* 8. Purchase Cost Price */}
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={row.purchasePrice}
                            onChange={(e) => updateItem(idx, 'purchasePrice', e.target.value)}
                            className="w-full text-right border border-slate-300 rounded px-2 py-1.5 text-xs font-mono font-bold"
                          />
                        </td>

                        {/* 9. Discount % */}
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={row.discountPercent}
                            onChange={(e) => updateItem(idx, 'discountPercent', e.target.value)}
                            className="w-full text-right border border-slate-300 rounded px-1.5 py-1.5 text-xs font-mono"
                          />
                        </td>

                        {/* 10. Margin % (Bidirectional) */}
                        <td className="py-2 px-2 align-middle bg-blue-50/40">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={row.marginPercent}
                              onChange={(e) => updateItem(idx, 'marginPercent', e.target.value)}
                              className="w-full text-right border border-blue-300 rounded pl-1.5 pr-4 py-1.5 text-xs font-mono font-bold text-blue-700 bg-white"
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-500 pointer-events-none">%</span>
                          </div>
                        </td>

                        {/* 11. Selling Price (Bidirectional + Profit Badge) */}
                        <td className="py-2 px-2 align-middle bg-emerald-50/40">
                          <div>
                            <div className="relative">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 pointer-events-none">₹</span>
                              <input
                                type="number"
                                step="any"
                                value={row.sellingPrice}
                                onChange={(e) => updateItem(idx, 'sellingPrice', e.target.value)}
                                className="w-full text-right border border-emerald-300 rounded pl-4 pr-1.5 py-1.5 text-xs font-mono font-bold text-emerald-700 bg-white"
                              />
                            </div>
                            {unitProfit !== 0 && (
                              <div className={`text-[10px] text-right font-mono font-semibold truncate mt-0.5 ${
                                unitProfit > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {unitProfit > 0 ? `+₹${unitProfit.toFixed(1)}/unit` : `-₹${Math.abs(unitProfit).toFixed(1)}/unit`}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 12. GST % */}
                        <td className="py-2 px-2 align-middle">
                          <select
                            value={row.gstRate}
                            onChange={(e) => updateItem(idx, 'gstRate', e.target.value)}
                            className="w-full border border-slate-300 rounded px-1 py-1.5 text-xs font-mono font-bold bg-white text-center"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>

                        {/* 13. Line Total */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 align-middle">
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* 14. Delete Button */}
                        <td className="py-2 px-2 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className="text-slate-400 hover:text-rose-600 transition disabled:opacity-30 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
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
