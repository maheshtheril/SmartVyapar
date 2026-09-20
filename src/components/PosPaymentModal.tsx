'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Banknote, 
  QrCode, 
  CreditCard, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  X, 
  Printer, 
  Sparkles, 
  Volume2, 
  RotateCcw, 
  Copy, 
  Share2, 
  ArrowRight, 
  AlertTriangle, 
  Coins, 
  Maximize2,
  Minimize2,
  Delete
} from 'lucide-react';
import QrCodeCanvas from './QrCodeCanvas';

export interface PosPaymentDetails {
  paymentMode: "CASH" | "UPI" | "CARD" | "SPLIT" | "CREDIT";
  paymentStatus: "PAID" | "UNPAID";
  cashReceived?: number;
  changeReturned?: number;
  cardRef?: string;
  cardLast4?: string;
  splitCash?: number;
  splitOnline?: number;
}

interface PosPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  totalTaxable: number;
  totalTax: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    gst: number;
    batchNumber?: string;
  }>;
  customerName: string;
  customerPhone: string;
  upiId: string;
  businessName: string;
  onCompleteSale: (details: PosPaymentDetails) => Promise<void>;
  isSubmitting: boolean;
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
    
    // Play dual ascending pleasant notification chime
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

    // Voice simulation via SpeechSynthesis if available
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

export default function PosPaymentModal({
  isOpen,
  onClose,
  grandTotal,
  totalTaxable,
  totalTax,
  items,
  customerName,
  customerPhone,
  upiId,
  businessName,
  onCompleteSale,
  isSubmitting,
}: PosPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"CASH" | "UPI" | "CARD" | "SPLIT" | "CREDIT">("CASH");
  const [cashInput, setCashInput] = useState<string>("");
  const [customPayable, setCustomPayable] = useState<number>(grandTotal > 0 ? grandTotal : 350);
  const effectiveGrandTotal = grandTotal > 0 ? grandTotal : customPayable;

  const [splitCashInput, setSplitCashInput] = useState<string>("");
  const [cardRef, setCardRef] = useState<string>("");
  const [cardLast4, setCardLast4] = useState<string>("");
  const [soundboxPlayed, setSoundboxPlayed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initialize cash tender input with exact amount when modal opens
  useEffect(() => {
    if (isOpen) {
      const initAmount = grandTotal > 0 ? grandTotal : customPayable;
      setCashInput(String(initAmount));
      setSplitCashInput(String(Math.round(initAmount / 2)));
      setSoundboxPlayed(false);
    }
  }, [isOpen, grandTotal, customPayable]);

  // Global Keyboard listener for POS tender actions
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('CASH');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('UPI');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('CARD');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('SPLIT');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('CREDIT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Numerical calculations
  const numericTendered = parseFloat(cashInput) || 0;
  const changeDue = Math.max(0, numericTendered - effectiveGrandTotal);
  const shortAmount = Math.max(0, effectiveGrandTotal - numericTendered);
  const isExactOrMore = numericTendered >= effectiveGrandTotal;

  // Split calculations
  const splitCash = parseFloat(splitCashInput) || 0;
  const splitOnlineRemaining = Math.max(0, effectiveGrandTotal - splitCash);

  // Quick denomination suggestions for India
  const denominations = [
    { label: `Exact (₹${effectiveGrandTotal.toFixed(2)})`, value: effectiveGrandTotal },
    { label: `₹${Math.ceil(effectiveGrandTotal / 10) * 10}`, value: Math.ceil(effectiveGrandTotal / 10) * 10 },
    { label: `₹${Math.ceil(effectiveGrandTotal / 50) * 50}`, value: Math.ceil(effectiveGrandTotal / 50) * 50 },
    { label: `₹${Math.ceil(effectiveGrandTotal / 100) * 100}`, value: Math.ceil(effectiveGrandTotal / 100) * 100 },
    { label: '₹500', value: 500 },
    { label: '₹1,000', value: 1000 },
    { label: '₹2,000', value: 2000 },
  ].filter((d, idx, arr) => d.value >= effectiveGrandTotal && arr.findIndex(x => x.value === d.value) === idx);

  // Suggested currency notes to return
  const returnNotes = getIndianDenominations(changeDue);

  // Generate real NPCI UPI URI
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId || 'zionabusiness@icici')}&pn=${encodeURIComponent(businessName || 'SmartVyapar')}&am=${effectiveGrandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill payment ${customerName || 'Customer'}`)}`;

  // NumPad buttons handler
  const handleNumpadPress = (char: string) => {
    if (char === 'C') {
      setCashInput('');
    } else if (char === 'BACK') {
      setCashInput((prev) => prev.slice(0, -1));
    } else if (char === '.') {
      if (!cashInput.includes('.')) {
        setCashInput((prev) => (prev ? prev + '.' : '0.'));
      }
    } else {
      setCashInput((prev) => (prev === '0' ? char : prev + char));
    }
  };

  const handleTriggerSoundbox = () => {
    playSoundboxChime(grandTotal.toFixed(2));
    setSoundboxPlayed(true);
    setTimeout(() => setSoundboxPlayed(false), 3000);
  };

  const handleCopyUpi = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(upiUri);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleFinish = async () => {
    let payload: PosPaymentDetails;

    if (activeTab === 'CASH') {
      payload = {
        paymentMode: 'CASH',
        paymentStatus: 'PAID',
        cashReceived: numericTendered,
        changeReturned: changeDue,
      };
    } else if (activeTab === 'UPI') {
      payload = {
        paymentMode: 'UPI',
        paymentStatus: 'PAID',
      };
    } else if (activeTab === 'CARD') {
      payload = {
        paymentMode: 'CARD',
        paymentStatus: 'PAID',
        cardRef: cardRef || undefined,
        cardLast4: cardLast4 || undefined,
      };
    } else if (activeTab === 'SPLIT') {
      payload = {
        paymentMode: 'SPLIT',
        paymentStatus: 'PAID',
        splitCash,
        splitOnline: splitOnlineRemaining,
      };
    } else {
      // CREDIT / KHATA
      payload = {
        paymentMode: 'CREDIT',
        paymentStatus: 'UNPAID',
      };
    }

    await onCompleteSale(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-7xl h-[95vh] sm:h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-900">
        
        {/* TOP POS HEADER */}
        <header className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  World-Standard POS Payment & Cash Tender Terminal
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Dual GST & FIFO Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {businessName} • Counter 1 • {customerName || "Walk-in Cash Customer"} ({items.length} items)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400 mr-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold">F1 Cash</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold">F2 UPI</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold">F3 Card</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold">F4 Split</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold">Esc Cancel</span>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Tender (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* MAIN BODY: 2-COLUMN FULL-SCREEN SPLIT */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: ORDER SUMMARY & BILL DETAILS (40% width) */}
          <section className="w-full lg:w-5/12 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/80 flex flex-col p-5 overflow-hidden">
            
            {/* Grand Total Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white shadow-lg shrink-0 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
                  Total Amount Payable
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-0.5">
                  ₹{effectiveGrandTotal.toFixed(2)}
                </div>
                <div className="text-xs text-indigo-200 mt-1 flex items-center gap-2">
                  <span>Taxable: ₹{grandTotal > 0 ? totalTaxable.toFixed(2) : (effectiveGrandTotal * 0.82).toFixed(2)}</span>
                  <span>•</span>
                  <span>GST: ₹{grandTotal > 0 ? totalTax.toFixed(2) : (effectiveGrandTotal * 0.18).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20">
                  {items.length > 0 ? `${items.length} ${items.length === 1 ? 'Product' : 'Products'}` : 'Quick Counter'}
                </span>
              </div>
            </div>

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                {items.length > 0 ? 'Order Items in Cart' : 'Quick Open Tender'}
              </div>
              {items.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white border border-dashed border-indigo-200 text-center space-y-2.5">
                  <div className="text-xs font-black text-indigo-900">Custom / Walk-in Open Tender</div>
                  <p className="text-[11px] text-slate-500">Pick a quick preset amount or type any cash in the NumPad:</p>
                  <div className="flex justify-center items-center gap-1.5 flex-wrap">
                    {[50, 100, 200, 350, 500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setCustomPayable(amt);
                          setCashInput(String(amt));
                          setSplitCashInput(String(Math.round(amt / 2)));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                          effectiveGrandTotal === amt
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-50 border border-slate-200 text-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                items.map((it, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-xs font-bold text-slate-800 truncate">{it.name}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                        <span>{it.quantity} × ₹{it.price.toFixed(2)}</span>
                        <span>•</span>
                        <span>GST {it.gst}%</span>
                        {it.batchNumber && (
                          <span className="text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded">
                            Batch: {it.batchNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-black font-mono text-slate-900 text-right shrink-0">
                      ₹{(it.quantity * it.price).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Information Card */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>Customer</span>
                <span className="font-bold text-slate-900">{customerName || "Walk-in Cash"}</span>
              </div>
              {customerPhone && (
                <div className="flex items-center justify-between text-slate-500 font-semibold mt-1">
                  <span>WhatsApp Mobile</span>
                  <span className="font-mono text-slate-800 font-bold">{customerPhone}</span>
                </div>
              )}
            </div>

          </section>

          {/* RIGHT COLUMN: WORLD-CLASS TENDER CONSOLE (60% width) */}
          <main className="w-full lg:w-7/12 flex flex-col bg-white overflow-y-auto p-5 sm:p-6 justify-between">
            
            <div className="space-y-5">
              {/* Payment Mode Selector Tabs */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Select Settlement Tender Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash Tender', icon: Banknote, hotkey: 'F1', badge: 'Fast' },
                    { id: 'UPI', label: 'UPI (QR Code)', icon: QrCode, hotkey: 'F2', badge: 'Soundbox' },
                    { id: 'CARD', label: 'Card / EDC', icon: CreditCard, hotkey: 'F3', badge: 'POS' },
                    { id: 'SPLIT', label: 'Split Tender', icon: Layers, hotkey: 'F4', badge: 'Multi' },
                    { id: 'CREDIT', label: 'Khata / Udhar', icon: BookOpen, hotkey: 'F5', badge: 'Credit' },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`p-3 rounded-2xl text-left border transition flex flex-col justify-between cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 ring-2 ring-indigo-600 ring-offset-2'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                          <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {tab.hotkey}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{tab.label}</div>
                          <div className={`text-[9px] font-semibold mt-0.5 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {tab.badge}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* -------------------------------------------------------------------------------- */}
              {/* TAB 1: ADVANCED CASH TENDER SUBSYSTEM */}
              {/* -------------------------------------------------------------------------------- */}
              {activeTab === 'CASH' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  
                  {/* Denomination Quick Buttons */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                      <span>Quick Tender Buttons (Instant Currency Notes):</span>
                      <span className="text-[11px] text-indigo-600 font-bold">1-Click Auto Fill</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {denominations.map((denom, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCashInput(String(denom.value))}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                            numericTendered === denom.value
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
                          }`}
                        >
                          {denom.label}
                        </button>
                      ))}

                      {/* Quick addition chips */}
                      <button
                        type="button"
                        onClick={() => setCashInput(String(numericTendered + 50))}
                        className="px-2.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                        title="Add ₹50 to tendered cash"
                      >
                        +₹50
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashInput(String(numericTendered + 100))}
                        className="px-2.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                        title="Add ₹100 to tendered cash"
                      >
                        +₹100
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashInput(String(numericTendered + 500))}
                        className="px-2.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                        title="Add ₹500 to tendered cash"
                      >
                        +₹500
                      </button>
                    </div>
                  </div>

                  {/* Cash Received Input & NumPad Split */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left: Input & Change Banner */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cash Given by Customer (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-lg font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            step="any"
                            value={cashInput}
                            onChange={(e) => setCashInput(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                            className="w-full rounded-2xl border-2 border-indigo-500 bg-white pl-9 pr-4 py-2.5 text-2xl font-black font-mono text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm"
                          />
                        </div>
                      </div>

                      {/* CHANGE RETURN CALCULATOR (THE MOST ADVANCED DISPLAY) */}
                      {isExactOrMore ? (
                        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                              Change to Return (Cashier)
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Exact / Surplus
                            </span>
                          </div>

                          <div className="text-3xl font-black font-mono text-emerald-700 mt-1">
                            ₹{changeDue.toFixed(2)}
                          </div>

                          {/* Currency note suggestion helper */}
                          {returnNotes.length > 0 && changeDue > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-emerald-200 text-xs">
                              <span className="text-[10px] font-bold text-emerald-800 block mb-1">
                                Suggested Denominations to Hand Over:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {returnNotes.map((rn, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-900 font-mono font-bold text-[11px] shadow-2xs">
                                    {rn.count} × {rn.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span>Short Cash Received</span>
                          </div>
                          <div className="text-2xl font-black font-mono text-rose-700 mt-1">
                            Due: ₹{shortAmount.toFixed(2)}
                          </div>
                          <p className="text-[11px] text-rose-600 mt-1">
                            Customer still owes ₹{shortAmount.toFixed(2)}. Enter exact or higher cash to complete sale.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Tactile On-Screen NumPad */}
                    <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 select-none">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
                        Tactile POS NumPad
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleNumpadPress(key)}
                            className={`h-11 rounded-xl font-bold text-sm transition active:scale-95 shadow-2xs ${
                              key === 'C'
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                : 'bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNumpadPress('BACK')}
                        className="w-full mt-1.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Delete className="w-3.5 h-3.5" />
                        <span>Backspace</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------------------------- */}
              {/* TAB 2: DYNAMIC UPI QR & SOUNDBOX SIMULATOR */}
              {/* -------------------------------------------------------------------------------- */}
              {activeTab === 'UPI' && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in duration-150">
                  {/* QR Canvas */}
                  <div className="flex flex-col items-center p-4 rounded-2xl bg-white border border-slate-200 shadow-sm shrink-0">
                    <QrCodeCanvas value={upiUri} size={180} />
                    <div className="flex items-center space-x-1 mt-2 text-[11px] font-bold text-slate-600">
                      <span>UPI ID:</span>
                      <span className="font-mono text-indigo-600">{upiId}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5">BHIM • PhonePe • GPay • Paytm</span>
                  </div>

                  {/* Instructions & Soundbox Alert Simulator */}
                  <div className="flex-1 space-y-4 text-left">
                    <div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Dynamic NPCI QR Ready
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
                        Ask Customer to Scan with Any UPI App
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        The QR code dynamically embeds the exact amount <span className="font-bold text-slate-900 font-mono">₹{grandTotal.toFixed(2)}</span> and your merchant VPA. No manual amount entry needed by customer.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>{copiedLink ? 'Copied UPI Link!' : 'Copy Payment Link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTriggerSoundbox}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-black flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Volume2 className="w-4 h-4 text-slate-950" />
                        <span>{soundboxPlayed ? 'Soundbox Played!' : 'Play Soundbox Voice Alert'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------------------------- */}
              {/* TAB 3: CARD / EDC MACHINE */}
              {/* -------------------------------------------------------------------------------- */}
              {activeTab === 'CARD' && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Card Swiping Terminal (PineLabs, Plural, Mosambee, EDC)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Approval / Auth Code (RRN from POS Slip)
                      </label>
                      <input
                        type="text"
                        value={cardRef}
                        onChange={(e) => setCardRef(e.target.value)}
                        placeholder="e.g. 984210 / TXN-4421"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Card Last 4 Digits
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value)}
                        placeholder="e.g. 4082"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Swipe or dip customer's Visa, MasterCard, RuPay debit or credit card on your external counter machine.
                  </p>
                </div>
              )}

              {/* -------------------------------------------------------------------------------- */}
              {/* TAB 4: SPLIT TENDER (CASH + UPI / CARD) */}
              {/* -------------------------------------------------------------------------------- */}
              {activeTab === 'SPLIT' && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Split Payment: Customer Pays in Two Modes</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        💵 Part 1: Cash Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={splitCashInput}
                        onChange={(e) => setSplitCashInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xl font-bold font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <span className="block text-xs font-bold text-slate-700 mb-1">
                        📱 Part 2: UPI / Card Balance (₹)
                      </span>
                      <div className="text-xl font-black font-mono text-indigo-600 pt-1">
                        ₹{splitOnlineRemaining.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Automatically balanced to match ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------------------------- */}
              {/* TAB 5: KHATA / CUSTOMER CREDIT */}
              {/* -------------------------------------------------------------------------------- */}
              {activeTab === 'CREDIT' && (
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>Customer Khata (Credit Ledger / Udhar Sale)</span>
                  </div>

                  <p className="text-xs text-amber-800 leading-relaxed">
                    This bill will be posted to <span className="font-bold">{customerName || "Customer's"}</span> outstanding credit ledger. The customer will be sent an automatic payment link on WhatsApp.
                  </p>

                  <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>This Bill Amount:</span>
                      <span className="font-bold font-mono text-slate-900">+₹{grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-800 font-bold pt-1 border-t border-slate-100">
                      <span>Status:</span>
                      <span>Unpaid (Added to Khata)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM PRIMARY ACTION BAR */}
            <footer className="pt-5 border-t border-slate-100 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
              >
                ← Back to Cart (Esc)
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSubmitting || (activeTab === 'CASH' && !isExactOrMore)}
                  className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>
                    {isSubmitting ? "Processing Sale..." : `Complete Sale & Print (Total: ₹${grandTotal.toFixed(2)})`}
                  </span>
                  <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-indigo-500/40 text-[10px] font-mono">
                    Enter
                  </span>
                </button>
              </div>
            </footer>

          </main>

        </div>

      </div>
    </div>
  );
}
