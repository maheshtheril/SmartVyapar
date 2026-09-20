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
  Check,
  Upload,
  Camera,
  Tag,
  Receipt,
  Maximize2,
  Minimize2,
  RotateCcw,
  ScanBarcode
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
  const [activeTab, setActiveTab] = useState<'NEW_BILL' | 'REGISTER'>('REGISTER');
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Bulk strategy & Quick scan state
  const [globalMargin, setGlobalMargin] = useState<number>(30);
  const [roundOff, setRoundOff] = useState<number>(0);
  const [isAutoRound, setIsAutoRound] = useState<boolean>(true);
  const [quickBarcodeInput, setQuickBarcodeInput] = useState<string>('');

  // Reference data
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);

  // Suppliers directory & searchable combobox state
  const [registeredSuppliers, setRegisteredSuppliers] = useState<SupplierOption[]>(DEFAULT_SUPPLIERS);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const supplierInputRef = useRef<HTMLInputElement>(null);

  // AI Invoice Scanner State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccessInfo, setScanSuccessInfo] = useState<{ count: number; billNumber: string; confidence: number } | null>(null);
  const [customApiKeyInput, setCustomApiKeyInput] = useState('');
  const [keySavedBanner, setKeySavedBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('smartvyapar_gemini_api_key');
      if (savedKey) setCustomApiKeyInput(savedKey);
    }
  }, []);

  const saveCustomApiKey = () => {
    if (typeof window !== 'undefined') {
      if (customApiKeyInput.trim()) {
        localStorage.setItem('smartvyapar_gemini_api_key', customApiKeyInput.trim());
        setKeySavedBanner(true);
        setTimeout(() => setKeySavedBanner(false), 4000);
        setScanError(null);
      } else {
        localStorage.removeItem('smartvyapar_gemini_api_key');
      }
    }
  };

  // Inward Register & History
  const [bills, setBills] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [searchFilter, setSearchFilter] = useState('');

  // Selected Bill for GRN Print or Barcode Print Modal
  const [selectedBillForGrn, setSelectedBillForGrn] = useState<any>(null);
  const [selectedBillForBarcodeBatch, setSelectedBillForBarcodeBatch] = useState<any>(null);
  const [batchBarcodeQuantities, setBatchBarcodeQuantities] = useState<Record<string, number>>({});
  const [barcodeLayout, setBarcodeLayout] = useState<'50x25' | '38x25' | 'a4'>('50x25');

  // Post-Inward Success Confirmation Modal
  const [postInwardModal, setPostInwardModal] = useState<{ open: boolean; bill: any } | null>(null);

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
      hsnCode: '',
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

  // Reset clean form
  const resetForm = () => {
    setBillNumber('');
    setSupplierName('');
    setSupplierGstin('');
    setSupplierPhone('');
    setNotes('');
    setScanSuccessInfo(null);
    setScanError(null);
    setItems([
      {
        productName: '',
        hsnCode: '',
        unit: 'PCS',
        quantity: 1,
        packageSize: 1,
        purchasePrice: 0,
        discountPercent: 0,
        marginPercent: globalMargin,
        sellingPrice: 0,
        mrp: 0,
        gstRate: 18,
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
      },
    ]);
  };

  // Bulk margin strategy - Apply margin across all rows
  const applyGlobalMargin = (margin: number) => {
    setGlobalMargin(margin);
    const updated = items.map((it) => {
      const cost = Number(it.purchasePrice || 0) * (1 - Number(it.discountPercent || 0) / 100);
      const newSP = cost > 0 ? Math.round(cost * (1 + margin / 100) * 100) / 100 : it.sellingPrice;
      return {
        ...it,
        marginPercent: margin,
        sellingPrice: newSP,
        mrp: Math.max(Number(it.mrp || 0), newSP),
      };
    });
    setItems(updated);
  };

  // Quick Barcode / SKU scan adder
  const handleQuickAddBarcode = () => {
    const q = quickBarcodeInput.trim();
    if (!q) return;

    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === q.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === q.toLowerCase()) ||
        p.name.toLowerCase().includes(q.toLowerCase())
    );

    if (found) {
      const cost = Number(found.purchasePrice || 0);
      const sp = Number(found.sellingPrice || cost * 1.3);
      const margin = cost > 0 ? Math.round(((sp - cost) / cost) * 1000) / 10 : globalMargin;

      if (items.length === 1 && !items[0].productName.trim()) {
        setItems([{
          productId: found.id,
          productName: found.name,
          hsnCode: found.hsnCode || '',
          unit: found.baseUnit || 'PCS',
          quantity: 1,
          packageSize: 1,
          purchasePrice: cost,
          discountPercent: 0,
          marginPercent: margin,
          sellingPrice: sp,
          mrp: Number(found.mrp || sp),
          gstRate: Number(found.gstRate || 18),
          batchNumber: '',
          mfgDate: '',
          expiryDate: '',
        }]);
      } else {
        setItems((prev) => [
          ...prev,
          {
            productId: found.id,
            productName: found.name,
            hsnCode: found.hsnCode || '',
            unit: found.baseUnit || 'PCS',
            quantity: 1,
            packageSize: 1,
            purchasePrice: cost,
            discountPercent: 0,
            marginPercent: margin,
            sellingPrice: sp,
            mrp: Number(found.mrp || sp),
            gstRate: Number(found.gstRate || 18),
            batchNumber: '',
            mfgDate: '',
            expiryDate: '',
          },
        ]);
      }
    } else {
      if (items.length === 1 && !items[0].productName.trim()) {
        setItems([{
          productName: q,
          hsnCode: '',
          unit: 'PCS',
          quantity: 1,
          packageSize: 1,
          purchasePrice: 0,
          discountPercent: 0,
          marginPercent: globalMargin,
          sellingPrice: 0,
          mrp: 0,
          gstRate: 18,
          batchNumber: '',
          mfgDate: '',
          expiryDate: '',
        }]);
      } else {
        setItems((prev) => [
          ...prev,
          {
            productName: q,
            hsnCode: '',
            unit: 'PCS',
            quantity: 1,
            packageSize: 1,
            purchasePrice: 0,
            discountPercent: 0,
            marginPercent: globalMargin,
            sellingPrice: 0,
            mrp: 0,
            gstRate: 18,
            batchNumber: '',
            mfgDate: '',
            expiryDate: '',
          },
        ]);
      }
    }
    setQuickBarcodeInput('');
  };

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
    loadBills();
  }, []);

  useEffect(() => {
    loadBills();
  }, [searchFilter]);

  // Global Keyboard Shortcuts (Esc to close modal, Ctrl+S to save, Alt+A to add row)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewBillOpen) {
          setIsNewBillOpen(false);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (isNewBillOpen) {
          e.preventDefault();
          handleSubmitBill();
        }
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        if (isNewBillOpen) {
          e.preventDefault();
          addItemRow();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewBillOpen, items, supplierName, billNumber, submitting]);

  // AI Invoice Scanner handler
  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selectedFile = e.target.files[0];

    setIsNewBillOpen(true);
    setIsScanningInvoice(true);
    setScanError(null);
    setScanSuccessInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const customApiKey = typeof window !== 'undefined' ? localStorage.getItem('smartvyapar_gemini_api_key') : null;
      const headers: Record<string, string> = {};
      if (customApiKey) {
        headers['x-gemini-api-key'] = customApiKey;
      }

      const res = await fetch('/api/scan-purchase', {
        method: 'POST',
        headers,
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'AI invoice scan failed');
      }

      const data = json.data;
      if (data.supplierName) setSupplierName(data.supplierName);
      if (data.supplierGstin) setSupplierGstin(data.supplierGstin);
      if (data.billNumber) setBillNumber(data.billNumber);
      if (data.billDate && data.billDate.length >= 10) setBillDate(data.billDate.substring(0, 10));

      if (Array.isArray(data.items) && data.items.length > 0) {
        const mappedRows: PurchaseItemRow[] = data.items.map((it: any) => {
          // Attempt catalog match by name or SKU
          const match = products.find(
            (p) =>
              p.name.toLowerCase().includes(it.productName.toLowerCase()) ||
              it.productName.toLowerCase().includes(p.name.toLowerCase()) ||
              (p.sku && it.productName.toLowerCase().includes(p.sku.toLowerCase()))
          );

          const cost = Number(it.purchasePrice || 0);
          let sp = 0;
          let margin = 30;

          if (match && Number(match.sellingPrice || 0) > 0) {
            sp = Number(match.sellingPrice);
            if (cost > 0) {
              margin = Math.round(((sp - cost) / cost) * 1000) / 10;
            }
          } else {
            sp = Math.round(cost * 1.30 * 100) / 100;
          }

          return {
            productId: match?.id || undefined,
            productName: it.productName || 'Unnamed Item',
            hsnCode: it.hsnCode || match?.hsnCode || '',
            unit: it.unit || match?.baseUnit || 'PCS',
            quantity: Number(it.quantity || 1),
            packageSize: Number(it.packageSize || 1),
            purchasePrice: cost,
            discountPercent: 0,
            marginPercent: margin,
            sellingPrice: sp,
            mrp: Number(it.mrp || sp),
            gstRate: Number(it.gstRate || 18),
            batchNumber: it.batchNumber || '',
            mfgDate: it.mfgDate || '',
            expiryDate: it.expiryDate || '',
          };
        });

        setItems(mappedRows);
        setScanSuccessInfo({
          count: mappedRows.length,
          billNumber: data.billNumber || 'Auto-detected',
          confidence: Math.round((data.confidenceScore || 0.95) * 100),
        });
      }
    } catch (err: any) {
      console.error('Invoice scan error:', err);
      setScanError(err.message || 'Failed to extract invoice data via AI');
    } finally {
      setIsScanningInvoice(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
        row.hsnCode = selected.hsnCode || '';
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
        hsnCode: '',
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

  // Tax, Round-Off, and Total Calculations
  const isInterState = supplierGstin && supplierGstin.length >= 2 && tenant?.stateCode
    ? supplierGstin.substring(0, 2) !== tenant.stateCode
    : false;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let rawGrandTotal = 0;
  let grandTotal = 0;
  let computedRoundOff = 0;
  let projectedGrossProfit = 0;
  let totalQuantity = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity || 0);
    totalQuantity += qty;
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

  rawGrandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;

  if (isAutoRound) {
    grandTotal = Math.round(rawGrandTotal);
    computedRoundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;
  } else {
    computedRoundOff = roundOff;
    grandTotal = Math.round((rawGrandTotal + roundOff) * 100) / 100;
  }

  // Open Multi-Item Consignment Barcode Modal
  const openBatchBarcodeModal = (bill: any) => {
    setSelectedBillForBarcodeBatch(bill);
    const qtys: Record<string, number> = {};
    if (bill.items) {
      bill.items.forEach((item: any) => {
        qtys[item.id] = Math.max(1, Math.floor(Number(item.quantity || 1)));
      });
    }
    setBatchBarcodeQuantities(qtys);
  };

  // Submit Purchase Bill & GRN
  const handleSubmitBill = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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

      // Open Post-Inward Success Modal & Close Entry Dialog
      setPostInwardModal({ open: true, bill: data.bill });
      setIsNewBillOpen(false);
      loadBills();
      resetForm();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Flattened stickers list for multi-item barcode modal
  const multiItemStickersToPrint = useMemo(() => {
    if (!selectedBillForBarcodeBatch || !selectedBillForBarcodeBatch.items) return [];
    const stickers: any[] = [];
    selectedBillForBarcodeBatch.items.forEach((item: any) => {
      const count = batchBarcodeQuantities[item.id] || 0;
      for (let i = 0; i < count; i++) {
        stickers.push(item);
      }
    });
    return stickers;
  }, [selectedBillForBarcodeBatch, batchBarcodeQuantities]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Hidden File Input for AI Bill Scanner */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleScanInvoice}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-100">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Purchase Bills &amp; GRN Inward
                <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-bold">
                  AI Auto-Fill Enabled
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                World-standard purchase voucher, batch FIFO tracking, bidirectional margin engine, and consignment barcode printing
              </p>
            </div>
          </div>
        </div>

        {/* Primary Header Action Controls */}
        <div className="flex items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={() => {
              setIsNewBillOpen(true);
              fileInputRef.current?.click();
            }}
            disabled={isScanningInvoice}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isScanningInvoice ? 'animate-spin' : 'animate-pulse text-amber-300'}`} />
            {isScanningInvoice ? 'AI Vision Extracting...' : '⚡ AI Scan Bill'}
          </button>

          <button
            onClick={() => {
              if (!isNewBillOpen) resetForm();
              setIsNewBillOpen(true);
            }}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Purchase Bill &amp; GRN
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
          <span className="text-[11px] text-amber-700">Pending Supplier Invoices (A/c 2000)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Active Inventory Godowns</span>
          <div className="text-xl font-bold text-blue-600 mt-1">
            {warehouses.length || 1} Godown(s)
          </div>
          <span className="text-[11px] text-blue-700">Multi-warehouse FIFO tracking</span>
        </div>
      </div>

      {/* INWARD REGISTER & BILLS HISTORY */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by GRN #, Supplier Bill #, Vendor..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={loadBills}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Register
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
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
                    const gstTotal = Number(bill.cgstAmount || 0) + Number(bill.sgstAmount || 0) + Number(bill.igstAmount || 0);
                    return (
                      <tr key={bill.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-blue-700">{bill.grnNumber || 'GRN-MANUAL'}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{bill.billNumber}</td>
                        <td className="py-3 px-4 font-sans text-slate-600">
                          {new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-900">{bill.supplierName}</td>
                        <td className="py-3 px-4 font-sans text-slate-600">{bill.items?.length || 0} Parts</td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          ₹{Number(bill.totalTaxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                          ₹{gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedBillForGrn(bill)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Print Statutory GRN Slip"
                            >
                              <Printer className="w-3 h-3 text-blue-600" /> GRN Slip
                            </button>
                            {bill.items && bill.items.length > 0 && (
                              <button
                                onClick={() => openBatchBarcodeModal(bill)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Print Barcode Labels for this Consignment"
                              >
                                <Barcode className="w-3 h-3 text-emerald-600" /> Barcodes ({bill.items.length})
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                      <PackagePlus className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <div className="font-semibold text-slate-600">No purchase bills recorded yet</div>
                      <p className="text-xs text-slate-400 mt-1">Click &quot;New Purchase Bill &amp; GRN&quot; or &quot;⚡ AI Scan Bill&quot; above to record your first inward.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WORLD-STANDARD FULL-SCREEN PURCHASE RECEIPT & GRN INWARD MODAL WORKSPACE */}
      {/* ========================================================================= */}
      {isNewBillOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 md:p-2 selection:bg-blue-500/25 animate-in fade-in duration-150">
          <div
            className={`bg-slate-50 overflow-hidden flex flex-col transition-all duration-200 shadow-2xl ${
              isMaximized
                ? 'w-screen h-screen rounded-none border-none'
                : 'w-[98vw] max-w-[1720px] h-[95vh] rounded-2xl border border-slate-300'
            }`}
          >
            {/* 1. Fixed Top Title Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900 text-white shrink-0 z-20 shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <Receipt className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    Purchase Inward &amp; GRN Voucher
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.2 rounded font-mono font-bold">
                      DIRECT INWARD
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.2 rounded font-mono font-bold">
                      A/C 2000
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                    Double-Entry Books &bull; Batch FIFO &bull; Selling Price Engine
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* AI Quick Scan Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanningInvoice}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isScanningInvoice ? 'animate-spin' : 'animate-pulse text-amber-300'}`} />
                  {isScanningInvoice ? 'Scanning...' : '⚡ AI Scan Bill'}
                </button>

                {/* Godown Indicator */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Godown: {warehouses.find(w => w.id === warehouseId)?.name || 'Main Warehouse'}</span>
                </div>

                {/* Keyboard Hints */}
                <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <span><kbd className="bg-slate-700 text-slate-200 px-1 py-0.5 rounded text-[10px]">Alt+A</kbd> Add Row</span>
                  <span>&bull;</span>
                  <span><kbd className="bg-slate-700 text-slate-200 px-1 py-0.5 rounded text-[10px]">Ctrl+S</kbd> Save</span>
                  <span>&bull;</span>
                  <span><kbd className="bg-slate-700 text-slate-200 px-1 py-0.5 rounded text-[10px]">Esc</kbd> Exit</span>
                </div>

                <div className="h-5 w-px bg-slate-700 mx-1"></div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition cursor-pointer"
                  title="Clear / Reset Form"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition cursor-pointer"
                  title={isMaximized ? "Restore Window Size" : "Full Screen Window"}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsNewBillOpen(false)}
                  className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Scrollable Body Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-4 space-y-3.5">
              {/* Scanning Feedback Banners */}
              {isScanningInvoice && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center gap-3 animate-pulse">
                  <Sparkles className="w-5 h-5 text-purple-600 animate-spin shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold block text-sm">Gemini AI Vision Extracting Invoice...</span>
                    Reading vendor metadata, line items, packaging quantities, GST slabs, and purchase costs.
                  </div>
                </div>
              )}

              {keySavedBanner && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Google Gemini API key saved! Please re-upload or click &quot;Scan Invoice with AI&quot; to scan.</span>
                </div>
              )}

              {scanError && (
                <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 space-y-2.5 text-xs shadow-xs">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-amber-950 font-bold text-sm">Live AI OCR Unavailable:</strong>
                        <span className="text-amber-800 leading-relaxed">{scanError}</span>
                      </div>
                    </div>
                    <button onClick={() => setScanError(null)} className="text-amber-600 hover:text-amber-900 cursor-pointer p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-amber-200/80 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-700">
                      To enable 100% accurate AI OCR, enter your active Google Gemini API Key below, or simply enter items manually in the form:
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="password"
                        placeholder="Paste your Google Gemini API Key (e.g. AIzaSy...)"
                        value={customApiKeyInput}
                        onChange={(e) => setCustomApiKeyInput(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 font-mono focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={saveCustomApiKey}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition cursor-pointer shrink-0"
                      >
                        Save API Key
                      </button>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-xs font-semibold shrink-0 py-1.5 flex items-center gap-1"
                      >
                        Get Free Key &rarr;
                      </a>
                    </div>
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium">
                    &bull; Note: No fake or placeholder items will ever be entered. You can immediately enter supplier details and line items directly in the table below.
                  </div>
                </div>
              )}

              {scanSuccessInfo && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>✨ AI Extracted Successfully:</strong> Loaded <strong>{scanSuccessInfo.count} items</strong> from bill <strong>{scanSuccessInfo.billNumber}</strong> with {scanSuccessInfo.confidence}% confidence. Please review margins and batches before posting.
                    </span>
                  </div>
                  <button onClick={() => setScanSuccessInfo(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Voucher Top Metadata Grid (Vendor, Bill #, Dates, Warehouse, Terms) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Master Supplier Combobox (Cols 1-5) */}
                  <div className="md:col-span-5 relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Master Supplier / Vendor <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <span>Presets:</span>
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
                            className="text-blue-600 hover:underline font-semibold cursor-pointer"
                          >
                            {sup.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        ref={supplierInputRef}
                        type="text"
                        required
                        placeholder="Search supplier name, GSTIN, or enter vendor..."
                        value={supplierName}
                        onFocus={() => setSupplierDropdownOpen(true)}
                        onChange={(e) => {
                          setSupplierName(e.target.value);
                          setSupplierDropdownOpen(true);
                        }}
                        className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                      />
                      <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Supplier Combobox Dropdown */}
                    {supplierDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl max-h-52 overflow-y-auto divide-y divide-slate-100 ring-1 ring-black/5">
                        {filteredSuppliers.length > 0 ? (
                          filteredSuppliers.map((sup) => (
                            <div
                              key={sup.name}
                              onMouseDown={() => {
                                setSupplierName(sup.name);
                                setSupplierGstin(sup.gstin || '');
                                setSupplierPhone(sup.phone || '');
                                setSupplierDropdownOpen(false);
                              }}
                              className="p-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
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
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
                                sup.isPreset ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {sup.isPreset ? 'Verified Preset' : `${sup.billsCount || 1} Bills`}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            No registered supplier matches. Entering &quot;{supplierName}&quot; will record as new vendor.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Supplier GSTIN (Cols 6-7) */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier GSTIN
                    </label>
                    <input
                      type="text"
                      placeholder="29AAACB2021A1Z8"
                      value={supplierGstin}
                      onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Bill Number (Cols 8-9) */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier Bill / Inv # <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BOS-2026-99"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    />
                  </div>

                  {/* Bill Date (Col 10) */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bill Date
                    </label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Godown (Col 11) */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Godown
                    </label>
                    <select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-medium truncate"
                    >
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Terms & Tax Supply (Col 12) */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-medium truncate"
                    >
                      <option value="CREDIT">Credit (A/c 2000)</option>
                      <option value="BANK_TRANSFER">Bank (A/c 1100)</option>
                      <option value="UPI">UPI (A/c 1100)</option>
                      <option value="CASH">Cash (A/c 1000)</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bulk Margin Strategy Toolbar & Quick Barcode Scan Bar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                {/* Bulk Margin Strategy */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Bulk Margin Strategy:</span>
                    <input
                      type="number"
                      value={globalMargin}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setGlobalMargin(Number(e.target.value))}
                      className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold font-mono text-center text-blue-700"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                    <button
                      type="button"
                      onClick={() => applyGlobalMargin(globalMargin)}
                      className="ml-1 px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded transition uppercase cursor-pointer"
                    >
                      Apply All
                    </button>
                  </div>

                  {/* Quick Preset Pills */}
                  <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {[15, 20, 25, 30, 35].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => applyGlobalMargin(m)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                          globalMargin === m ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {m}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Barcode / SKU Add Input */}
                <div className="flex-1 max-w-md flex items-center gap-1.5">
                  <div className="relative w-full">
                    <ScanBarcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Quick Scan Barcode or Type SKU / Name &amp; Enter..."
                      value={quickBarcodeInput}
                      onChange={(e) => setQuickBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddBarcode();
                        }
                      }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickAddBarcode}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Manual Add Row Button */}
                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Part / Line (Alt+A)
                </button>
              </div>

              {/* Full-Width Line Items Table Grid */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-[300px] flex flex-col">
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
                    <thead className="sticky top-0 z-10 shadow-xs">
                      <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px] border-b border-slate-950">
                        <th className="py-2.5 px-2 w-8 text-center text-slate-400">#</th>
                        <th className="py-2.5 px-3 min-w-[280px]">Product Description &amp; SKU</th>
                        <th className="py-2.5 px-2 w-20 text-center">HSN</th>
                        <th className="py-2.5 px-2 w-24">Batch #</th>
                        <th className="py-2.5 px-2 w-28">Expiry</th>
                        <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                        <th className="py-2.5 px-2 w-18 text-center">Unit</th>
                        <th className="py-2.5 px-2 w-24 text-right">Cost (₹)</th>
                        <th className="py-2.5 px-2 w-16 text-right">Disc %</th>
                        <th className="py-2.5 px-2 w-24 text-right bg-blue-900 text-blue-100 font-bold border-x border-blue-800">Margin %</th>
                        <th className="py-2.5 px-2 w-32 text-right bg-emerald-900 text-emerald-100 font-bold border-r border-emerald-800">Selling Price (₹)</th>
                        <th className="py-2.5 px-2 w-18 text-center">GST %</th>
                        <th className="py-2.5 px-2 w-24 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 w-28 text-right font-black">Total (₹)</th>
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
                          <tr key={idx} className="hover:bg-slate-50/80 transition group">
                            {/* 1. Row Index */}
                            <td className="py-2 px-2 font-mono text-slate-400 text-center align-middle">{idx + 1}</td>

                            {/* 2. Product Name / SKU Combobox */}
                            <td className="py-2 px-3 align-middle relative">
                              <div className="relative">
                                <input
                                  type="text"
                                  required
                                  placeholder="Search catalog or type item..."
                                  value={row.productName}
                                  onFocus={() => setActiveItemDropdownIdx(idx)}
                                  onBlur={() => setTimeout(() => setActiveItemDropdownIdx(null), 150)}
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
                                <div className="absolute z-50 left-3 right-3 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 ring-1 ring-black/5">
                                  {getFilteredProducts(row.productName).length > 0 ? (
                                    <>
                                      <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold uppercase text-slate-600 tracking-wider flex justify-between items-center">
                                        <span>Matching Catalog Products ({products.length} in store)</span>
                                        <span className="text-[9px] text-slate-400 font-normal">Click to auto-fill</span>
                                      </div>
                                      {getFilteredProducts(row.productName).map((prod) => (
                                        <div
                                          key={prod.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            updateItem(idx, 'productId', prod.id);
                                            setActiveItemDropdownIdx(null);
                                          }}
                                          className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
                                        >
                                          <div>
                                            <span className="font-bold text-slate-800">{prod.name}</span>
                                            <div className="text-[10px] text-slate-500 font-mono">
                                              SKU: {prod.sku || 'N/A'} | HSN: {prod.hsnCode || 'N/A'} | Unit: {prod.baseUnit}
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-mono font-bold text-slate-800">₹{Number(prod.purchasePrice || 0).toFixed(2)}</span>
                                            <div className="text-[10px] text-emerald-600 font-semibold">Stock: {Number(prod.currentStock || 0)} {prod.baseUnit}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    <div className="p-3 bg-slate-50/50">
                                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        New Item Entry: &quot;{row.productName}&quot;
                                      </div>
                                      <p className="text-[11px] text-slate-600 mt-1">
                                        This item is not yet in your current store catalog. Proceeding with inwarding will automatically register the product and record its stock batch.
                                      </p>
                                      {products.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-200">
                                          <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                                            Or choose from your current inventory ({products.length} items):
                                          </div>
                                          <div className="space-y-1">
                                            {products.slice(0, 3).map((p) => (
                                              <div
                                                key={p.id}
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateItem(idx, 'productId', p.id);
                                                  setActiveItemDropdownIdx(null);
                                                }}
                                                className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded text-xs text-slate-700 cursor-pointer flex justify-between items-center"
                                              >
                                                <span className="font-semibold text-slate-800">{p.name}</span>
                                                <span className="font-mono text-[11px] text-slate-600 font-medium">₹{Number(p.purchasePrice || 0)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 3. HSN Code */}
                            <td className="py-2 px-2 align-middle">
                              <input
                                type="text"
                                placeholder="HSN Code"
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
                                onFocus={(e) => e.target.select()}
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
                                onFocus={(e) => e.target.select()}
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
                                onFocus={(e) => e.target.select()}
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
                                  onFocus={(e) => e.target.select()}
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
                                    onFocus={(e) => e.target.select()}
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

                            {/* 13. Taxable Amount */}
                            <td className="py-2 px-2 text-right font-mono text-slate-700 align-middle">
                              ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* 14. Row Total */}
                            <td className="py-2 px-3 text-right font-mono font-black text-slate-900 align-middle">
                              ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* 15. Delete Action */}
                            <td className="py-2 px-2 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                disabled={items.length <= 1}
                                className="text-slate-400 hover:text-rose-600 transition disabled:opacity-20 p-1 cursor-pointer"
                                title="Remove Line"
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

                {/* Internal Notes / PO Reference Bar */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-3 text-xs">
                  <label className="font-bold text-slate-600 shrink-0">Internal Notes / PO #:</label>
                  <input
                    type="text"
                    placeholder="e.g. Received via Transport Truck KA-01-AB-1234 / PO-2026-88"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. World-Class Sticky Bottom Financial Footer Bar */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-white shadow-2xl shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
              <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Lines &amp; Units</span>
                  <span className="font-bold text-slate-800">{items.length} Parts &bull; {totalQuantity} Units</span>
                </div>

                <div className="space-y-0.5 border-l border-slate-200 pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Taxable Subtotal</span>
                  <span className="font-bold text-slate-800">₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="space-y-0.5 border-l border-slate-200 pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                    GST Input Credit ({isInterState ? 'IGST' : 'CGST+SGST'})
                  </span>
                  <span className="font-bold text-emerald-600">
                    ₹{(totalCgst + totalSgst + totalIgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-slate-200 pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Projected Profit</span>
                  <span className="font-bold text-blue-600">
                    +₹{projectedGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-slate-200 pl-4 flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Round Off</span>
                    <button
                      type="button"
                      onClick={() => setIsAutoRound(!isAutoRound)}
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold transition cursor-pointer ${
                        isAutoRound ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isAutoRound ? 'AUTO' : 'MANUAL'}
                    </button>
                  </div>
                  <span className="font-bold font-mono text-slate-700 text-xs">
                    {computedRoundOff >= 0 ? `+₹${computedRoundOff.toFixed(2)}` : `-₹${Math.abs(computedRoundOff).toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Grand Total & Primary Post Actions */}
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white px-5 py-2 rounded-xl flex flex-col items-end shadow-sm">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Grand Total Inward</span>
                  <span className="text-xl font-black font-mono tracking-tight text-white">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewBillOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel (Esc)
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitBill()}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Confirming Inward...' : 'Confirm Inward & Post to Books (Ctrl+S)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POST-INWARD CONFIRMATION SUCCESS MODAL */}
      {postInwardModal?.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Consignment Inwarded Successfully!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Inventory stocked, batch records registered, and double-entry books updated.
            </p>

            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">GRN Document #:</span>
                <strong className="text-blue-600">{postInwardModal.bill?.grnNumber || 'GRN-2026-XXXX'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier Bill #:</span>
                <strong className="text-slate-800">{postInwardModal.bill?.billNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-medium text-slate-700 truncate max-w-[240px]">{postInwardModal.bill?.supplierName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                <span className="text-slate-500 font-semibold">Total Inward Value:</span>
                <strong className="text-slate-900">₹{Number(postInwardModal.bill?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const bill = postInwardModal.bill;
                    setPostInwardModal(null);
                    setSelectedBillForGrn(bill);
                  }}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print GRN Slip
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const bill = postInwardModal.bill;
                    setPostInwardModal(null);
                    openBatchBarcodeModal(bill);
                  }}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                >
                  <Barcode className="w-4 h-4" /> Print Barcodes
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPostInwardModal(null)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  ➕ Inward Another Bill
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPostInwardModal(null);
                    setActiveTab('REGISTER');
                  }}
                  className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition"
                >
                  View Inward Register
                </button>
              </div>
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

      {/* MODAL 2: MULTI-ITEM CONSIGNMENT BARCODE LABEL PRINTER */}
      {selectedBillForBarcodeBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Consignment Barcode Printing</span>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-blue-600" /> Print Inwarded Barcode Labels
                </h2>
                <p className="text-xs text-slate-500">
                  Bill #{selectedBillForBarcodeBatch.billNumber} &bull; {multiItemStickersToPrint.length} Total Labels Selected
                </p>
              </div>
              <button
                onClick={() => setSelectedBillForBarcodeBatch(null)}
                className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            {/* Sticker Geometry Selector */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Label Geometry</label>
                <select
                  value={barcodeLayout}
                  onChange={(e: any) => setBarcodeLayout(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-medium"
                >
                  <option value="50x25">50mm x 25mm (Standard 1-Up Thermal Roll)</option>
                  <option value="38x25">38mm x 25mm (2-Up Thermal Roll)</option>
                  <option value="a4">A4 Sheet (24 Stickers / Page)</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono text-slate-700 flex justify-between items-center">
                  <span>Total Labels to Print:</span>
                  <strong className="text-blue-700 font-bold text-sm">{multiItemStickersToPrint.length}</strong>
                </div>
              </div>
            </div>

            {/* Items Sticker Quantities Adjustment Table */}
            <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 border-b border-slate-200 flex justify-between items-center">
                <span>Inwarded Parts in Consignment</span>
                <span className="text-[11px] text-slate-500 font-normal">Adjust sticker count per part</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {selectedBillForBarcodeBatch.items?.map((item: any) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/70">
                    <div className="max-w-[340px]">
                      <span className="font-semibold text-slate-800 block truncate">{item.productName}</span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Batch: <strong>{item.batchNumber || 'STD'}</strong> | MRP: ₹{Number(item.mrp || item.sellingPrice || 0).toFixed(0)} | Sale: ₹{Number(item.sellingPrice || item.purchasePrice * 1.3).toFixed(0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Labels:</span>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={batchBarcodeQuantities[item.id] ?? Math.floor(Number(item.quantity || 1))}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setBatchBarcodeQuantities((prev) => ({
                            ...prev,
                            [item.id]: val,
                          }));
                        }}
                        className="w-16 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticker Preview (First Item) */}
            {multiItemStickersToPrint.length > 0 && (
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center mb-4">
                <span className="text-[10px] text-slate-500 font-semibold mb-1">Thermal Label Preview</span>
                <div className="w-[50mm] h-[25mm] bg-white border border-slate-300 rounded shadow-xs p-1.5 flex flex-col justify-between items-center text-center font-sans">
                  <span className="text-[8px] font-bold text-slate-800 uppercase truncate max-w-full">
                    {tenant?.businessName || 'APEX MOTORS & SPARES'}
                  </span>
                  <span className="text-[7.5px] font-semibold text-slate-900 truncate max-w-full">
                    {multiItemStickersToPrint[0].productName}
                  </span>

                  <div className="my-0.5">
                    <BarcodeSvg
                      value={multiItemStickersToPrint[0].batchNumber || multiItemStickersToPrint[0].product?.sku || '8901030012345'}
                      height={16}
                      width={1.0}
                      fontSize={7}
                    />
                  </div>

                  <div className="w-full flex justify-between text-[7px] font-mono px-1">
                    <span>Batch: {multiItemStickersToPrint[0].batchNumber || 'STD'}</span>
                    <span>Sale: <strong>₹{Number(multiItemStickersToPrint[0].sellingPrice || multiItemStickersToPrint[0].purchasePrice * 1.3).toFixed(0)}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Print Action */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                disabled={multiItemStickersToPrint.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" /> Print {multiItemStickersToPrint.length} Barcode Labels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
