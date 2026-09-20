'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Receipt, 
  QrCode, 
  Share2, 
  Trash2, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Building2,
  ArrowLeft,
  PauseCircle,
  FolderOpen,
  Banknote,
  Keyboard,
  X,
  Clock,
  User,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import ProductSearchCombobox, { ProductOption } from '@/components/ProductSearchCombobox';
import CustomerSearch, { CustomerOption } from '@/components/CustomerSearch';
import ThermalReceiptModal, { ThermalReceiptData } from '@/components/ThermalReceiptModal';
import PosPaymentModal, { PosPaymentDetails } from '@/components/PosPaymentModal';
import { cacheProductsLocally, getCachedProducts, cacheBusinessProfile, enqueueOfflineInvoice } from '@/lib/offline-db';
import OfflineStatusPill from '@/components/OfflineStatusPill';

interface BillItem {
  id: string;
  productId: string;
  name: string;
  hsn: string;
  unitSold?: string;
  quantity: number;
  price: number;
  gst: number;
  batchId?: string;
  batchNumber?: string;
  batchExpiry?: string;
  batchMrp?: number;
}

interface HeldBill {
  id: string;
  heldAt: string;
  customerName: string;
  customerPhone: string;
  customerState: string;
  items: BillItem[];
  total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Business config
  const [business, setBusiness] = useState<{
    name: string;
    logoUrl?: string;
    gstin?: string;
    stateCode?: string;
    phone?: string;
    address?: string;
    upiId?: string;
  }>({
    name: "Ziona Tech & Electricals",
    logoUrl: "",
    gstin: "32AAAAA0000A1Z5",
    stateCode: "32",
    phone: "",
    address: "",
    upiId: "zionabusiness@icici",
  });

  // Customer Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerState, setCustomerState] = useState("32");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID">("PAID");
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH" | "SPLIT" | "CREDIT">("UPI");

  // Cash Tender States
  const [cashReceived, setCashReceived] = useState<string>("");

  // Multi-item rows
  const [billItems, setBillItems] = useState<BillItem[]>([
    {
      id: "row-1",
      productId: "",
      name: "",
      hsn: "",
      quantity: 1,
      price: 0,
      gst: 18,
    },
  ]);

  // POS Full-Screen Payment Terminal Modal State
  const [showPosPaymentModal, setShowPosPaymentModal] = useState(false);
  const [isFullScreenPOS, setIsFullScreenPOS] = useState(false);

  // Toggle Full-Screen POS for counter touchscreens
  const toggleFullScreenPOS = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullScreenPOS(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullScreenPOS(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreenPOS(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Held Bills (Multi-Cart / Parked Bills)
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Thermal Roll Receipt State
  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Batch Picker States
  const [batchPickerItemIndex, setBatchPickerItemIndex] = useState<number | null>(null);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Load products & held bills from localStorage
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          const mappedProducts = data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            hsnCode: p.hsnCode,
            sellingPrice: Number(p.sellingPrice),
            gstRate: Number(p.gstRate),
            currentStock: Number(p.currentStock),
            minStockAlert: Number(p.minStockAlert),
          }));
          setCatalog(mappedProducts);
          cacheProductsLocally(mappedProducts);
        }
        if (data.tenant) {
          const biz = {
            name: data.tenant.businessName,
            logoUrl: data.tenant.logoUrl || "",
            gstin: data.tenant.gstin || "",
            stateCode: data.tenant.stateCode || "32",
            address: data.tenant.address || "",
            phone: data.tenant.phone || "",
            upiId: data.tenant.upiId || "",
          };
          setBusiness(biz);
          cacheBusinessProfile(biz);
        }
      } catch (err) {
        console.warn("Network error loading products, falling back to IndexedDB offline cache:", err);
        const cached = await getCachedProducts();
        if (cached && cached.length > 0) {
          setCatalog(cached);
        }
      } finally {
        setLoading(false);
      }
    }

    // Load parked carts from localStorage
    try {
      const savedHeld = localStorage.getItem("smartvyapar_held_bills");
      if (savedHeld) {
        setHeldBills(JSON.parse(savedHeld));
      }
    } catch (e) {
      console.warn("Could not read held bills from storage", e);
    }

    loadData();
  }, []);

  // Sync held bills to localStorage
  const saveHeldBillsToStorage = (updated: HeldBill[]) => {
    setHeldBills(updated);
    try {
      localStorage.setItem("smartvyapar_held_bills", JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save held bills", e);
    }
  };

  // Multi-Item Row Calculations
  const isIntraState = customerState === business.stateCode;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  billItems.forEach((item) => {
    if (item.productId && item.price > 0) {
      const itemSubtotal = item.price * item.quantity;
      totalTaxable += itemSubtotal;
      const itemTax = (itemSubtotal * item.gst) / 100;
      if (isIntraState) {
        totalCgst += itemTax / 2;
        totalSgst += itemTax / 2;
      } else {
        totalIgst += itemTax;
      }
    }
  });

  const grandTotal = totalTaxable + (isIntraState ? totalCgst + totalSgst : totalIgst);
  const currentUpiUri = `upi://pay?pa=${encodeURIComponent(business.upiId || "")}&pn=${encodeURIComponent(business.name)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=Invoice%20for%20${encodeURIComponent(customerName || "Customer")}`;

  // Cash Change Return Calculations
  const numericCashReceived = Number(cashReceived) || 0;
  const changeDue = Math.max(0, numericCashReceived - grandTotal);
  const remainingDue = Math.max(0, grandTotal - numericCashReceived);

  // Keyboard Shortcuts (F2, F7, F8, Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open, let modal manage keyboard events
      if (showPosPaymentModal) return;

      // F4 or Ctrl+Enter: Open Fullscreen POS Payment Terminal
      if (e.key === 'F4' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        const validCount = billItems.filter((i) => i.productId && i.price > 0).length;
        if (validCount > 0 && !isSubmitting) {
          setShowPosPaymentModal(true);
        } else if (validCount === 0) {
          alert("Please add at least 1 product to open POS checkout");
        }
      }
      // F11: Fullscreen POS Mode Toggle
      else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreenPOS();
      }
      // F7: Hold Bill
      else if (e.key === 'F7') {
        e.preventDefault();
        handleHoldBill();
      }
      // F8: Recall Held Bills
      else if (e.key === 'F8') {
        e.preventDefault();
        setShowHeldModal((prev) => !prev);
      }
      // F2: Add new line item
      else if (e.key === 'F2') {
        e.preventDefault();
        handleAddItem();
      }
      // F9: Reset / New Sale
      else if (e.key === 'F9') {
        e.preventDefault();
        handleResetNewSale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [billItems, customerName, customerPhone, customerState, grandTotal, totalTaxable, isSubmitting, heldBills, showPosPaymentModal]);

  // Multi-Item Handlers
  const handleAddItem = () => {
    setBillItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        productId: "",
        name: "",
        hsn: "",
        quantity: 1,
        price: 0,
        gst: 18,
      },
    ]);
  };

  const handleProductSelect = (index: number, product: ProductOption | null) => {
    const updated = [...billItems];
    if (!product) {
      updated[index] = {
        ...updated[index],
        productId: "",
        name: "",
        hsn: "",
        price: 0,
        gst: 18,
        batchId: undefined,
        batchNumber: undefined,
        batchExpiry: undefined,
        batchMrp: undefined,
      };
      setBillItems(updated);
    } else {
      updated[index] = {
        ...updated[index],
        productId: product.id,
        name: product.name,
        hsn: product.hsnCode,
        price: Number(product.sellingPrice),
        gst: Number(product.gstRate),
        batchId: undefined,
        batchNumber: undefined,
        batchExpiry: undefined,
        batchMrp: undefined,
      };
      setBillItems(updated);

      // Check if product has active batches (Multiple MRPs / FEFO)
      fetch(`/api/batches?productId=${product.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.batches) && data.batches.length > 0) {
            setAvailableBatches(data.batches);
            setBatchPickerItemIndex(index);
            setShowBatchModal(true);
          }
        })
        .catch((err) => console.error("Error loading batches for product:", err));
    }
  };

  const handlePickBatch = (batch: any) => {
    if (batchPickerItemIndex === null) return;
    const updated = [...billItems];
    updated[batchPickerItemIndex] = {
      ...updated[batchPickerItemIndex],
      price: Number(batch.sellingPrice),
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      batchExpiry: batch.expiryDate,
      batchMrp: Number(batch.mrp),
    };
    setBillItems(updated);
    setShowBatchModal(false);
    setBatchPickerItemIndex(null);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...billItems];
    updated[index].quantity = Math.max(1, qty);
    setBillItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...billItems];
    updated[index].price = Math.max(0, price);
    setBillItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (billItems.length === 1) {
      setBillItems([
        {
          id: `row-${Date.now()}`,
          productId: "",
          name: "",
          hsn: "",
          quantity: 1,
          price: 0,
          gst: 18,
        },
      ]);
      return;
    }
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const handleSelectCustomer = (customer: CustomerOption | null) => {
    if (!customer) {
      setCustomerName("");
      setCustomerPhone("");
      return;
    }
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    if (customer.stateCode) {
      setCustomerState(customer.stateCode);
    }
  };

  // Hold / Park Bill Handler
  const handleHoldBill = () => {
    const activeItems = billItems.filter((i) => i.productId && i.price > 0);
    if (activeItems.length === 0) {
      alert("Cannot park an empty cart! Add at least 1 product first.");
      return;
    }

    const newHeld: HeldBill = {
      id: `cart-${Date.now()}`,
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: customerName || "Cash / Walk-in",
      customerPhone: customerPhone || "",
      customerState: customerState || "32",
      items: activeItems,
      total: grandTotal,
    };

    const updated = [newHeld, ...heldBills];
    saveHeldBillsToStorage(updated);

    // Reset current active bill
    setCustomerName("");
    setCustomerPhone("");
    setCashReceived("");
    setBillItems([
      {
        id: `row-${Date.now()}`,
        productId: "",
        name: "",
        hsn: "",
        quantity: 1,
        price: 0,
        gst: 18,
      },
    ]);
  };

  // Recall Held Bill Handler
  const handleRecallBill = (heldBill: HeldBill) => {
    setCustomerName(heldBill.customerName === "Cash / Walk-in" ? "" : heldBill.customerName);
    setCustomerPhone(heldBill.customerPhone);
    setCustomerState(heldBill.customerState);
    setBillItems(heldBill.items);
    setCashReceived("");

    // Remove from held list
    const updated = heldBills.filter((h) => h.id !== heldBill.id);
    saveHeldBillsToStorage(updated);
    setShowHeldModal(false);
  };

  // Delete Held Bill Handler
  const handleDeleteHeldBill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = heldBills.filter((h) => h.id !== id);
    saveHeldBillsToStorage(updated);
  };

  // Reset New Sale Handler (F9)
  const handleResetNewSale = () => {
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMode("UPI");
    setPaymentStatus("PAID");
    setCashReceived("");
    setBillItems([
      {
        id: `row-${Date.now()}`,
        productId: "",
        name: "",
        hsn: "",
        quantity: 1,
        price: 0,
        gst: 18,
      },
    ]);
    setShowReceiptModal(false);
    setReceiptData(null);
  };

  // Submit Invoice to Neon DB (or Offline Storage)
  const handleCreateBill = async (customPaymentDetails?: PosPaymentDetails) => {
    const validItems = billItems.filter((i) => i.productId && i.price > 0);
    if (validItems.length === 0) {
      alert("Please add at least one valid product item");
      return;
    }

    setIsSubmitting(true);

    // Resolve tender & payment details
    const activeMode = customPaymentDetails?.paymentMode === "SPLIT"
      ? "CASH"
      : (customPaymentDetails?.paymentMode || paymentMode);
    const activeStatus = customPaymentDetails?.paymentStatus || paymentStatus;
    const activeCashReceived = customPaymentDetails?.cashReceived !== undefined
      ? customPaymentDetails.cashReceived
      : numericCashReceived;
    const activeChangeDue = customPaymentDetails?.changeReturned !== undefined
      ? customPaymentDetails.changeReturned
      : changeDue;

    const computedPaid = activeStatus === "PAID"
      ? grandTotal
      : (activeMode === "CASH" && activeCashReceived > 0 ? Math.min(grandTotal, activeCashReceived) : 0);
    const computedDue = Math.max(0, grandTotal - computedPaid);

    let paymentNotes: string | undefined = undefined;
    if (customPaymentDetails?.paymentMode === "SPLIT") {
      paymentNotes = `Split Tender: Cash ₹${Number(customPaymentDetails.splitCash || 0).toFixed(2)}, Online ₹${Number(customPaymentDetails.splitOnline || 0).toFixed(2)}`;
    }
    if (customPaymentDetails?.cardRef || customPaymentDetails?.cardLast4) {
      const cardInfo = `Card Ref: ${customPaymentDetails.cardRef || 'N/A'}${customPaymentDetails.cardLast4 ? ` (Last 4: ${customPaymentDetails.cardLast4})` : ''}`;
      paymentNotes = paymentNotes ? `${paymentNotes} | ${cardInfo}` : cardInfo;
    }

    const invoicePayload = {
      customerName: customerName || "Walk-in Cash Customer",
      customerPhone: customerPhone || "9999999999",
      customerStateCode: customerState,
      paymentStatus: activeStatus,
      paymentMode: activeMode,
      paidAmount: computedPaid,
      notes: paymentNotes,
      items: validItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
        batchId: i.batchId,
        batchNumber: i.batchNumber,
      })),
    };

    // Calculate savings from catalog / batch MRP
    let totalSavings = 0;
    const receiptItems = validItems.map((item) => {
      const catItem = catalog.find((c) => c.id === item.productId);
      const itemMrp = item.batchMrp || (catItem && catItem.sellingPrice ? Math.max(item.price, Number(catItem.sellingPrice) * 1.15) : item.price);
      if (itemMrp > item.price) {
        totalSavings += (itemMrp - item.price) * item.quantity;
      }
      return {
        name: item.batchNumber ? `${item.name} [${item.batchNumber}]` : item.name,
        hsn: item.hsn,
        quantity: item.quantity,
        unit: item.unitSold || "PCS",
        price: item.price,
        mrp: itemMrp,
        gstRate: item.gst,
        total: item.price * item.quantity,
      };
    });

    const displayPaymentMode = customPaymentDetails?.paymentMode || paymentMode;

    // Check if offline
    if (typeof window !== "undefined" && !navigator.onLine) {
      const offlineRecord = await enqueueOfflineInvoice(invoicePayload);

      // Decrement stock in local state
      setCatalog((prev) =>
        prev.map((prod) => {
          const matchedItem = validItems.find((vi) => vi.productId === prod.id);
          if (matchedItem) {
            return { ...prod, currentStock: Math.max(0, prod.currentStock - matchedItem.quantity) };
          }
          return prod;
        })
      );

      setReceiptData({
        invoiceNumber: offlineRecord.offlineInvoiceNumber,
        invoiceDate: offlineRecord.createdAt,
        customerName: customerName || "Walk-in Cash Customer",
        customerPhone: customerPhone,
        customerState: customerState,
        cashierName: "Counter 1 (Offline)",
        items: receiptItems,
        subTotal: Number(totalTaxable),
        taxableAmount: Number(totalTaxable),
        cgstAmount: Number(isIntraState ? totalCgst : 0),
        sgstAmount: Number(isIntraState ? totalSgst : 0),
        igstAmount: Number(!isIntraState ? totalIgst : 0),
        totalAmount: Number(grandTotal),
        paidAmount: Number(computedPaid),
        dueAmount: Number(computedDue),
        paymentMode: displayPaymentMode,
        cashReceived: activeCashReceived > 0 ? activeCashReceived : undefined,
        changeReturned: activeChangeDue > 0 ? activeChangeDue : undefined,
        totalSavings: totalSavings > 0 ? totalSavings : undefined,
        upiUri: currentUpiUri,
      });

      setShowReceiptModal(true);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoicePayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create invoice");
      }

      setReceiptData({
        invoiceNumber: data.invoice.invoiceNumber,
        invoiceDate: data.invoice.invoiceDate || new Date().toISOString(),
        customerName: customerName || "Walk-in Cash Customer",
        customerPhone: customerPhone,
        customerState: customerState,
        cashierName: "Counter 1",
        items: receiptItems,
        subTotal: Number(data.invoice.subTotal || totalTaxable),
        taxableAmount: Number(totalTaxable),
        cgstAmount: Number(data.invoice.cgstAmount || (isIntraState ? totalCgst : 0)),
        sgstAmount: Number(data.invoice.sgstAmount || (isIntraState ? totalSgst : 0)),
        igstAmount: Number(data.invoice.igstAmount || (!isIntraState ? totalIgst : 0)),
        totalAmount: Number(data.invoice.totalAmount || grandTotal),
        paidAmount: Number(data.invoice.paidAmount),
        dueAmount: Number(data.invoice.dueAmount),
        paymentMode: displayPaymentMode,
        cashReceived: activeCashReceived > 0 ? activeCashReceived : undefined,
        changeReturned: activeChangeDue > 0 ? activeChangeDue : undefined,
        totalSavings: totalSavings > 0 ? totalSavings : undefined,
        upiUri: data.invoice.upiUri || currentUpiUri,
      });

      setShowReceiptModal(true);
    } catch (err: any) {
      if (typeof window !== "undefined" && (!navigator.onLine || err.message?.includes("Failed to fetch") || err.message?.includes("network"))) {
        try {
          const offlineRecord = await enqueueOfflineInvoice(invoicePayload);
          setReceiptData({
            invoiceNumber: offlineRecord.offlineInvoiceNumber,
            invoiceDate: offlineRecord.createdAt,
            customerName: customerName || "Walk-in Cash Customer",
            customerPhone: customerPhone,
            customerState: customerState,
            cashierName: "Counter 1 (Offline)",
            items: receiptItems,
            subTotal: Number(totalTaxable),
            taxableAmount: Number(totalTaxable),
            cgstAmount: Number(isIntraState ? totalCgst : 0),
            sgstAmount: Number(isIntraState ? totalSgst : 0),
            igstAmount: Number(!isIntraState ? totalIgst : 0),
            totalAmount: Number(grandTotal),
            paidAmount: Number(computedPaid),
            dueAmount: Number(computedDue),
            paymentMode: displayPaymentMode,
            cashReceived: activeCashReceived > 0 ? activeCashReceived : undefined,
            changeReturned: activeChangeDue > 0 ? activeChangeDue : undefined,
            totalSavings: totalSavings > 0 ? totalSavings : undefined,
            upiUri: currentUpiUri,
          });
          setShowReceiptModal(true);
          return;
        } catch (enqueueErr) {
          alert("Error: " + err.message);
        }
      } else {
        alert("Error: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Sale Callback from Full-Screen POS Modal
  const handleCompleteSaleFromModal = async (details: PosPaymentDetails) => {
    if (details.cashReceived !== undefined) {
      setCashReceived(String(details.cashReceived));
    }
    setPaymentMode(details.paymentMode === "SPLIT" ? "CASH" : (details.paymentMode as any));
    setPaymentStatus(details.paymentStatus);
    await handleCreateBill(details);
    setShowPosPaymentModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Keyboard Hotkeys Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-3">
          <Link href="/" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Tax Invoice (POS)</h1>
            <p className="text-xs text-slate-500">Multi-item billing with dual GST, hold bills, and cash calculator</p>
          </div>
        </div>

        {/* Hold, Recall, Fullscreen Actions & Offline Pill */}
        <div className="flex items-center space-x-2">
          <OfflineStatusPill />

          {/* Fullscreen POS Toggle */}
          <button
            type="button"
            onClick={toggleFullScreenPOS}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition flex items-center space-x-1.5 shadow-sm"
            title="Toggle full screen dedicated POS terminal (F11)"
          >
            {isFullScreenPOS ? <Minimize2 className="h-4 w-4 text-indigo-600" /> : <Maximize2 className="h-4 w-4 text-indigo-600" />}
            <span className="hidden sm:inline">{isFullScreenPOS ? "Exit Fullscreen" : "Fullscreen POS"}</span>
            <span className="hidden md:inline rounded bg-slate-100 px-1 py-0.2 text-[9px] font-mono text-slate-500">F11</span>
          </button>

          {/* Hold Current Bill Button */}
          <button
            type="button"
            onClick={handleHoldBill}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition flex items-center space-x-1.5 shadow-sm"
            title="Park current cart to serve next customer (F7)"
          >
            <PauseCircle className="h-4 w-4 text-amber-500" />
            <span>Hold Bill</span>
            <span className="hidden md:inline rounded bg-slate-100 px-1 py-0.2 text-[9px] font-mono text-slate-500">F7</span>
          </button>

          {/* Recall Held Bills Button */}
          <button
            type="button"
            onClick={() => setShowHeldModal(true)}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
              heldBills.length > 0
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
            title="Recall parked carts (F8)"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Held Carts ({heldBills.length})</span>
            <span className="hidden md:inline rounded bg-black/10 px-1 py-0.2 text-[9px] font-mono">F8</span>
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Helper Ribbon */}
      <div className="hidden lg:flex items-center justify-between rounded-xl bg-slate-900 text-slate-300 px-4 py-2 text-[11px] font-medium">
        <div className="flex items-center space-x-3.5">
          <span className="flex items-center space-x-1 text-slate-400 font-bold">
            <Keyboard className="h-3.5 w-3.5 text-indigo-400" />
            <span>Hotkeys:</span>
          </span>
          <span><kbd className="bg-indigo-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">F4 / Ctrl+↵</kbd> Pay & Tender</span>
          <span><kbd className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">F2</kbd> +Line</span>
          <span><kbd className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">F7</kbd> Hold</span>
          <span><kbd className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">F8</kbd> Carts</span>
          <span><kbd className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">F9</kbd> Reset</span>
          <span><kbd className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">F11</kbd> Fullscreen</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Tax Rule: {isIntraState ? "CGST (9%) + SGST (9%)" : "IGST (18%)"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Bill Entry Form */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          {/* Customer Selection & Search */}
          <CustomerSearch
            customerName={customerName}
            customerPhone={customerPhone}
            onSelectCustomer={handleSelectCustomer}
            onNameChange={setCustomerName}
            onPhoneChange={setCustomerPhone}
          />

          {/* Tax Jurisdiction & Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">State / Place of Supply</label>
              <select
                value={customerState}
                onChange={(e) => setCustomerState(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="32">Kerala (32 - Intra-state CGST + SGST)</option>
                <option value="33">Tamil Nadu (33 - Inter-state IGST)</option>
                <option value="29">Karnataka (29 - Inter-state IGST)</option>
                <option value="27">Maharashtra (27 - Inter-state IGST)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as "PAID" | "UNPAID")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none font-semibold"
              >
                <option value="PAID">Paid in Full (Cash / UPI)</option>
                <option value="UNPAID">Unpaid (Customer Credit / Udhar)</option>
              </select>
            </div>
          </div>

          {/* Line Items with Searchable Combobox */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Line Items ({billItems.filter((i) => i.productId).length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item (F2)</span>
              </button>
            </div>

            <div className="space-y-3">
              {billItems.map((item, idx) => {
                const itemSubtotal = item.price * item.quantity;
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {idx + 1}
                    </span>

                    {/* Searchable Product Combobox */}
                    <div className="flex-1 min-w-[220px] w-full">
                      <label className="block text-[10px] font-semibold text-slate-500 sm:hidden">Product Search</label>
                      <ProductSearchCombobox
                        products={catalog}
                        selectedProductId={item.productId}
                        onSelect={(prod) => handleProductSelect(idx, prod)}
                      />
                      {item.batchNumber && (
                        <div className="mt-1 flex items-center space-x-1.5 text-[10px]">
                          <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 font-mono font-bold text-indigo-700">
                            Batch: {item.batchNumber}
                          </span>
                          {item.batchExpiry && (
                            <span className="text-slate-500">
                              Exp: {new Date(item.batchExpiry).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                            </span>
                          )}
                          {item.batchMrp && (
                            <span className="text-slate-400">
                              MRP: ₹{item.batchMrp}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    <div className="w-20">
                      <label className="block text-[10px] font-semibold text-slate-500 sm:hidden">Qty</label>
                      <input
                        type="number"
                        min="1"
                        disabled={!item.productId}
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-center font-bold focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>

                    {/* Price */}
                    <div className="w-24">
                      <label className="block text-[10px] font-semibold text-slate-500 sm:hidden">Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        disabled={!item.productId}
                        value={item.price}
                        onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-right font-medium focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="w-28 text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900">₹{itemSubtotal.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.productId ? `+${item.gst}% GST` : "Select item"}
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Another Product (F2)</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const validCount = billItems.filter((i) => i.productId && i.price > 0).length;
              if (validCount === 0) {
                alert("Please add at least one product to open POS checkout");
                return;
              }
              setShowPosPaymentModal(true);
            }}
            disabled={isSubmitting || totalTaxable === 0}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 py-4 text-sm font-black text-white shadow-lg hover:shadow-indigo-500/25 hover:from-indigo-500 hover:to-indigo-700 transition disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
            )}
            <span>
              {isSubmitting ? "Processing Sale..." : `⚡ Pay & Tender Terminal (F4 / Ctrl+Enter) • ₹${grandTotal.toFixed(2)}`}
            </span>
          </button>
        </div>

        {/* Right Column: Live Bill Summary, Payment Tender & Cash Calculator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Business Header */}
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{business.name}</h3>
                <p className="text-xs text-slate-500">GSTIN: {business.gstin}</p>
              </div>
              <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">POS Terminal</span>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Settlement Mode</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'UPI', label: 'UPI (QR)' },
                  { id: 'CASH', label: 'Cash Tender' },
                  { id: 'CREDIT', label: 'Khata / Credit' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode.id as any);
                      if (mode.id === 'CREDIT') {
                        setPaymentStatus('UNPAID');
                      } else {
                        setPaymentStatus('PAID');
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      paymentMode === mode.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CASH TENDER & CHANGE RETURN CALCULATOR */}
            {paymentMode === 'CASH' && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <span>Cash Tender & Change Return</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                    Cash Received from Customer (₹)
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter cash note e.g. 500 or 2000"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Quick Cash Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashReceived(String(Math.ceil(grandTotal)))}
                    className="rounded-lg bg-white border border-amber-300 px-2 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100"
                  >
                    Exact (₹{Math.ceil(grandTotal)})
                  </button>
                  {[100, 200, 500, 1000, 2000]
                    .filter((note) => note >= grandTotal)
                    .slice(0, 3)
                    .map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => setCashReceived(String(note))}
                        className="rounded-lg bg-white border border-amber-300 px-2 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100"
                      >
                        ₹{note} Note
                      </button>
                    ))}
                </div>

                {/* Return Change Banner */}
                {numericCashReceived > 0 && (
                  <div className="pt-2 border-t border-amber-200/80">
                    {changeDue > 0 ? (
                      <div className="rounded-xl bg-emerald-600 text-white p-3 text-center shadow-sm">
                        <span className="text-[10px] font-semibold uppercase tracking-wider block opacity-90">
                          Cashier Return to Customer:
                        </span>
                        <span className="text-xl font-black block mt-0.5">
                          ₹{changeDue.toFixed(2)}
                        </span>
                      </div>
                    ) : remainingDue > 0 ? (
                      <div className="rounded-xl bg-rose-600 text-white p-2 text-center text-xs font-bold">
                        Shortage / Due: ₹{remainingDue.toFixed(2)}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-emerald-100 text-emerald-900 p-2 text-center text-xs font-bold">
                        ✓ Exact Cash Received
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bill Summary Breakdown */}
            <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold text-slate-900">{customerName || "Walk-in Cash"}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxable Subtotal:</span>
                <span>₹{totalTaxable.toFixed(2)}</span>
              </div>

              {isIntraState ? (
                <>
                  <div className="flex justify-between text-indigo-600">
                    <span>CGST:</span>
                    <span>₹{totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-600">
                    <span>SGST:</span>
                    <span>₹{totalSgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-indigo-600">
                  <span>IGST:</span>
                  <span>₹{totalIgst.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-base text-slate-900">
                <span>Net Payable:</span>
                <span className="text-indigo-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* UPI QR Box (when UPI selected) */}
            {paymentMode === 'UPI' && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white mb-2 shadow-sm">
                  <QrCode className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800">Dynamic NPCI UPI QR</p>
                <p className="text-[10px] text-slate-500 mb-1">GPay • PhonePe • Paytm • BHIM</p>
                <div className="rounded bg-white p-1.5 text-[10px] font-mono text-slate-600 break-all border border-slate-200">
                  {business.upiId}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => {
                const validCount = billItems.filter((i) => i.productId && i.price > 0).length;
                if (validCount === 0) {
                  alert("Please add at least 1 product to open POS checkout");
                  return;
                }
                setShowPosPaymentModal(true);
              }}
              disabled={totalTaxable === 0 || isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 py-3 text-xs font-black text-white shadow-md transition disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 flex items-center justify-center space-x-2"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>⚡ Open Tender Terminal (F4)</span>
            </button>

            <a
              href={`https://wa.me/91${customerPhone}?text=${encodeURIComponent(
                `Hello ${customerName}, your invoice total is ₹${grandTotal.toFixed(
                  2
                )}. Pay directly via UPI: ${currentUpiUri}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className={`w-full rounded-xl py-2.5 text-center text-xs font-semibold text-white flex items-center justify-center space-x-1 ${
                customerPhone && totalTaxable > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-300 pointer-events-none'
              }`}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>WhatsApp Invoice</span>
            </a>
          </div>
        </div>
      </div>

      {/* 
        MODAL: HELD BILLS / PARKED CARTS (F8)
      */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Parked / Held Bills ({heldBills.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Click any cart to resume billing for that customer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHeldModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal List */}
            <div className="p-6 overflow-y-auto space-y-3">
              {heldBills.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <PauseCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No bills are currently on hold.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Press F7 anytime to park a customer cart.</p>
                </div>
              ) : (
                heldBills.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => handleRecallBill(bill)}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs">{bill.customerName}</span>
                        <span className="flex items-center space-x-1 text-[10px] text-slate-400 font-medium">
                          <Clock className="h-3 w-3" />
                          <span>{bill.heldAt}</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {bill.items.length} Product{bill.items.length > 1 ? 's' : ''} ({bill.items.map((i) => i.name).slice(0, 2).join(', ')}{bill.items.length > 2 ? '...' : ''})
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <div className="font-black text-sm text-slate-900">₹{bill.total.toFixed(2)}</div>
                        <span className="text-[10px] font-bold text-amber-600 group-hover:underline">
                          Resume Cart →
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteHeldBill(bill.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Discard cart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowHeldModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Batch & Expiry Selection Modal (FEFO) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center space-x-2">
                  <span>Select Active Batch</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    FEFO Recommended
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Multiple MRPs & Expiries detected for this product
                </p>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
              {availableBatches.map((b, bIdx) => {
                const isExpSoon = b.expiryStatus === "EXPIRING_SOON";
                const isExp = b.expiryStatus === "EXPIRED";
                return (
                  <div
                    key={b.id}
                    onClick={() => handlePickBatch(b)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isExp
                        ? 'border-rose-200 bg-rose-50/50 opacity-60'
                        : isExpSoon
                        ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/60'
                        : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-indigo-700">
                          Batch: {b.batchNumber}
                        </span>
                        {bIdx === 0 && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                            Oldest Expiry (Sell First)
                          </span>
                        )}
                        {isExpSoon && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                            Expiring in {b.daysRemaining}d
                          </span>
                        )}
                        {isExp && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-800">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-3">
                        <span>Stock: <strong>{Number(b.currentStock)} PCS</strong></span>
                        {b.expiryDate && (
                          <span>Exp: <strong>{new Date(b.expiryDate).toLocaleDateString("en-IN")}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-sm text-emerald-700">₹{Number(b.sellingPrice).toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">MRP: ₹{Number(b.mrp).toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs">
              <span className="text-slate-500 text-[11px]">Tip: Always sell earlier expiries first</span>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Skip Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* World-Class Full-Screen POS Payment & Tender Terminal Modal */}
      <PosPaymentModal
        isOpen={showPosPaymentModal}
        onClose={() => setShowPosPaymentModal(false)}
        grandTotal={grandTotal}
        totalTaxable={totalTaxable}
        totalTax={isIntraState ? totalCgst + totalSgst : totalIgst}
        items={billItems
          .filter((i) => i.productId && i.price > 0)
          .map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            gst: i.gst,
            batchNumber: i.batchNumber,
          }))}
        customerName={customerName}
        customerPhone={customerPhone}
        upiId={business.upiId || ""}
        businessName={business.name}
        onCompleteSale={handleCompleteSaleFromModal}
        isSubmitting={isSubmitting}
      />

      {/* ESC/POS Thermal Roll Receipt Modal (80mm / 58mm) */}
      <ThermalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        data={receiptData}
        business={business}
        onNewSale={handleResetNewSale}
      />

    </div>
  );
}
