'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  CreditCard,
  Layers,
  BookOpen,
  Volume2,
  Copy,
  AlertTriangle,
  Coins
} from 'lucide-react';
import Link from 'next/link';
import ProductSearchCombobox, { ProductOption } from '@/components/ProductSearchCombobox';
import CustomerSearch, { CustomerOption } from '@/components/CustomerSearch';
import ThermalReceiptModal, { ThermalReceiptData } from '@/components/ThermalReceiptModal';
import QrCodeCanvas from '@/components/QrCodeCanvas';
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

// Indian Denomination Breakdown Helper
function getIndianDenominations(amount: number): Array<{ label: string; count: number }> {
  if (amount <= 0) return [];
  const notes = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  let remaining = Math.floor(amount);
  const result: Array<{ label: string; count: number }> = [];

  for (const n of notes) {
    if (remaining >= n) {
      const count = Math.floor(remaining / n);
      result.push({ label: `₹${n}`, count });
      remaining = remaining % n;
    }
  }

  const paise = Math.round((amount - Math.floor(amount)) * 100);
  if (paise > 0) {
    result.push({ label: `${paise}p`, count: 1 });
  }

  return result;
}

// Audio synthesizer for Paytm/PhonePe style soundbox chime
function playSoundboxChime(amountText: string) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play pleasant dual ascending chime
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
    });

    // Voice announcement simulation via Web Speech API
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        const text = `Received payment of rupees ${Math.round(Number(amountText) || 0)} on SmartVyapar.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }, 500);
    }
  } catch (err) {
    console.warn('Audio chime warning:', err);
  }
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
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH" | "CARD" | "SPLIT" | "CREDIT">("CASH");

  // Cash Tender States
  const [cashReceived, setCashReceived] = useState<string>("");
  const [splitCashInput, setSplitCashInput] = useState<string>("");
  const [cardRef, setCardRef] = useState<string>("");
  const [cardLast4, setCardLast4] = useState<string>("");
  const [soundboxPlayed, setSoundboxPlayed] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Multi-item rows (default with 1 empty row for quick scanning)
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

  // Fullscreen counter state
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
  const currentUpiUri = `upi://pay?pa=${encodeURIComponent(business.upiId || "zionabusiness@icici")}&pn=${encodeURIComponent(business.name)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=Invoice%20for%20${encodeURIComponent(customerName || "Customer")}`;

  // Cash Change Return Calculations
  const numericCashReceived = Number(cashReceived) || 0;
  const changeDue = Math.max(0, numericCashReceived - grandTotal);
  const remainingDue = Math.max(0, grandTotal - numericCashReceived);
  const returnNotes = getIndianDenominations(changeDue);

  // Split calculations
  const numericSplitCash = parseFloat(splitCashInput) || 0;
  const splitOnlineRemaining = Math.max(0, grandTotal - numericSplitCash);

  // Quick denomination suggestions for India
  const denominations = [
    { label: `Exact (₹${grandTotal.toFixed(2)})`, value: grandTotal },
    { label: `₹${Math.ceil((grandTotal || 100) / 10) * 10}`, value: Math.ceil((grandTotal || 100) / 10) * 10 },
    { label: `₹${Math.ceil((grandTotal || 100) / 50) * 50}`, value: Math.ceil((grandTotal || 100) / 50) * 50 },
    { label: `₹${Math.ceil((grandTotal || 100) / 100) * 100}`, value: Math.ceil((grandTotal || 100) / 100) * 100 },
    { label: '₹500', value: 500 },
    { label: '₹1,000', value: 1000 },
    { label: '₹2,000', value: 2000 },
  ].filter((d, idx, arr) => d.value >= grandTotal && arr.findIndex(x => x.value === d.value) === idx);

  // Auto-fill exact cash when switching to Cash
  useEffect(() => {
    if (paymentMode === 'CASH' && grandTotal > 0 && !cashReceived) {
      setCashReceived(String(Math.ceil(grandTotal)));
    }
    if (paymentMode === 'SPLIT' && grandTotal > 0 && !splitCashInput) {
      setSplitCashInput(String(Math.round(grandTotal / 2)));
    }
  }, [paymentMode, grandTotal]);

  // NumPad button click handler
  const handleNumpadPress = (char: string) => {
    if (char === 'C') {
      setCashReceived('');
    } else if (char === 'BACK') {
      setCashReceived((prev) => prev.slice(0, -1));
    } else if (char === '.') {
      if (!cashReceived.includes('.')) {
        setCashReceived((prev) => (prev ? prev + '.' : '0.'));
      }
    } else {
      setCashReceived((prev) => (prev === '0' ? char : prev + char));
    }
  };

  // Keyboard Shortcuts (F1-F5 Modes, F2 Line, F7 Hold, F8 Carts, F9 Reset, F11 Fullscreen, Enter Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept hotkeys if typing in text inputs (except hotkeys F1-F12)
      const target = e.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (e.key === 'F1') {
        e.preventDefault();
        setPaymentMode('CASH');
        setPaymentStatus('PAID');
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleAddItem();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setPaymentMode('CARD');
        setPaymentStatus('PAID');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setPaymentMode('UPI');
        setPaymentStatus('PAID');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setPaymentMode('CREDIT');
        setPaymentStatus('UNPAID');
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setShowHeldModal((prev) => !prev);
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleResetNewSale();
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreenPOS();
      } else if (e.key === 'Enter' && !isInputFocused) {
        e.preventDefault();
        if (totalTaxable > 0 && !isSubmitting) {
          handleCreateBill();
        }
      } else if (e.key === 'Escape') {
        // Exit to dashboard
        if (!showHeldModal && !showBatchModal && !showReceiptModal) {
          router.push('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [billItems, customerName, customerPhone, customerState, grandTotal, totalTaxable, isSubmitting, heldBills, paymentMode, cashReceived, showHeldModal, showBatchModal, showReceiptModal]);

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
      return;
    }

    updated[index] = {
      ...updated[index],
      productId: product.id,
      name: product.name,
      hsn: product.hsnCode || "8504",
      price: Number(product.sellingPrice) || 0,
      gst: Number(product.gstRate) || 18,
    };
    setBillItems(updated);

    // Auto-fetch batches for FEFO selection if available
    fetchBatchesForProduct(product.id, index);
  };

  const fetchBatchesForProduct = async (productId: string, itemIndex: number) => {
    try {
      const res = await fetch(`/api/batches?productId=${productId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.batches) && data.batches.length > 0) {
        setAvailableBatches(data.batches);
        setBatchPickerItemIndex(itemIndex);
        if (data.batches.length === 1) {
          handlePickBatch(data.batches[0], itemIndex);
        } else {
          setShowBatchModal(true);
        }
      }
    } catch (e) {
      console.warn("Could not fetch batches:", e);
    }
  };

  const handlePickBatch = (batch: any, overrideIndex?: number) => {
    const targetIdx = overrideIndex !== undefined ? overrideIndex : batchPickerItemIndex;
    if (targetIdx === null || targetIdx === undefined || !billItems[targetIdx]) return;

    const updated = [...billItems];
    updated[targetIdx] = {
      ...updated[targetIdx],
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      batchExpiry: batch.expiryDate,
      batchMrp: Number(batch.mrp),
      price: Number(batch.sellingPrice) || updated[targetIdx].price,
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
    setPaymentMode("CASH");
    setPaymentStatus("PAID");
    setCashReceived("");
    setSplitCashInput("");
    setCardRef("");
    setCardLast4("");
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
  const handleCreateBill = async () => {
    const validItems = billItems.filter((i) => i.productId && i.price > 0);
    if (validItems.length === 0) {
      alert("Please add at least one product item to bill!");
      return;
    }

    setIsSubmitting(true);

    const activeMode = paymentMode === "SPLIT" ? "CASH" : paymentMode;
    const computedPaid = paymentStatus === "PAID" 
      ? grandTotal 
      : (activeMode === "CASH" && numericCashReceived > 0 ? Math.min(grandTotal, numericCashReceived) : 0);
    const computedDue = Math.max(0, grandTotal - computedPaid);

    let paymentNotes: string | undefined = undefined;
    if (paymentMode === "SPLIT") {
      paymentNotes = `Split Tender: Cash ₹${numericSplitCash.toFixed(2)}, Online ₹${splitOnlineRemaining.toFixed(2)}`;
    }
    if (cardRef || cardLast4) {
      const cardInfo = `Card Ref: ${cardRef || 'N/A'}${cardLast4 ? ` (Last 4: ${cardLast4})` : ''}`;
      paymentNotes = paymentNotes ? `${paymentNotes} | ${cardInfo}` : cardInfo;
    }

    const invoicePayload = {
      customerName: customerName || "Walk-in Cash Customer",
      customerPhone: customerPhone || "9999999999",
      customerStateCode: customerState,
      paymentStatus,
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
        paymentMode,
        cashReceived: numericCashReceived > 0 ? numericCashReceived : undefined,
        changeReturned: changeDue > 0 ? changeDue : undefined,
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
        paymentMode,
        cashReceived: numericCashReceived > 0 ? numericCashReceived : undefined,
        changeReturned: changeDue > 0 ? changeDue : undefined,
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
            paymentMode,
            cashReceived: numericCashReceived > 0 ? numericCashReceived : undefined,
            changeReturned: changeDue > 0 ? changeDue : undefined,
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

  const handleTriggerSoundbox = () => {
    playSoundboxChime(grandTotal > 0 ? grandTotal.toFixed(2) : "100");
    setSoundboxPlayed(true);
    setTimeout(() => setSoundboxPlayed(false), 3000);
  };

  const handleCopyUpi = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUpiUri);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    // FULL-SCREEN POS TERMINAL POPUP: Overlays 100vw x 100vh with no sidebar clutter
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans select-none animate-in fade-in duration-150">
      
      {/* 1. TOP POS TERMINAL HEADER */}
      <header className="h-14 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
        {/* Left: Brand, Store Name & Counter */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-inner shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                {business.name}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                POS Terminal v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Counter 1 • GSTIN: {business.gstin || "Unregistered"} • Place of Supply: {customerState}
            </p>
          </div>
        </div>

        {/* Middle: Keyboard Hotkeys Guide */}
        <div className="hidden xl:flex items-center space-x-2 text-[11px] text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 font-mono">
          <span className="text-slate-400 font-sans font-bold">Hotkeys:</span>
          <span><kbd className="bg-slate-700 text-white px-1 rounded font-bold">F1</kbd> Cash</span>
          <span><kbd className="bg-slate-700 text-white px-1 rounded font-bold">F2</kbd> +Line</span>
          <span><kbd className="bg-slate-700 text-white px-1 rounded font-bold">F3</kbd> Card</span>
          <span><kbd className="bg-slate-700 text-white px-1 rounded font-bold">F4</kbd> UPI</span>
          <span><kbd className="bg-slate-700 text-white px-1 rounded font-bold">F7</kbd> Hold</span>
          <span><kbd className="bg-slate-700 text-white px-1 rounded font-bold">F8</kbd> Carts</span>
          <span><kbd className="bg-slate-700 text-white px-1 rounded font-bold">F9</kbd> New</span>
          <span><kbd className="bg-emerald-700 text-white px-1.5 rounded font-bold">Enter</kbd> Print</span>
        </div>

        {/* Right: Actions, Fullscreen Toggle, and Exit POS */}
        <div className="flex items-center space-x-2 shrink-0">
          <OfflineStatusPill />

          {/* Hold Current Cart */}
          <button
            type="button"
            onClick={handleHoldBill}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center space-x-1"
            title="Park current cart to serve next customer (F7)"
          >
            <PauseCircle className="h-4 w-4 text-amber-400" />
            <span className="hidden md:inline">Hold</span>
            <span className="text-[9px] font-mono opacity-60">F7</span>
          </button>

          {/* Recall Held Carts */}
          <button
            type="button"
            onClick={() => setShowHeldModal(true)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
              heldBills.length > 0
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
            title="Recall parked carts (F8)"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden md:inline">Carts</span>
            <span className="rounded-full bg-black/20 px-1 text-[10px] font-mono">{heldBills.length}</span>
          </button>

          {/* Fullscreen Hardware POS Mode */}
          <button
            type="button"
            onClick={toggleFullScreenPOS}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
            title="Toggle Fullscreen Browser Mode (F11)"
          >
            {isFullScreenPOS ? <Minimize2 className="h-4 w-4 text-indigo-400" /> : <Maximize2 className="h-4 w-4 text-indigo-400" />}
          </button>

          {/* Exit POS / Back to Dashboard */}
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition flex items-center space-x-1"
            title="Exit POS Terminal to Dashboard (Esc)"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit POS</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY: 2-COLUMN FULLSCREEN SPLIT TERMINAL */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANEL: CART, ITEMS & CUSTOMER SELECTOR (52% on Desktop) */}
        <section className="w-full lg:w-[52%] border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 flex flex-col p-4 sm:p-5 overflow-hidden">
          
          {/* Customer Bar */}
          <div className="mb-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner shrink-0">
            <CustomerSearch
              customerName={customerName}
              customerPhone={customerPhone}
              onSelectCustomer={handleSelectCustomer}
              onNameChange={setCustomerName}
              onPhoneChange={setCustomerPhone}
            />
          </div>

          {/* Barcode & Product Quick Search */}
          <div className="mb-3 shrink-0">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Barcode Scanner / Fast Product Lookup
            </label>
            <ProductSearchCombobox
              products={catalog}
              selectedProductId=""
              onSelect={(product) => {
                if (!product) return;
                // If the first row is empty, fill it; otherwise append a new row
                const emptyIdx = billItems.findIndex((i) => !i.productId);
                if (emptyIdx !== -1) {
                  handleProductSelect(emptyIdx, product);
                } else {
                  setBillItems((prev) => [
                    ...prev,
                    {
                      id: `row-${Date.now()}`,
                      productId: product.id,
                      name: product.name,
                      hsn: product.hsnCode || "8504",
                      quantity: 1,
                      price: Number(product.sellingPrice) || 0,
                      gst: Number(product.gstRate) || 18,
                    },
                  ]);
                }
              }}
            />
          </div>

          {/* Cart Items List Table */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 rounded-2xl bg-slate-950/40 p-2 border border-slate-800/80">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Cart Items ({billItems.filter(i => i.productId && i.price > 0).length})</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-bold"
              >
                <Plus className="h-3 w-3" />
                <span>+ Add Row (F2)</span>
              </button>
            </div>

            {billItems.map((item, idx) => {
              const itemSubtotal = item.price * item.quantity;
              return (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    item.productId ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/40 border-dashed border-slate-800'
                  }`}
                >
                  {/* Product Picker */}
                  <div className="flex-1 min-w-[200px] w-full">
                    <ProductSearchCombobox
                      products={catalog}
                      selectedProductId={item.productId}
                      onSelect={(prod) => handleProductSelect(idx, prod)}
                    />
                    {item.batchNumber && (
                      <div className="mt-1 flex items-center space-x-1.5 text-[10px]">
                        <span className="rounded bg-indigo-950 border border-indigo-700 px-1.5 py-0.2 font-mono font-bold text-indigo-300">
                          Batch: {item.batchNumber}
                        </span>
                        {item.batchExpiry && (
                          <span className="text-slate-400">
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

                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, Math.max(1, item.quantity - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                      className="w-12 h-7 rounded-lg bg-slate-950 border border-slate-700 text-white font-black text-xs text-center focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>

                  {/* Price */}
                  <div className="w-24 shrink-0">
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                      className="w-full h-7 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono font-bold text-xs text-right px-2 focus:border-indigo-500 focus:outline-none"
                      placeholder="₹ Price"
                    />
                    <span className="block text-[9px] text-slate-400 text-right mt-0.5 font-mono">
                      +{item.gst}% GST
                    </span>
                  </div>

                  {/* Line Total */}
                  <div className="w-20 text-right shrink-0">
                    <div className="font-mono font-black text-sm text-white">
                      ₹{itemSubtotal.toFixed(2)}
                    </div>
                  </div>

                  {/* Trash */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Subtotal Summary Footer */}
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shrink-0 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Taxable Subtotal:</span>
              <span className="font-mono font-bold text-slate-200">₹{totalTaxable.toFixed(2)}</span>
            </div>
            {isIntraState ? (
              <div className="flex justify-between text-indigo-300">
                <span>CGST (9%) + SGST (9%):</span>
                <span className="font-mono font-bold">₹{(totalCgst + totalSgst).toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-indigo-300">
                <span>Integrated IGST (18%):</span>
                <span className="font-mono font-bold">₹{totalIgst.toFixed(2)}</span>
              </div>
            )}
          </div>

        </section>

        {/* RIGHT PANEL: WORLD'S MOST ADVANCED TENDER & PAYMENT CONSOLE (48% on Desktop) */}
        <main className="w-full lg:w-[48%] flex flex-col bg-slate-950 p-4 sm:p-5 justify-between overflow-y-auto">
          
          <div className="space-y-4">
            
            {/* GIANT LIVE PAYABLE BANNER */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-700/50 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
                  Net Amount Payable
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-0.5">
                  ₹{grandTotal.toFixed(2)}
                </div>
                <div className="text-[11px] text-indigo-300 mt-1">
                  Taxable: ₹{totalTaxable.toFixed(2)} • GST: ₹{(isIntraState ? totalCgst + totalSgst : totalIgst).toFixed(2)}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {billItems.filter(i => i.productId && i.price > 0).length} Items
                </span>
              </div>
            </div>

            {/* PAYMENT MODE SELECTOR TABS */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Settlement Tender Mode
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'CASH', label: 'Cash', hotkey: 'F1', icon: Banknote },
                  { id: 'UPI', label: 'UPI QR', hotkey: 'F4', icon: QrCode },
                  { id: 'CARD', label: 'Card', hotkey: 'F3', icon: CreditCard },
                  { id: 'SPLIT', label: 'Split', hotkey: 'F4', icon: Layers },
                  { id: 'CREDIT', label: 'Khata', hotkey: 'F5', icon: BookOpen },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = paymentMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPaymentMode(tab.id as any);
                        if (tab.id === 'CREDIT') {
                          setPaymentStatus('UNPAID');
                        } else {
                          setPaymentStatus('PAID');
                        }
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center space-y-1 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] font-black">{tab.label}</span>
                      <span className="text-[9px] font-mono opacity-50">{tab.hotkey}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1. CASH TENDER CONSOLE */}
            {paymentMode === 'CASH' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Cash Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      Cash Received from Customer (₹)
                    </label>
                    {numericCashReceived > 0 && (
                      <button
                        type="button"
                        onClick={() => setCashReceived('')}
                        className="text-[11px] font-bold text-rose-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-500 font-mono">
                      ₹
                    </span>
                    <input
                      type="text"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-900 border-2 border-indigo-500 text-white font-mono font-black text-2xl tracking-wide focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-inner"
                    />
                  </div>
                </div>

                {/* Interactive Currency Denomination Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Quick Currency Denominations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {denominations.map((denom) => (
                      <button
                        key={denom.label}
                        type="button"
                        onClick={() => setCashReceived(String(denom.value))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition font-mono ${
                          numericCashReceived === denom.value
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 hover:border-indigo-400 hover:bg-slate-800'
                        }`}
                      >
                        {denom.label}
                      </button>
                    ))}
                    {[50, 100, 500].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setCashReceived(String(numericCashReceived + step))}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono bg-slate-800 text-indigo-300 border border-slate-700 hover:bg-slate-700"
                      >
                        +{step}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tactile On-Screen NumPad */}
                <div className="grid grid-cols-4 gap-1.5 max-w-sm">
                  {['7', '8', '9', 'C', '4', '5', '6', 'BACK', '1', '2', '3', '.', '0', '00'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleNumpadPress(btn)}
                      className={`h-10 rounded-xl text-base font-black font-mono transition flex items-center justify-center shadow-xs active:scale-95 ${
                        btn === 'C'
                          ? 'bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900'
                          : btn === 'BACK'
                          ? 'bg-amber-950/60 border border-amber-800 text-amber-300 hover:bg-amber-900 text-xs'
                          : 'bg-slate-900 border border-slate-800 text-white hover:bg-slate-800'
                      }`}
                    >
                      {btn === 'BACK' ? '⌫' : btn}
                    </button>
                  ))}
                </div>

                {/* GIANT REAL-TIME CHANGE RETURN ENGINE */}
                {numericCashReceived > 0 && (
                  <div className="pt-2">
                    {changeDue > 0 ? (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-90">
                            Cashier Return to Customer:
                          </span>
                          <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                            Cash Change
                          </span>
                        </div>
                        <div className="text-3xl font-black font-mono tracking-tight">
                          ₹{changeDue.toFixed(2)}
                        </div>

                        {/* Smart Indian Notes Recommendation */}
                        {returnNotes.length > 0 && (
                          <div className="pt-2 border-t border-white/20 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[10px] opacity-90 font-bold">Give Notes:</span>
                            {returnNotes.map((note, nIdx) => (
                              <span key={nIdx} className="px-2 py-0.5 rounded-md bg-white/20 font-mono font-black text-[11px]">
                                {note.count} × {note.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : remainingDue > 0 ? (
                      <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-center text-xs font-bold">
                        Shortage / Due from Customer: ₹{remainingDue.toFixed(2)}
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-center text-xs font-bold">
                        ✓ Exact Cash Received
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. DYNAMIC NPCI UPI QR CONSOLE */}
            {paymentMode === 'UPI' && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3 animate-in fade-in duration-150">
                <div className="inline-block p-3 rounded-2xl bg-white shadow-md">
                  <QrCodeCanvas value={currentUpiUri} size={150} />
                </div>
                <div>
                  <div className="text-xs font-black text-white">Dynamic NPCI UPI QR</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">PhonePe • GPay • Paytm • BHIM • Cred</div>
                  <div className="mt-2 text-xs font-mono text-indigo-400 bg-slate-950 p-2 rounded-xl border border-slate-800 break-all">
                    {business.upiId}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTriggerSoundbox}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      soundboxPlayed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>{soundboxPlayed ? "Announced!" : "Test Voice Chime"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center space-x-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. CARD / EDC CONSOLE */}
            {paymentMode === 'CARD' && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in duration-150 text-xs">
                <div className="font-bold text-slate-300">Swipe or Dip Card on EDC POS Machine</div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Terminal Auth / Approval Code
                  </label>
                  <input
                    type="text"
                    value={cardRef}
                    onChange={(e) => setCardRef(e.target.value)}
                    placeholder="e.g. AUTH-84920"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Card Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    placeholder="4242"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* 4. SPLIT TENDER CONSOLE */}
            {paymentMode === 'SPLIT' && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in duration-150 text-xs">
                <div className="font-bold text-slate-300">Split Payment (Cash + Online UPI/Card)</div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Cash Tender Portion (₹)
                  </label>
                  <input
                    type="number"
                    value={splitCashInput}
                    onChange={(e) => setSplitCashInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between font-mono font-bold">
                  <span className="text-slate-400">Remaining to Pay Online:</span>
                  <span className="text-indigo-400">₹{splitOnlineRemaining.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* 5. KHATA / CREDIT CONSOLE */}
            {paymentMode === 'CREDIT' && (
              <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800 text-amber-200 text-xs space-y-2 animate-in fade-in duration-150">
                <div className="font-black text-sm text-amber-300">Customer Khata / Credit (Udhar)</div>
                <p>
                  This bill will be marked as <strong>UNPAID</strong> and added to {customerName || "Customer"}&apos;s credit ledger.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-700/50 font-mono font-bold text-white flex justify-between">
                  <span>Balance Due:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM ACTIONS: COMPLETE SALE & WHATSAPP */}
          <div className="pt-4 border-t border-slate-800 space-y-2 shrink-0">
            <button
              type="button"
              onClick={handleCreateBill}
              disabled={isSubmitting || totalTaxable === 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-base font-black shadow-xl shadow-emerald-900/30 transition flex items-center justify-center space-x-2 disabled:bg-slate-800 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed cursor-pointer active:scale-98"
            >
              {isSubmitting ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-white" />
              )}
              <span>
                {isSubmitting ? "Recording Transaction..." : `⚡ Complete Sale & Print (Enter) • ₹${grandTotal.toFixed(2)}`}
              </span>
            </button>

            {customerPhone && (
              <a
                href={`https://wa.me/91${customerPhone}?text=${encodeURIComponent(
                  `Hello ${customerName}, your invoice total is ₹${grandTotal.toFixed(2)}. Pay directly via UPI: ${currentUpiUri}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold text-center flex items-center justify-center space-x-1.5 transition"
              >
                <Share2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Send WhatsApp Receipt to {customerPhone}</span>
              </a>
            )}
          </div>

        </main>
      </div>

      {/* 3. MODALS (Parked Carts, Batches, Thermal Roll Receipt) */}

      {/* Held Bills / Parked Carts Modal (F8) */}
      {showHeldModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Parked / Held Carts ({heldBills.length})</h3>
                  <p className="text-[11px] text-slate-400">Click any cart to resume billing for that customer</p>
                </div>
              </div>
              <button onClick={() => setShowHeldModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {heldBills.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <PauseCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No carts are currently on hold.</p>
                </div>
              ) : (
                heldBills.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => handleRecallBill(bill)}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-amber-400 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{bill.customerName} ({bill.heldAt})</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{bill.items.length} Products</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="font-mono font-black text-sm text-white">₹{bill.total.toFixed(2)}</div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHeldBill(bill.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => setShowHeldModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEFO Batch Picker Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <h3 className="font-bold text-sm">Select Active Batch (FEFO Recommended)</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
              {availableBatches.map((b, bIdx) => (
                <div
                  key={b.id}
                  onClick={() => handlePickBatch(b)}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-indigo-500 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-xs text-indigo-400">Batch: {b.batchNumber}</span>
                    <div className="text-[11px] text-slate-400 mt-1">Stock: {Number(b.currentStock)} PCS</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-sm text-emerald-400">₹{Number(b.sellingPrice).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">MRP: ₹{Number(b.mrp).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
