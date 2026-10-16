'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Layers, 
  ArrowRight, 
  Coins, 
  Maximize2, 
  Minimize2,
  Tag,
  CreditCard,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { 
  CustomerDisplayPayload, 
  CustomerDisplayItem, 
  listenCustomerDisplayUpdate 
} from '@/lib/customer-display';
import QrCodeCanvas from '@/components/QrCodeCanvas';

const DEFAULT_STATE: CustomerDisplayPayload = {
  storeName: 'Ziona Supermarket',
  counterName: 'Lane 01 • Ground Floor',
  status: 'IDLE',
  items: [],
  subtotal: 0,
  taxAmount: 0,
  discountAmount: 0,
  totalAmount: 0,
  totalSavings: 0,
  promoMessage: 'Fresh produce, groceries & daily essentials at guaranteed lowest prices.',
  updatedAt: Date.now(),
};

export default function CustomerDisplayPage() {
  const [data, setData] = useState<CustomerDisplayPayload>(DEFAULT_STATE);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeBannerIdx, setActiveBannerIdx] = useState<number>(0);

  const promoBanners = [
    {
      title: 'Mega Savings Everyday',
      subtitle: 'Flat discounts on fresh fruits, dairy, FMCG & home essentials.',
      icon: <Tag className="w-6 h-6 text-emerald-400" />,
      color: 'from-emerald-900/60 to-slate-900',
    },
    {
      title: 'Instant Contactless UPI',
      subtitle: 'Pay swiftly using Google Pay, PhonePe, Paytm, or any UPI app.',
      icon: <QrCode className="w-6 h-6 text-indigo-400" />,
      color: 'from-indigo-900/60 to-slate-900',
    },
    {
      title: 'Earn Loyalty Points',
      subtitle: 'Save more on every visit! Ask cashier to link your mobile number.',
      icon: <Coins className="w-6 h-6 text-amber-400" />,
      color: 'from-amber-900/60 to-slate-900',
    },
  ];

  // Rotate promo banners every 6 seconds when IDLE
  useEffect(() => {
    if (data.status !== 'IDLE') return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % promoBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [data.status, promoBanners.length]);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to Customer Display events from Cashier POS screen
  useEffect(() => {
    const unsubscribe = listenCustomerDisplayUpdate((payload) => {
      setData((prev) => ({
        ...prev,
        ...payload,
      }));
    });
    return () => unsubscribe();
  }, []);

  // Auto revert COMPLETED back to IDLE after 9 seconds
  useEffect(() => {
    if (data.status === 'COMPLETED') {
      const timer = setTimeout(() => {
        setData((prev) => ({
          ...prev,
          status: 'IDLE',
          items: [],
          subtotal: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: 0,
          totalSavings: 0,
          changeReturned: undefined,
          upiUri: undefined,
        }));
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [data.status]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const lastItem: CustomerDisplayItem | undefined = data.items[data.items.length - 1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans select-none overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-20 px-6 sm:px-10 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>{data.storeName}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Customer View
              </span>
            </h1>
            <div className="flex items-center space-x-3 text-xs text-slate-400 font-medium mt-0.5">
              <span className="inline-flex items-center space-x-1.5 text-amber-300 font-semibold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                <Layers className="w-3 h-3" />
                <span>{data.counterName || 'Lane 01 • Ground Floor'}</span>
              </span>
              <span className="hidden sm:inline-flex items-center space-x-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Pole Terminal</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Clock & Fullscreen Toggle */}
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-lg font-mono font-bold text-white tracking-wider">{currentTime}</div>
            <div className="text-xs text-slate-400">{currentDate}</div>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 shadow-sm"
            title="Toggle Fullscreen Mode (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-hidden">
        
        {/* ==================== 1. IDLE STATE ==================== */}
        {data.status === 'IDLE' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center animate-in fade-in duration-500">
            <div className="max-w-2xl w-full p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="h-20 w-20 mx-auto rounded-3xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-6 border border-indigo-500/30">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                Welcome to {data.storeName}
              </h2>
              <p className="text-base sm:text-lg text-slate-400 mb-8 font-medium">
                Please place your basket on the counter. We are ready to serve you!
              </p>

              {/* Promotional Slide Card */}
              <div className={`p-6 rounded-2xl bg-gradient-to-r ${promoBanners[activeBannerIdx].color} border border-slate-700 text-left transition-all duration-700 flex items-start space-x-4 shadow-lg`}>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 shrink-0">
                  {promoBanners[activeBannerIdx].icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {promoBanners[activeBannerIdx].title}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {promoBanners[activeBannerIdx].subtitle}
                  </p>
                </div>
              </div>

              {/* Step indicator */}
              <div className="flex justify-center space-x-2 mt-6">
                {promoBanners.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeBannerIdx ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. BILLING STATE ==================== */}
        {data.status === 'BILLING' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden animate-in fade-in duration-300">
            {/* Left: Live Scanned Items Table (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col bg-slate-900/70 rounded-3xl border border-slate-800 p-6 overflow-hidden shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold text-base text-white">Scanned Items</span>
                </div>
                <span className="text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-full text-indigo-300 border border-slate-700">
                  {data.items.length} {data.items.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {/* Latest Item Spotlight Card */}
              {lastItem && (
                <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-slate-900 border-2 border-indigo-500/60 shadow-lg shadow-indigo-950/50 shrink-0 animate-in slide-in-from-top-2 duration-300">
                  <div className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase mb-1 flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
                    <span>Just Scanned</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-lg text-white leading-tight">{lastItem.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        Qty: <strong className="text-slate-200">{lastItem.quantity}</strong> × ₹{lastItem.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-indigo-300 font-mono">
                        ₹{lastItem.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List (Scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {data.items.slice(0, -1).reverse().map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between hover:bg-slate-800/70 transition"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-sm font-semibold text-slate-200 truncate">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-white font-mono shrink-0">
                      ₹{item.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Bill Summary & Grand Total (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-b from-slate-900/90 to-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 pb-2 border-b border-slate-800">
                  Cart Bill Summary
                </h3>

                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span>₹{data.subtotal.toFixed(2)}</span>
                  </div>

                  {data.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span className="flex items-center space-x-1">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Instant Discount</span>
                      </span>
                      <span>-₹{data.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {data.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>GST Taxes</span>
                      <span>₹{data.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Big Grand Total Card */}
              <div className="pt-6 border-t border-slate-800 mt-6">
                <div className="p-6 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-center shadow-inner">
                  <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">
                    Total Amount to Pay
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                    ₹{data.totalAmount.toFixed(2)}
                  </div>
                </div>

                {/* Savings Callout */}
                {data.totalSavings > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center space-x-2 text-emerald-300 font-bold text-sm shadow-sm animate-pulse">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>You are saving ₹{data.totalSavings.toFixed(2)} today!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. PAYMENT STATE (DYNAMIC UPI QR) ==================== */}
        {data.status === 'PAYMENT' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center animate-in zoom-in-95 duration-400">
            <div className="max-w-xl w-full p-8 rounded-3xl bg-slate-900/90 border border-indigo-500/50 shadow-2xl backdrop-blur-xl relative">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold mb-4">
                <QrCode className="w-4 h-4" />
                <span>Instant Payment Terminal</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
                Scan & Pay via UPI
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Google Pay • PhonePe • Paytm • BHIM • Any Bank App
              </p>

              {/* Dynamic QR Code Canvas */}
              <div className="p-4 bg-white rounded-3xl inline-block shadow-2xl border-4 border-slate-800 mx-auto mb-6">
                {data.upiUri ? (
                  <QrCodeCanvas value={data.upiUri} size={240} className="rounded-xl" />
                ) : (
                  <div className="w-60 h-60 flex flex-col items-center justify-center text-slate-800 font-mono text-xs">
                    <QrCode className="w-16 h-16 text-slate-400 mb-2" />
                    <span>Generating UPI QR...</span>
                  </div>
                )}
              </div>

              {/* Exact Amount Highlight */}
              <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-600/50 max-w-sm mx-auto">
                <div className="text-xs text-indigo-300 font-medium">Exact Amount</div>
                <div className="text-3xl font-black text-white font-mono mt-0.5">
                  ₹{data.totalAmount.toFixed(2)}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Secure Instant Bank Settlement</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 4. COMPLETED STATE ==================== */}
        {data.status === 'COMPLETED' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center animate-in zoom-in-90 duration-500">
            <div className="max-w-xl w-full p-10 rounded-3xl bg-slate-900/90 border border-emerald-500/60 shadow-2xl backdrop-blur-xl">
              <div className="h-24 w-24 mx-auto rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 border border-emerald-500/40 animate-bounce">
                <CheckCircle2 className="w-14 h-14" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                Payment Successful!
              </h2>
              <p className="text-base text-slate-300 mb-6 font-medium">
                Thank you for shopping at <strong>{data.storeName}</strong>.
              </p>

              {/* Cash Change Returned Highlight */}
              {data.changeReturned && data.changeReturned > 0 ? (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/80 to-slate-900 border-2 border-amber-500/80 mb-6 shadow-xl">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1 flex items-center justify-center space-x-1.5">
                    <Coins className="w-4 h-4" />
                    <span>Please Collect Your Cash Change</span>
                  </div>
                  <div className="text-4xl font-black text-white font-mono mt-1">
                    ₹{data.changeReturned.toFixed(2)}
                  </div>
                </div>
              ) : null}

              {data.totalSavings > 0 && (
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-600/40 text-sm font-bold">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Total Amount Saved: ₹{data.totalSavings.toFixed(2)}</span>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-8">
                Please collect your items and invoice slip. Have a wonderful day!
              </p>
            </div>
          </div>
        )}

      </main>

      {/* Footer Branding Bar */}
      <footer className="h-12 px-6 sm:px-10 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center space-x-2">
          <span>Powered by</span>
          <strong className="text-slate-200">ZionaPOS Retail Enterprise</strong>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hidden sm:inline">Certified High-Throughput Retail POS</span>
          <span className="text-indigo-400 font-mono">v2.5</span>
        </div>
      </footer>
    </div>
  );
}
