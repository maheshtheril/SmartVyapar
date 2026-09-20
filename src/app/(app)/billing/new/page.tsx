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
  discountPercent?: number;
  gst: number;
  batchId?: string;
  batchNumber?: string;
  batchExpiry?: string;
  batchMrp?: number;
}

export interface PaymentItem {
  method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  amount: number;
  reference?: string;
}

interface HeldBill {
  id: string;
  heldAt: string;
  customerName: string;
  customerPhone: string;
  customerState: string;
  items: BillItem[];
  total: number;
  billDiscountType?: 'PERCENT' | 'FLAT';
  billDiscountValue?: number;
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

  // Cash & Multi-Tender Split States
  const [cashReceived, setCashReceived] = useState<string>("");
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitUpi, setSplitUpi] = useState<string>("");
  const [splitCard, setSplitCard] = useState<string>("");
  const [splitCredit, setSplitCredit] = useState<string>("");
  const [showSplitUpiQr, setShowSplitUpiQr] = useState<boolean>(false);
  const [cardRef, setCardRef] = useState<string>("");
  const [cardLast4, setCardLast4] = useState<string>("");
  const [soundboxPlayed, setSoundboxPlayed] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Financial Payment Settlement Terminal Modal States (SAAS_ERP Standard)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [activePaymentAmount, setActivePaymentAmount] = useState<string>("");
  const [changeDueState, setChangeDueState] = useState<number | null>(null);
  const [invoiceNote, setInvoiceNote] = useState<string>("");
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  // Bill-Level Discount States
  const [billDiscountType, setBillDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);

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
        const parsed = JSON.parse(savedHeld);
        if (Array.isArray(parsed)) {
          setHeldBills(parsed);
        }
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

  // Multi-Item Row Calculations with Line & Bill Discounts
  const isIntraState = customerState === business.stateCode;
  let grossSubtotal = 0;
  let totalLineDiscount = 0;

  billItems.forEach((item) => {
    if (item.productId && item.price > 0) {
      const lineBase = item.price * item.quantity;
      const lineDisc = (lineBase * Math.min(100, Math.max(0, item.discountPercent || 0))) / 100;
      totalLineDiscount += lineDisc;
      grossSubtotal += (lineBase - lineDisc);
    }
  });

  // Bill-Level Discount (Coupon / Flat Promo)
  let billDiscountAmount = 0;
  if (grossSubtotal > 0 && billDiscountValue > 0) {
    if (billDiscountType === 'PERCENT') {
      billDiscountAmount = (grossSubtotal * Math.min(100, billDiscountValue)) / 100;
    } else {
      billDiscountAmount = Math.min(grossSubtotal, billDiscountValue);
    }
  }

  const totalDiscount = totalLineDiscount + billDiscountAmount;
  const netTaxable = Math.max(0, grossSubtotal - billDiscountAmount);

  // Apportion net taxable across items proportionally to compute exact GST rates per slab
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const discountRatio = grossSubtotal > 0 ? netTaxable / grossSubtotal : 1;

  billItems.forEach((item) => {
    if (item.productId && item.price > 0) {
      const lineBase = item.price * item.quantity;
      const lineDisc = (lineBase * Math.min(100, Math.max(0, item.discountPercent || 0))) / 100;
      const itemTaxable = (lineBase - lineDisc) * discountRatio;
      const itemTax = (itemTaxable * item.gst) / 100;
      if (isIntraState) {
        totalCgst += itemTax / 2;
        totalSgst += itemTax / 2;
      } else {
        totalIgst += itemTax;
      }
    }
  });

  const totalTaxable = netTaxable;
  const grandTotal = netTaxable + (isIntraState ? totalCgst + totalSgst : totalIgst);
  const currentUpiUri = `upi://pay?pa=${encodeURIComponent(business.upiId || "zionabusiness@icici")}&pn=${encodeURIComponent(business.name)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=Invoice%20for%20${encodeURIComponent(customerName || "Customer")}`;

  // Cash Change Return Calculations
  const numericCashReceived = Number(cashReceived) || 0;
  const changeDue = Math.max(0, numericCashReceived - grandTotal);
  const remainingDue = Math.max(0, grandTotal - numericCashReceived);
  const returnNotes = getIndianDenominations(changeDue);

  // Split Multi-Tender calculations
  const numSplitCash = parseFloat(splitCash) || 0;
  const numSplitUpi = parseFloat(splitUpi) || 0;
  const numSplitCard = parseFloat(splitCard) || 0;
  const numSplitCredit = parseFloat(splitCredit) || 0;
  const totalSplitAllocated = Number((numSplitCash + numSplitUpi + numSplitCard + numSplitCredit).toFixed(2));
  const splitRemainingUnallocated = Math.max(0, Number((grandTotal - totalSplitAllocated).toFixed(2)));
  const isSplitBalanced = grandTotal > 0 && Math.abs(totalSplitAllocated - grandTotal) < 0.05;

  const splitUpiAmount = numSplitUpi > 0 ? numSplitUpi : (splitRemainingUnallocated > 0 ? splitRemainingUnallocated : grandTotal);
  const splitUpiUri = `upi://pay?pa=${encodeURIComponent(business.upiId || "zionabusiness@icici")}&pn=${encodeURIComponent(business.name)}&am=${splitUpiAmount.toFixed(2)}&cu=INR&tn=Invoice%20Split%20for%20${encodeURIComponent(customerName || "Customer")}`;

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

  // Auto-fill exact cash when switching to Cash or preset when switching to Split
  useEffect(() => {
    if (paymentMode === 'CASH' && grandTotal > 0 && !cashReceived) {
      setCashReceived(String(Math.ceil(grandTotal)));
    }
    if (paymentMode === 'SPLIT' && grandTotal > 0 && !splitCash && !splitUpi && !splitCard && !splitCredit) {
      const half = Math.floor(grandTotal / 2);
      setSplitCash(String(half));
      setSplitUpi(String(Number((grandTotal - half).toFixed(2))));
    }
  }, [paymentMode, grandTotal]);

  // Payment Stream Metrics (SAAS_ERP Architecture)
  const totalPaidStream = Number(payments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2));
  const streamBalanceDue = Number(Math.max(0, grandTotal - totalPaidStream).toFixed(2));
  const isStreamBalanced = grandTotal > 0 && Math.abs(totalPaidStream - grandTotal) < 0.05;
  const isStreamDeficit = totalPaidStream < grandTotal;
  const isStreamSurplus = totalPaidStream > grandTotal;

  // Auto-snap active payment amount when Payment Terminal opens
  useEffect(() => {
    if (isPaymentModalOpen) {
      if (payments.length === 0) {
        setActivePaymentAmount(grandTotal.toFixed(2));
      }
      setTimeout(() => amountInputRef.current?.focus(), 150);
    }
  }, [isPaymentModalOpen, grandTotal, payments.length]);

  // Handler to add payment to stream
  const handleAddPaymentToStream = (method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT') => {
    const amt = parseFloat(activePaymentAmount) || 0;
    if (amt <= 0) {
      alert("Please enter an amount before choosing a payment method.");
      return;
    }

    const currentPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, grandTotal - currentPaid);
    let finalAmt = amt;

    if (method === 'CASH' && amt > remaining) {
      setChangeDueState(Number((amt - remaining).toFixed(2)));
      finalAmt = remaining;
    }

    setPayments((prev) => {
      const existingIdx = prev.findIndex((p) => p.method === method);
      let updated = [...prev];
      if (existingIdx !== -1) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          amount: Number((updated[existingIdx].amount + finalAmt).toFixed(2)),
        };
      } else {
        updated.push({
          method,
          amount: finalAmt,
          reference: method === 'CARD' ? (cardRef || undefined) : undefined,
        });
      }
      const newTotal = updated.reduce((sum, p) => sum + p.amount, 0);
      const newRemaining = Math.max(0, grandTotal - newTotal);
      setTimeout(() => setActivePaymentAmount(newRemaining > 0 ? newRemaining.toFixed(2) : ''), 0);
      return updated;
    });
  };

  // Handler to give change and tally
  const handleGiveChangeAndTally = () => {
    let amountToReduce = Number((totalPaidStream - grandTotal).toFixed(2));
    setPayments((prev) => {
      let updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].method === 'CASH' && amountToReduce > 0) {
          if (updated[i].amount > amountToReduce) {
            updated[i].amount = Number((updated[i].amount - amountToReduce).toFixed(2));
            amountToReduce = 0;
          } else {
            amountToReduce = Number((amountToReduce - updated[i].amount).toFixed(2));
            updated[i].amount = 0;
          }
        }
      }
      return updated.filter((p) => p.amount > 0);
    });
    setChangeDueState(null);
  };

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
        const searchInput = document.querySelector('input[placeholder*="Search product"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleAddItem();
      } else if (e.key === 'F3' || e.key === 'F4' || e.key === 'F5' || e.key === 'F6') {
        e.preventDefault();
        setIsPaymentModalOpen(true);
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
        if (isPaymentModalOpen) {
          if (isStreamBalanced || isStreamDeficit) {
            handleCreateBill();
          }
        } else if (totalTaxable > 0 && !isSubmitting) {
          setIsPaymentModalOpen(true);
        }
      } else if (e.key === 'Escape') {
        if (changeDueState !== null) {
          e.preventDefault();
          setChangeDueState(null);
          return;
        }
        if (isPaymentModalOpen) {
          e.preventDefault();
          setIsPaymentModalOpen(false);
          return;
        }
        // Exit to dashboard
        if (!showHeldModal && !showBatchModal && !showReceiptModal) {
          router.push('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [billItems, customerName, customerPhone, customerState, grandTotal, totalTaxable, isSubmitting, heldBills, paymentMode, cashReceived, splitCash, splitUpi, splitCard, splitCredit, isPaymentModalOpen, changeDueState, payments, activePaymentAmount, isStreamBalanced, isStreamDeficit, showHeldModal, showBatchModal, showReceiptModal]);

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

  const handleDiscountChange = (index: number, disc: number) => {
    const updated = [...billItems];
    updated[index].discountPercent = Math.max(0, Math.min(100, disc));
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
      billDiscountType,
      billDiscountValue,
    };

    const updated = [newHeld, ...heldBills];
    saveHeldBillsToStorage(updated);

    // Reset current active bill
    setCustomerName("");
    setCustomerPhone("");
    setCashReceived("");
    setBillDiscountValue(0);
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
    setBillDiscountType(heldBill.billDiscountType || 'PERCENT');
    setBillDiscountValue(heldBill.billDiscountValue || 0);

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
    setSplitCash("");
    setSplitUpi("");
    setSplitCard("");
    setSplitCredit("");
    setShowSplitUpiQr(false);
    setIsPaymentModalOpen(false);
    setPayments([]);
    setActivePaymentAmount("");
    setChangeDueState(null);
    setInvoiceNote("");
    setCardRef("");
    setCardLast4("");
    setBillDiscountType('PERCENT');
    setBillDiscountValue(0);
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

    const finalPayments = payments.filter((p) => p.amount > 0);
    const isStreamActive = finalPayments.length > 0;
    const isSplitMode = isStreamActive ? finalPayments.length > 1 : paymentMode === "SPLIT";
    let computedPaid = 0;
    let computedDue = 0;
    let paymentNotes: string | undefined = undefined;

    if (isStreamActive) {
      computedPaid = Number(
        finalPayments
          .filter((p) => p.method !== 'CREDIT')
          .reduce((sum, p) => sum + p.amount, 0)
          .toFixed(2)
      );
      computedDue = Number(
        (
          finalPayments
            .filter((p) => p.method === 'CREDIT')
            .reduce((sum, p) => sum + p.amount, 0) + Math.max(0, grandTotal - totalPaidStream)
        ).toFixed(2)
      );

      const parts = finalPayments.map((p) => `${p.method} ₹${p.amount.toFixed(2)}`);
      paymentNotes = `Payment Stream: ${parts.join(' + ')}${invoiceNote ? ` | ${invoiceNote}` : ''}`;
    } else if (isSplitMode) {
      computedPaid = Number((numSplitCash + numSplitUpi + numSplitCard).toFixed(2));
      computedDue = Number((numSplitCredit + Math.max(0, grandTotal - totalSplitAllocated)).toFixed(2));

      const splitParts: string[] = [];
      if (numSplitCash > 0) splitParts.push(`Cash ₹${numSplitCash.toFixed(2)}`);
      if (numSplitUpi > 0) splitParts.push(`UPI ₹${numSplitUpi.toFixed(2)}`);
      if (numSplitCard > 0) splitParts.push(`Card ₹${numSplitCard.toFixed(2)}`);
      if (numSplitCredit > 0) splitParts.push(`Khata ₹${numSplitCredit.toFixed(2)}`);
      paymentNotes = `Multi-Tender: ${splitParts.length > 0 ? splitParts.join(' + ') : 'Split'}`;
    } else {
      computedPaid = paymentStatus === "PAID" 
        ? grandTotal 
        : (paymentMode === "CASH" && numericCashReceived > 0 ? Math.min(grandTotal, numericCashReceived) : 0);
      computedDue = Math.max(0, grandTotal - computedPaid);
    }

    if (cardRef || cardLast4) {
      const cardInfo = `Card Ref: ${cardRef || 'N/A'}${cardLast4 ? ` (Last 4: ${cardLast4})` : ''}`;
      paymentNotes = paymentNotes ? `${paymentNotes} | ${cardInfo}` : cardInfo;
    }
    if (totalDiscount > 0) {
      const discNote = `Discount: ₹${totalDiscount.toFixed(2)}${billDiscountValue > 0 ? ` (${billDiscountValue}${billDiscountType === 'PERCENT' ? '%' : '₹'} Bill Disc)` : ''}`;
      paymentNotes = paymentNotes ? `${paymentNotes} | ${discNote}` : discNote;
    }

    const invoicePayload = {
      customerName: customerName || "Walk-in Cash Customer",
      customerPhone: customerPhone || "9999999999",
      customerStateCode: customerState,
      paymentStatus: (isStreamActive || isSplitMode) ? (computedDue > 0 ? "PARTIAL" : "PAID") : paymentStatus,
      paymentMode: (isStreamActive || isSplitMode) ? "CASH" : paymentMode,
      paidAmount: computedPaid,
      notes: paymentNotes,
      items: validItems.map((i) => {
        const lineBase = i.price * i.quantity;
        const lineDisc = (lineBase * Math.min(100, Math.max(0, i.discountPercent || 0))) / 100;
        const effectiveLineTaxable = (lineBase - lineDisc) * discountRatio;
        const effectiveUnitPrice = Number((effectiveLineTaxable / i.quantity).toFixed(2));
        return {
          productId: i.productId,
          quantity: i.quantity,
          price: effectiveUnitPrice,
          batchId: i.batchId,
          batchNumber: i.batchNumber,
        };
      }),
    };

    // Calculate savings from catalog / batch MRP plus all discounts
    let totalSavings = totalDiscount;
    const receiptItems = validItems.map((item) => {
      const catItem = catalog.find((c) => c.id === item.productId);
      const itemMrp = item.batchMrp || (catItem && catItem.sellingPrice ? Math.max(item.price, Number(catItem.sellingPrice) * 1.15) : item.price);
      if (itemMrp > item.price) {
        totalSavings += (itemMrp - item.price) * item.quantity;
      }
      const lineBase = item.price * item.quantity;
      const lineDisc = (lineBase * Math.min(100, Math.max(0, item.discountPercent || 0))) / 100;
      const effectiveLineTaxable = (lineBase - lineDisc) * discountRatio;
      const effectiveUnitPrice = Number((effectiveLineTaxable / item.quantity).toFixed(2));

      return {
        name: item.batchNumber ? `${item.name} [${item.batchNumber}]` : item.name,
        hsn: item.hsn,
        quantity: item.quantity,
        unit: item.unitSold || "PCS",
        price: effectiveUnitPrice,
        mrp: itemMrp,
        gstRate: item.gst,
        total: Number(effectiveLineTaxable.toFixed(2)),
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
        subTotal: Number(grossSubtotal),
        taxableAmount: Number(totalTaxable),
        discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
        cgstAmount: Number(isIntraState ? totalCgst : 0),
        sgstAmount: Number(isIntraState ? totalSgst : 0),
        igstAmount: Number(!isIntraState ? totalIgst : 0),
        totalAmount: Number(grandTotal),
        paidAmount: Number(computedPaid),
        dueAmount: Number(computedDue),
        paymentMode: isSplitMode ? "SPLIT (Multi-Tender)" : paymentMode,
        cashReceived: isSplitMode ? (numSplitCash > 0 ? numSplitCash : undefined) : (numericCashReceived > 0 ? numericCashReceived : undefined),
        changeReturned: changeDue > 0 ? changeDue : undefined,
        totalSavings: totalSavings > 0 ? totalSavings : undefined,
        upiUri: currentUpiUri,
        notes: paymentNotes,
      });

      setShowReceiptModal(true);
      setIsPaymentModalOpen(false);
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
        subTotal: Number(data.invoice.subTotal || grossSubtotal),
        taxableAmount: Number(totalTaxable),
        discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
        cgstAmount: Number(data.invoice.cgstAmount || (isIntraState ? totalCgst : 0)),
        sgstAmount: Number(data.invoice.sgstAmount || (isIntraState ? totalSgst : 0)),
        igstAmount: Number(data.invoice.igstAmount || (!isIntraState ? totalIgst : 0)),
        totalAmount: Number(data.invoice.totalAmount || grandTotal),
        paidAmount: Number(data.invoice.paidAmount),
        dueAmount: Number(data.invoice.dueAmount),
        paymentMode: isSplitMode ? "SPLIT (Multi-Tender)" : paymentMode,
        cashReceived: isSplitMode ? (numSplitCash > 0 ? numSplitCash : undefined) : (numericCashReceived > 0 ? numericCashReceived : undefined),
        changeReturned: changeDue > 0 ? changeDue : undefined,
        totalSavings: totalSavings > 0 ? totalSavings : undefined,
        upiUri: data.invoice.upiUri || currentUpiUri,
        notes: paymentNotes,
      });

      setShowReceiptModal(true);
      setIsPaymentModalOpen(false);
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
            paymentMode: isSplitMode ? "SPLIT (Multi-Tender)" : paymentMode,
            cashReceived: isSplitMode ? (numSplitCash > 0 ? numSplitCash : undefined) : (numericCashReceived > 0 ? numericCashReceived : undefined),
            changeReturned: changeDue > 0 ? changeDue : undefined,
            totalSavings: totalSavings > 0 ? totalSavings : undefined,
            upiUri: currentUpiUri,
            notes: paymentNotes,
          });
          setShowReceiptModal(true);
          setIsPaymentModalOpen(false);
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
    // FULL-SCREEN POS TERMINAL POPUP: Clean, modern light theme matching all software forms
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-slate-100 text-slate-900 flex flex-col overflow-hidden font-sans select-none animate-in fade-in duration-150">
      
      {/* 1. TOP POS TERMINAL HEADER */}
      <header className="h-14 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
        {/* Left: Brand, Store Name & Counter */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                {business.name}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                POS Terminal v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Counter 1 • GSTIN: {business.gstin || "Unregistered"} • Place of Supply: State {customerState}
            </p>
          </div>
        </div>

        {/* Middle: Keyboard Hotkeys Guide */}
        <div className="hidden xl:flex items-center space-x-2 text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
          <span className="text-slate-400 font-sans font-bold">Hotkeys:</span>
          <span><kbd className="bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold shadow-xs">F5 / Enter</kbd> Settle</span>
          <span><kbd className="bg-white border border-slate-300 text-slate-700 px-1 py-0.5 rounded font-bold">F2</kbd> +Line</span>
          <span><kbd className="bg-white border border-slate-300 text-slate-700 px-1 py-0.5 rounded font-bold">F7</kbd> Hold</span>
          <span><kbd className="bg-white border border-slate-300 text-slate-700 px-1 py-0.5 rounded font-bold">F8</kbd> Carts</span>
          <span><kbd className="bg-white border border-slate-300 text-slate-700 px-1 py-0.5 rounded font-bold">F9</kbd> New</span>
          <span><kbd className="bg-white border border-slate-300 text-slate-700 px-1 py-0.5 rounded font-bold">Esc</kbd> Exit</span>
        </div>

        {/* Right: Actions, Fullscreen Toggle, and Exit POS */}
        <div className="flex items-center space-x-2 shrink-0">
          <OfflineStatusPill />

          {/* Hold Current Cart */}
          <button
            type="button"
            onClick={handleHoldBill}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1 shadow-xs"
            title="Park current cart to serve next customer (F7)"
          >
            <PauseCircle className="h-4 w-4 text-amber-500" />
            <span className="hidden md:inline">Hold</span>
            <span className="text-[9px] font-mono opacity-60">F7</span>
          </button>

          {/* Recall Held Carts */}
          <button
            type="button"
            onClick={() => setShowHeldModal(true)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs ${
              heldBills.length > 0
                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
            title="Recall parked carts (F8)"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden md:inline">Carts</span>
            <span className="rounded-full bg-slate-100 px-1 text-[10px] font-mono">{heldBills.length}</span>
          </button>

          {/* Fullscreen Hardware POS Mode */}
          <button
            type="button"
            onClick={toggleFullScreenPOS}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition shadow-xs"
            title="Toggle Fullscreen Browser Mode (F11)"
          >
            {isFullScreenPOS ? <Minimize2 className="h-4 w-4 text-indigo-600" /> : <Maximize2 className="h-4 w-4 text-indigo-600" />}
          </button>

          {/* Exit POS / Back to Dashboard */}
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition flex items-center space-x-1 shadow-xs"
            title="Exit POS Terminal to Dashboard (Esc)"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit POS</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY: 2-COLUMN FULLSCREEN SPLIT TERMINAL */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANEL: CART, ITEMS & CUSTOMER SELECTOR (58% on Desktop) */}
        <section className="w-full lg:w-[58%] border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col p-4 sm:p-5 overflow-hidden">
          
          {/* Customer Bar */}
          <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs shrink-0">
            <CustomerSearch
              customerName={customerName}
              customerPhone={customerPhone}
              onSelectCustomer={handleSelectCustomer}
              onNameChange={setCustomerName}
              onPhoneChange={setCustomerPhone}
              isDark={false}
            />
          </div>

          {/* Barcode & Product Quick Search */}
          <div className="mb-3 shrink-0">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Barcode Scanner / Fast Product Lookup
            </label>
            <ProductSearchCombobox
              products={catalog}
              selectedProductId=""
              onSelect={(product) => {
                if (!product) return;
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
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 rounded-xl bg-slate-50/50 p-2 border border-slate-200">
            <div className="flex items-center justify-between px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 rounded-lg">
              <span>Cart Items ({billItems.filter(i => i.productId && i.price > 0).length})</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Row (F2)</span>
              </button>
            </div>

            {billItems.map((item, idx) => {
              return (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    item.productId ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300' : 'bg-slate-50 border-dashed border-slate-200'
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
                        <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 font-mono font-bold text-indigo-700">
                          Batch: {item.batchNumber}
                        </span>
                        {item.batchExpiry && (
                          <span className="text-slate-500">
                            Exp: {new Date(item.batchExpiry).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                          </span>
                        )}
                        {item.batchMrp && (
                          <span className="text-slate-500">
                            MRP: ₹{item.batchMrp}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, Math.max(1, item.quantity - 1))}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200 text-xs shadow-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                      className="w-10 text-center text-xs font-bold font-mono bg-transparent text-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200 text-xs shadow-xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Price */}
                  <div className="w-20 shrink-0">
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                      className="w-full h-8 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono font-bold text-xs text-right px-2 focus:border-indigo-500 focus:outline-none"
                      placeholder="₹ Price"
                    />
                    <span className="block text-[8px] text-slate-400 text-right mt-0.5 font-mono">
                      +{item.gst}% GST
                    </span>
                  </div>

                  {/* Line Discount % */}
                  <div className="w-14 shrink-0">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent || ''}
                        onChange={(e) => handleDiscountChange(idx, Number(e.target.value))}
                        className="w-full h-8 rounded-lg bg-white border border-slate-200 text-rose-600 font-mono font-bold text-xs text-right pr-4 pl-1 focus:border-rose-500 focus:outline-none placeholder:text-slate-400"
                        placeholder="0"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold pointer-events-none">
                        %
                      </span>
                    </div>
                    <span className="block text-[8px] text-slate-400 text-right mt-0.5 uppercase font-bold">
                      Disc
                    </span>
                  </div>

                  {/* Line Total */}
                  <div className="w-20 text-right shrink-0">
                    <div className="font-mono font-bold text-xs text-slate-900">
                      ₹{((item.price * item.quantity) * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}
                    </div>
                    {(item.discountPercent || 0) > 0 && (
                      <span className="text-[9px] text-rose-600 font-bold block">
                        -{item.discountPercent}% off
                      </span>
                    )}
                  </div>

                  {/* Trash */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                    title="Remove item row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bill-Level Promo & Discount Controller */}
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Bill Discount:</span>
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setBillDiscountType('PERCENT')}
                  className={`px-2 py-0.5 rounded transition ${billDiscountType === 'PERCENT' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setBillDiscountType('FLAT')}
                  className={`px-2 py-0.5 rounded transition ${billDiscountType === 'FLAT' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Flat
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={billDiscountValue || ''}
                onChange={(e) => setBillDiscountValue(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-16 h-7 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono font-bold text-xs px-2 text-right focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center space-x-1">
              {[
                { label: '5%', type: 'PERCENT', val: 5 },
                { label: '10%', type: 'PERCENT', val: 10 },
                { label: '₹50', type: 'FLAT', val: 50 },
                { label: '₹100', type: 'FLAT', val: 100 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => {
                    setBillDiscountType(btn.type as any);
                    setBillDiscountValue(btn.val);
                  }}
                  className={`px-2 py-1 rounded-lg border font-bold text-[10px] transition ${
                    billDiscountType === btn.type && billDiscountValue === btn.val
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
              {billDiscountValue > 0 && (
                <button
                  type="button"
                  onClick={() => setBillDiscountValue(0)}
                  className="text-rose-600 hover:underline text-[10px] font-bold ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </section>

        {/* RIGHT PANEL: SINGLE, UNIFIED ORDER SUMMARY & SETTLEMENT CONSOLE (42% on Desktop) */}
        <main className="w-full lg:w-[42%] flex flex-col bg-slate-50/80 p-4 sm:p-5 justify-between overflow-y-auto min-h-0 border-t lg:border-t-0">
          
          <div className="space-y-4">
            
            {/* SINGLE DEFINITIVE ORDER FINANCIAL BREAKDOWN CARD */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Order Financial Breakdown
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {isIntraState ? 'Intra-State GST (CGST + SGST)' : 'Inter-State GST (IGST)'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {billItems.filter(i => i.productId && i.price > 0).length} Items
                </span>
              </div>

              {/* Clean Financial Rows */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Gross Items Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-800">₹{grossSubtotal.toFixed(2)}</span>
                </div>

                {totalLineDiscount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-medium">
                    <span>Line Items Discount:</span>
                    <span className="font-mono font-bold">-₹{totalLineDiscount.toFixed(2)}</span>
                  </div>
                )}

                {billDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-medium">
                    <span>Cart Bill Discount ({billDiscountValue}{billDiscountType === 'PERCENT' ? '%' : '₹'}):</span>
                    <span className="font-mono font-bold">-₹{billDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-medium text-slate-700">
                  <span>Net Taxable Amount:</span>
                  <span className="font-mono font-bold text-slate-900">₹{totalTaxable.toFixed(2)}</span>
                </div>

                {isIntraState ? (
                  <>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Central GST (CGST):</span>
                      <span className="font-mono text-slate-700">₹{totalCgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>State GST (SGST):</span>
                      <span className="font-mono text-slate-700">₹{totalSgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Integrated GST (IGST):</span>
                    <span className="font-mono text-slate-700">₹{totalIgst.toFixed(2)}</span>
                  </div>
                )}

                {Math.abs(grandTotal - (totalTaxable + (isIntraState ? totalCgst + totalSgst : totalIgst))) > 0.001 && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Round-off Adjustment:</span>
                    <span className="font-mono text-slate-700">
                      ₹{(grandTotal - (totalTaxable + (isIntraState ? totalCgst + totalSgst : totalIgst))).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* SINGLE HERO NET PAYABLE ROW */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      Net Amount Payable
                    </span>
                    {totalDiscount > 0 && (
                      <span className="text-[11px] font-bold text-emerald-600">
                        Total Saved: ₹{totalDiscount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                    ₹{grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* CUSTOMER PROFILE & CONTEXT CARD */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer & Billing State
                </span>
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                  <span>{customerName || "Walk-in Cash Customer"}</span>
                  {customerPhone && (
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px]">
                      📱 {customerPhone}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  State Code: {customerState} • {business.gstin ? `GSTIN: ${business.gstin}` : 'Unregistered Dealer'}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono block">
                  Counter 1
                </span>
              </div>
            </div>

          </div>

          {/* BOTTOM ACTIONS: SINGLE PRIMARY COLLECT PAYMENT BUTTON */}
          <div className="pt-4 border-t border-slate-200 space-y-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={isSubmitting || totalTaxable === 0}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-2.5 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer active:scale-98"
            >
              <CreditCard className="h-5 w-5 text-white" />
              <span>
                {isSubmitting ? "Processing..." : `⚡ COLLECT PAYMENT & SETTLE [F5] • ₹${grandTotal.toFixed(2)}`}
              </span>
            </button>

            {customerPhone && (
              <a
                href={`https://wa.me/91${customerPhone}?text=${encodeURIComponent(
                  `Hello ${customerName}, your invoice total is ₹${grandTotal.toFixed(2)}. Pay directly via UPI: ${currentUpiUri}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 text-xs font-bold text-center flex items-center justify-center space-x-1.5 transition"
              >
                <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Send WhatsApp Receipt to {customerPhone}</span>
              </a>
            )}
          </div>

        </main>
      </div>

      {/* 3. MODALS (Parked Carts, Batches, Thermal Roll Receipt) */}

      {/* Held Bills / Parked Carts Modal (F8) */}
      {showHeldModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Parked / Held Carts ({heldBills.length})</h3>
                  <p className="text-[11px] text-slate-500">Click any cart to resume billing for that customer</p>
                </div>
              </div>
              <button onClick={() => setShowHeldModal(false)} className="text-slate-400 hover:text-slate-700">
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
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 hover:border-amber-400 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{bill.customerName} ({bill.heldAt})</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{(bill.items || []).length} Products</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="font-mono font-bold text-sm text-slate-900">₹{(Number(bill.total) || 0).toFixed(2)}</div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHeldBill(bill.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowHeldModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEFO Batch Picker Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Select Active Batch (FEFO Recommended)</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
              {availableBatches.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handlePickBatch(b)}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-400 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-xs text-indigo-700">Batch: {b.batchNumber}</span>
                    <div className="text-[11px] text-slate-500 mt-1">Stock: {Number(b.currentStock)} PCS</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-emerald-700">₹{Number(b.sellingPrice).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">MRP: ₹{Number(b.mrp).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FINANCIAL PAYMENT SETTLEMENT TERMINAL (SAAS_ERP POPUP)   */}
      {/* ======================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl rounded-3xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span>Financial Payment Settlement Terminal</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                      Multi-Tender Stream
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Customer: <strong className="text-slate-800">{customerName || "Walk-in Customer"}</strong>
                    {customerPhone && <span className="font-mono ml-2 text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">📱 {customerPhone}</span>}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
              {/* COLUMN 1: Financial Audit Node (Left - 5 Cols) */}
              <div className="md:col-span-5 bg-slate-50 p-6 border-r border-slate-200 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Financial Audit Node
                  </div>

                  {/* Gross Bill Total */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-bold uppercase tracking-wider">Gross Bill Total:</span>
                    <span className={`font-mono font-bold ${totalDiscount > 0 ? 'text-slate-400 line-through' : 'text-slate-900 text-sm'}`}>
                      ₹{grossSubtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Bill Discount Row */}
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                        Discount Applied
                      </span>
                      <span className="text-[10px] text-rose-500 font-medium">
                        {billDiscountValue > 0 ? `${billDiscountValue}${billDiscountType === 'PERCENT' ? '%' : '₹'} Bill Discount` : 'No discount'}
                      </span>
                    </div>
                    <span className="text-sm font-mono font-bold text-rose-700">
                      -₹{totalDiscount.toFixed(2)}
                    </span>
                  </div>

                  {/* Giant Total Payable Card */}
                  <div className="p-5 rounded-2xl bg-indigo-600 text-white shadow-md space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 block">
                      Total Net Payable
                    </span>
                    <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
                      ₹{grandTotal.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-indigo-100/90 pt-1 border-t border-white/20 flex justify-between font-mono">
                      <span>Taxable: ₹{totalTaxable.toFixed(2)}</span>
                      <span>GST: ₹{(isIntraState ? totalCgst + totalSgst : totalIgst).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Stream List */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Payment Stream ({payments.length})
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-700">
                        Allocated: ₹{totalPaidStream.toFixed(2)}
                      </span>
                    </div>

                    {payments.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-white text-center text-slate-400 text-xs">
                        No payments added yet. Enter an amount on the right and select a payment method.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {payments.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="p-1.5 rounded-lg bg-slate-100">
                                {p.method === 'CASH' && <Banknote className="h-3.5 w-3.5 text-emerald-600" />}
                                {p.method === 'UPI' && <QrCode className="h-3.5 w-3.5 text-indigo-600" />}
                                {p.method === 'CARD' && <CreditCard className="h-3.5 w-3.5 text-blue-600" />}
                                {p.method === 'CREDIT' && <BookOpen className="h-3.5 w-3.5 text-amber-600" />}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{p.method}</span>
                                {p.reference && <span className="text-[9px] text-slate-500 font-mono">{p.reference}</span>}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2.5">
                              <span className="font-mono font-bold text-sm text-slate-900">₹{p.amount.toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPayments(payments.filter((_, i) => i !== idx));
                                  setActivePaymentAmount((prev) => ((parseFloat(prev) || 0) + p.amount).toFixed(2));
                                }}
                                className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tally Summary Box */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  {isStreamSurplus ? (
                    <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md space-y-2 animate-in zoom-in-95">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Change to Return</span>
                        <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full">Surplus</span>
                      </div>
                      <div className="text-3xl font-black font-mono">
                        ₹{(totalPaidStream - grandTotal).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={handleGiveChangeAndTally}
                        className="w-full py-2 rounded-xl bg-white text-emerald-800 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition shadow-xs active:scale-98 cursor-pointer"
                      >
                        Give Change & Tally Invoice
                      </button>
                    </div>
                  ) : isStreamBalanced ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>✓ 100% Balanced • Perfectly Tallied. Ready to finalize!</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                      Deficit: ₹{streamBalanceDue.toFixed(2)} remaining. Will be posted as Customer Credit / Khata if finalized now.
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 2: Payment Matrix & Tenders (Right - 7 Cols) */}
              <div className="md:col-span-7 bg-white p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Ledger Notes */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Transaction Remarks / Ledger Notes
                    </label>
                    <input
                      type="text"
                      value={invoiceNote}
                      onChange={(e) => setInvoiceNote(e.target.value)}
                      placeholder="e.g. Split cash + UPI, GPay reference, or cashier note..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Active Amount Input Box */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Payment Amount to Allocate
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-mono font-black text-slate-400">₹</span>
                      <input
                        ref={amountInputRef}
                        type="text"
                        value={activePaymentAmount}
                        onChange={(e) => setActivePaymentAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPaymentToStream('CASH');
                          }
                        }}
                        placeholder="0.00"
                        className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-50 border-2 border-indigo-500 text-slate-900 font-mono font-black text-2xl tracking-wide focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>

                    {/* Quick Denomination Chips */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setActivePaymentAmount(streamBalanceDue.toFixed(2))}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                      >
                        Exact Due (₹{streamBalanceDue.toFixed(2)})
                      </button>
                      {[50, 100, 500].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => setActivePaymentAmount(String((parseFloat(activePaymentAmount) || 0) + step))}
                          className="px-2 py-1 rounded-lg text-xs font-bold font-mono bg-white text-indigo-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          +{step}
                        </button>
                      ))}
                      {[500, 1000, 2000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setActivePaymentAmount(String(val))}
                          className="px-2 py-1 rounded-lg text-xs font-bold font-mono bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          ₹{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4 Method Selector Buttons */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Choose Tender Method for Active Amount
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddPaymentToStream('CASH')}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex flex-col items-center justify-center space-y-1 group active:scale-95 cursor-pointer shadow-xs"
                      >
                        <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700 group-hover:bg-emerald-200">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">CASH</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddPaymentToStream('UPI')}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition flex flex-col items-center justify-center space-y-1 group active:scale-95 cursor-pointer shadow-xs"
                      >
                        <div className="p-2 rounded-xl bg-indigo-100/80 text-indigo-700 group-hover:bg-indigo-200">
                          <QrCode className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">UPI / QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddPaymentToStream('CARD')}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition flex flex-col items-center justify-center space-y-1 group active:scale-95 cursor-pointer shadow-xs"
                      >
                        <div className="p-2 rounded-xl bg-blue-100/80 text-blue-700 group-hover:bg-blue-200">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">CARD / EDC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddPaymentToStream('CREDIT')}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition flex flex-col items-center justify-center space-y-1 group active:scale-95 cursor-pointer shadow-xs"
                      >
                        <div className="p-2 rounded-xl bg-amber-100/80 text-amber-700 group-hover:bg-amber-200">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">KHATA / DUE</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic UPI QR Code Drawer */}
                  {payments.some((p) => p.method === 'UPI') && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-indigo-200 flex items-center space-x-3 animate-in fade-in shadow-xs">
                      <div className="bg-white p-1 rounded-xl shadow-xs shrink-0 border border-slate-200">
                        <QrCodeCanvas
                          value={`upi://pay?pa=${encodeURIComponent(business.upiId || "zionabusiness@icici")}&pn=${encodeURIComponent(business.name)}&am=${(payments.find(p => p.method === 'UPI')?.amount || grandTotal).toFixed(2)}&cu=INR&tn=Invoice%20${encodeURIComponent(customerName || "Customer")}`}
                          size={70}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-xs font-bold text-indigo-900 flex items-center justify-between">
                          <span>Scan to Pay UPI Portion</span>
                          <span className="font-mono text-slate-900 font-bold">
                            ₹{(payments.find(p => p.method === 'UPI')?.amount || grandTotal).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {business.upiId || "zionabusiness@icici"}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(`upi://pay?pa=${encodeURIComponent(business.upiId || "zionabusiness@icici")}&pn=${encodeURIComponent(business.name)}&am=${(payments.find(p => p.method === 'UPI')?.amount || grandTotal).toFixed(2)}&cu=INR&tn=Invoice`);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            <span>{copiedLink ? "Copied UPI Link!" : "Copy Link"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => playSoundboxChime(String(payments.find(p => p.method === 'UPI')?.amount || grandTotal))}
                            className="text-[10px] font-bold text-amber-600 hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <Volume2 className="h-3 w-3" />
                            <span>Voice Chime</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition text-center cursor-pointer"
                  >
                    Cancel (Esc)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPayments([]);
                      setActivePaymentAmount(grandTotal.toFixed(2));
                      setInvoiceNote("");
                    }}
                    className="py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 bg-rose-50 border border-rose-200 transition text-center cursor-pointer"
                  >
                    Reset Stream
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateBill}
                    disabled={isSubmitting || totalTaxable === 0}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition flex items-center justify-center space-x-1.5 active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    )}
                    <span>
                      {isStreamDeficit ? "Post as Credit" : "Finalize (Enter)"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TENDERED CASH CHANGE RETURN MODAL (SAAS_ERP Standard)   */}
      {/* ======================================================== */}
      {changeDueState !== null && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white text-slate-900 shadow-2xl border border-slate-200 p-6 text-center space-y-4">
            <div className="flex items-center justify-center text-emerald-600">
              <Coins className="h-10 w-10 animate-bounce" />
            </div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-800">
              Cash Tendered • Hand Change Back
            </h4>
            <div className="p-6 rounded-2xl bg-emerald-600 text-white shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                Change to Return:
              </span>
              <div className="text-4xl font-black font-mono">
                ₹{changeDueState.toFixed(2)}
              </div>
            </div>

            {/* Indian Denomination Breakdown */}
            {getIndianDenominations(changeDueState).length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                  Recommended Notes to Return:
                </span>
                <div className="flex flex-wrap justify-center gap-1.5 font-mono font-bold">
                  {getIndianDenominations(changeDueState).map((denom, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {denom.count} × {denom.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Payment is tallied. Please hand the change to the customer.
            </p>

            <button
              type="button"
              onClick={() => setChangeDueState(null)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition cursor-pointer"
            >
              Got it, Change Handed Over
            </button>
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
