'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Share2, 
  PlusCircle, 
  CheckCircle2, 
  Receipt,
  FileText,
  Sliders,
  Sparkles,
  Zap,
  Wallet
} from 'lucide-react';
import BarcodeSvg from './BarcodeSvg';
import QrCodeCanvas from './QrCodeCanvas';
import { 
  buildEscposReceipt, 
  printDirectHardware, 
  kickCashDrawer, 
  getHardwarePrinterConfig, 
  isWebSerialSupported, 
  isWebUsbSupported 
} from '@/lib/escpos';

export interface ThermalReceiptItem {
  name: string;
  hsn?: string;
  quantity: number;
  unit?: string;
  price: number; // Unit price
  mrp?: number;
  gstRate?: number;
  total: number;
}

export interface ThermalReceiptData {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone?: string;
  customerState?: string;
  cashierName?: string;
  docTitle?: string;
  items: ThermalReceiptItem[];
  subTotal: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentMode: string;
  cashReceived?: number;
  changeReturned?: number;
  totalSavings?: number;
  discountAmount?: number;
  upiUri?: string;
  irn?: string;
  ackNo?: string;
  signedQrCode?: string;
  notes?: string;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsEarned?: number;
  loyaltyDiscountAmount?: number;
  customerLoyaltyBalance?: number;
}

interface BusinessProfile {
  name: string;
  logoUrl?: string;
  gstin?: string;
  stateCode?: string;
  phone?: string;
  address?: string;
  upiId?: string;
}

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ThermalReceiptData | null;
  business: BusinessProfile;
  onNewSale?: () => void;
}

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  data,
  business,
  onNewSale,
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);
  const [printingDirect, setPrintingDirect] = useState(false);
  const [kickingDrawer, setKickingDrawer] = useState(false);
  const [hwConfig, setHwConfig] = useState(() => getHardwarePrinterConfig());
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [cloudFeedback, setCloudFeedback] = useState<string>('');

  const isHardwareSupported = isWebSerialSupported() || isWebUsbSupported();

  useEffect(() => {
    if (isOpen) {
      const cfg = getHardwarePrinterConfig();
      setHwConfig(cfg);
      if (cfg.paperWidth) setPaperWidth(cfg.paperWidth);

      // Auto-print directly if enabled
      if (cfg.autoPrintOnSave && !autoPrintTriggered) {
        setAutoPrintTriggered(true);
        handleDirectEscposPrint();
      }
    } else {
      setAutoPrintTriggered(false);
    }
  }, [isOpen]);

  // Keyboard shortcut: Enter to print, Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        if (hwConfig.type !== "NONE") {
          handleDirectEscposPrint();
        } else {
          handlePrint();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hwConfig.type]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  // Direct Hardware Silent ESC/POS Print (WebUSB / WebSerial)
  const handleDirectEscposPrint = async () => {
    setPrintingDirect(true);
    try {
      const bytes = buildEscposReceipt({
        businessName: business.name,
        businessGstin: business.gstin,
        businessAddress: business.address,
        businessPhone: business.phone,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate).toLocaleDateString('en-IN'),
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        items: data.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          total: i.total,
        })),
        subtotal: data.subTotal,
        taxAmount: (data.cgstAmount || 0) + (data.sgstAmount || 0) + (data.igstAmount || 0),
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMode,
        paperWidth,
        includeBarcode: true,
        kickDrawer: hwConfig.kickDrawerOnPrint,
        loyaltyRedeemed: data.loyaltyDiscountAmount,
        loyaltyEarned: data.loyaltyPointsEarned,
      });

      const res = await printDirectHardware(bytes);
      if (!res.success) {
        alert(res.error || "Direct silent print failed. Falling back to standard print dialog.");
        window.print();
      }
    } catch (err: any) {
      console.warn("Direct ESC/POS failed, falling back to window.print:", err);
      window.print();
    } finally {
      setPrintingDirect(false);
    }
  };

  // Direct Cash Drawer Kick
  const handleKickDrawer = async () => {
    setKickingDrawer(true);
    try {
      const res = await kickCashDrawer();
      if (!res.success) {
        alert(res.error || "Failed to trigger cash drawer kick.");
      }
    } catch (err: any) {
      alert("Cash drawer kick failed: " + err.message);
    } finally {
      setKickingDrawer(false);
    }
  };

  // WhatsApp Share URL
  const whatsappText = encodeURIComponent(
    `🧾 *${business.name.toUpperCase()}* - Bill #${data.invoiceNumber}\n` +
    `📅 Date: ${new Date(data.invoiceDate).toLocaleDateString('en-IN')}\n` +
    `👤 Customer: ${data.customerName}\n` +
    `---------------------------\n` +
    data.items.map((i) => `• ${i.name} (x${i.quantity}) = ₹${i.total.toFixed(2)}`).join('\n') +
    `\n---------------------------\n` +
    `💰 *Grand Total: ₹${data.totalAmount.toFixed(2)}*\n` +
    (data.totalSavings && data.totalSavings > 0 ? `🎉 You Saved: ₹${data.totalSavings.toFixed(2)}!\n` : '') +
    (data.paymentMode ? `💳 Payment Mode: ${data.paymentMode}\n` : '') +
    (data.upiUri ? `📲 Pay/Verify UPI: ${data.upiUri}\n` : '') +
    `Thank you for shopping with us! Visit again.`
  );

  const whatsappUrl = `https://wa.me/91${(data.customerPhone || '').replace(/\D/g, '')}?text=${whatsappText}`;

  // Calculate dynamic UPI URI if not present
  const upiPayUri =
    data.upiUri ||
    (business.upiId
      ? `upi://pay?pa=${business.upiId}&pn=${encodeURIComponent(business.name)}&am=${data.totalAmount.toFixed(
          2
        )}&cu=INR&tn=Bill-${data.invoiceNumber}`
      : '');


  const handleCloudDispatch = async (channel: 'WHATSAPP' | 'SMS') => {
    if (!data?.customerPhone) return;
    setCloudStatus('sending');
    setCloudFeedback('');
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          type: 'CUSTOM',
          recipientPhone: data.customerPhone,
          customMessage: decodeURIComponent(whatsappText),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to dispatch');
      setCloudStatus('sent');
      setCloudFeedback(`Dispatched via ${channel} (${result.results?.[0]?.provider || 'Gateway'})`);
    } catch (err: any) {
      setCloudStatus('error');
      setCloudFeedback(err.message || 'Dispatch error');
    }
  };

  const is58mm = paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {/* Container Dialog */}
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-slate-100 shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  Invoice #{data.invoiceNumber} Generated
                </h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  {data.paymentMode} • ₹{data.totalAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Stock deducted from Neon DB • ESC/POS Thermal Receipt ready
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Paper Size Switcher */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  paperWidth === '80mm'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3-Inch (80mm)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  paperWidth === '58mm'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2-Inch (58mm)
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left is preview, Right is action cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Action Panel on Right (or top on mobile) */}
          <div className="md:col-span-5 order-2 md:order-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Direct ESC/POS Hardware Silent Print (Primary when hardware supported) */}
              {isHardwareSupported && (
                <button
                  type="button"
                  onClick={handleDirectEscposPrint}
                  disabled={printingDirect}
                  className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/20 hover:from-black hover:to-indigo-900 active:scale-[0.99] transition disabled:opacity-50"
                  title="Bypass browser print dialog and send raw ESC/POS commands directly to USB/Serial Thermal Printer"
                >
                  <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span>{printingDirect ? "Printing to Thermal..." : "⚡ Silent Thermal Print (1-Click)"}</span>
                </button>
              )}

              {/* Standard Print Dialog Button */}
              <button
                type="button"
                onClick={handlePrint}
                className={`w-full flex items-center justify-center space-x-2 rounded-2xl px-5 py-3 text-xs font-bold transition shadow-sm ${
                  isHardwareSupported
                    ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
                }`}
              >
                <Printer className="h-4 w-4 text-slate-600" />
                <span>Standard Print Dialog (Enter)</span>
              </button>

              {/* Cash Drawer Kick Button */}
              {isHardwareSupported && (
                <button
                  type="button"
                  onClick={handleKickDrawer}
                  disabled={kickingDrawer}
                  className="w-full flex items-center justify-center space-x-2 rounded-2xl border border-amber-300 bg-amber-50/80 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition disabled:opacity-50"
                  title="Pulse RJ11/RJ12 cash drawer solenoid to open register"
                >
                  <Wallet className="h-3.5 w-3.5 text-amber-600" />
                  <span>{kickingDrawer ? "Popping Till..." : "Open Cash Drawer (Kick Till)"}</span>
                </button>
              )}

              {/* WhatsApp Share Button (Client) */}
              <a
                href={
                  data.customerPhone
                    ? `https://wa.me/91${data.customerPhone.replace(/\D/g, '')}?text=${whatsappText}`
                    : `https://wa.me/?text=${whatsappText}`
                }
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center space-x-2 rounded-2xl border border-emerald-500 bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
              >
                <Share2 className="h-4 w-4" />
                <span>
                  {data.customerPhone
                    ? `Send Bill via WhatsApp (+91 ${data.customerPhone})`
                    : "Share Bill via WhatsApp"}
                </span>
              </a>

              {/* Cloud Gateway Dispatch */}
              {data.customerPhone && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={cloudStatus === 'sending'}
                      onClick={() => handleCloudDispatch('WHATSAPP')}
                      className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl border border-emerald-500/40 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-[0.99] transition disabled:opacity-60 shadow-sm"
                    >
                      <span>{cloudStatus === 'sending' ? 'Sending...' : '☁️ Cloud WhatsApp'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={cloudStatus === 'sending'}
                      onClick={() => handleCloudDispatch('SMS')}
                      className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl border border-blue-500/40 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-800 hover:bg-blue-100 active:scale-[0.99] transition disabled:opacity-60 shadow-sm"
                    >
                      <span>{cloudStatus === 'sending' ? 'Sending...' : '📱 Cloud SMS'}</span>
                    </button>
                  </div>
                  {cloudFeedback && (
                    <p className={`text-[11px] font-semibold text-center py-1 px-2 rounded-lg ${
                      cloudStatus === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {cloudFeedback}
                    </p>
                  )}
                </div>
              )}

              {/* Thermal Printer Tips */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-xs text-slate-600 shadow-sm">
                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  <span>Thermal Printing Notes</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
                  <li>In Chrome print dialog, set <strong>Margins: None</strong>.</li>
                  <li>Select your ESC/POS thermal printer (80mm / 58mm).</li>
                  <li>High-contrast pure monochrome ensures razor-sharp barcodes.</li>
                </ul>
              </div>

              {/* Bill Financial Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 text-xs shadow-sm">
                <div className="font-bold text-slate-900">Transaction Highlights</div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Mode:</span>
                  <span className="font-semibold text-slate-900">{data.paymentMode}</span>
                </div>
                {data.cashReceived !== undefined && data.cashReceived > 0 && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Cash Received:</span>
                      <span className="font-semibold text-slate-900">₹{data.cashReceived.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Change Returned:</span>
                      <span>₹{(data.changeReturned || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {data.notes && (
                  <div className="pt-1 border-t border-slate-100 text-[11px] text-indigo-700 font-medium">
                    {data.notes}
                  </div>
                )}
                {data.totalSavings !== undefined && data.totalSavings > 0 && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 text-emerald-800 text-[11px] font-bold flex items-center space-x-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Customer Saved ₹{data.totalSavings.toFixed(2)} on MRP!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Next Sale Button */}
            {onNewSale && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewSale();
                }}
                className="w-full flex items-center justify-center space-x-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                <PlusCircle className="h-4 w-4 text-indigo-600" />
                <span>Next Customer / New Bill (F9)</span>
              </button>
            )}
          </div>

          {/* Right Column: Thermal Paper Preview (Real Scale) */}
          <div className="md:col-span-7 order-1 md:order-2 flex justify-center items-start">
            {/* Outer Roll Container */}
            <div
              className={`bg-white shadow-xl border border-slate-300 transition-all duration-300 text-black font-mono text-[11px] leading-relaxed select-none ${
                is58mm ? 'w-[240px] px-2 py-4 text-[10px]' : 'w-[320px] px-4 py-5 text-[11px]'
              }`}
              id="thermal-receipt-preview"
            >
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-2">
                {business.logoUrl && (
                  <div className="flex justify-center pb-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={business.logoUrl}
                      alt={business.name}
                      className="max-h-12 max-w-[140px] object-contain mx-auto"
                    />
                  </div>
                )}
                <h2 className="text-base font-black tracking-wider uppercase">
                  {business.name}
                </h2>
                {business.address && (
                  <p className="text-[10px] text-slate-700 leading-tight">
                    {business.address}
                  </p>
                )}
                {business.phone && (
                  <p className="text-[10px] text-slate-700">
                    Ph: {business.phone}
                  </p>
                )}
                {business.gstin && (
                  <p className="text-[10px] font-bold tracking-tight">
                    GSTIN: {business.gstin}
                  </p>
                )}
                <div className="text-[9px] font-bold uppercase tracking-wider py-0.5 border-y border-dashed border-black my-1">
                  {data.docTitle || "Tax Invoice / Cash Memo"}
                </div>
              </div>

              {/* Bill Details */}
              <div className="space-y-0.5 text-[10px] py-1">
                <div className="flex justify-between">
                  <span>Bill No: <strong className="text-black">{data.invoiceNumber}</strong></span>
                  <span>{new Date(data.invoiceDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cust: {data.customerName || 'Walk-in'}</span>
                  <span>{new Date(data.invoiceDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {data.customerPhone && (
                  <div>Mobile: {data.customerPhone}</div>
                )}
                {data.cashierName && (
                  <div>Cashier: {data.cashierName}</div>
                )}
              </div>

              {/* Dashed Separator */}
              <div className="border-t border-dashed border-black my-1.5" />

              {/* Items Table Header */}
              <div className="grid grid-cols-12 font-bold text-[10px] border-b border-dashed border-black pb-1">
                <div className="col-span-6">ITEM</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-2 text-right">RATE</div>
                <div className="col-span-2 text-right">AMT</div>
              </div>

              {/* Items Rows */}
              <div className="divide-y divide-dashed divide-slate-200 py-1">
                {data.items.map((item, idx) => (
                  <div key={idx} className="py-1">
                    <div className="grid grid-cols-12 leading-tight">
                      <div className="col-span-6 font-semibold break-words pr-1">
                        {item.name}
                      </div>
                      <div className="col-span-2 text-center">
                        {item.quantity} {item.unit || ''}
                      </div>
                      <div className="col-span-2 text-right">
                        {item.price.toFixed(2)}
                      </div>
                      <div className="col-span-2 text-right font-bold">
                        {item.total.toFixed(2)}
                      </div>
                    </div>
                    {item.hsn && (
                      <div className="text-[9px] text-slate-600">
                        HSN: {item.hsn} {item.gstRate ? `(GST ${item.gstRate}%)` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dashed Separator */}
              <div className="border-t border-dashed border-black my-1.5" />

              {/* Totals Section */}
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{(data.taxableAmount || data.subTotal).toFixed(2)}</span>
                </div>

                {data.discountAmount !== undefined && data.discountAmount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Discount / Promo:</span>
                    <span>-₹{data.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* GST Slab-wise Summary Table (Tally/Zoho style) */}
                {(data.cgstAmount || data.sgstAmount || data.igstAmount) ? (() => {
                  // Group items by GST rate slab
                  const slabMap: Record<number, { taxable: number; cgst: number; sgst: number; igst: number }> = {};
                  const isIgst = (data.igstAmount || 0) > 0 && !(data.cgstAmount && data.cgstAmount > 0);
                  data.items.forEach((item) => {
                    const rate = item.gstRate || 0;
                    if (rate === 0) return;
                    if (!slabMap[rate]) slabMap[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
                    slabMap[rate].taxable += item.total;
                    const tax = (item.total * rate) / (100 + rate); // back-calculate from inclusive
                    if (isIgst) {
                      slabMap[rate].igst += tax;
                    } else {
                      slabMap[rate].cgst += tax / 2;
                      slabMap[rate].sgst += tax / 2;
                    }
                  });
                  const slabs = Object.entries(slabMap).filter(([, v]) => v.taxable > 0);
                  if (slabs.length === 0) return null;
                  return (
                    <div className="border border-dashed border-slate-400 rounded p-1 my-1">
                      <div className={`grid font-bold text-[8px] border-b border-dashed border-slate-400 pb-0.5 mb-0.5 ${isIgst ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        <span>Rate</span>
                        <span className="text-right">Taxable</span>
                        {!isIgst && <span className="text-right">CGST</span>}
                        <span className="text-right">{isIgst ? 'IGST' : 'SGST'}</span>
                      </div>
                      {slabs.map(([rate, v]) => (
                        <div key={rate} className={`grid text-[8px] ${isIgst ? 'grid-cols-3' : 'grid-cols-4'}`}>
                          <span>{rate}%</span>
                          <span className="text-right">₹{(v.taxable - (isIgst ? v.igst : v.cgst + v.sgst)).toFixed(2)}</span>
                          {!isIgst && <span className="text-right">₹{v.cgst.toFixed(2)}</span>}
                          <span className="text-right">₹{(isIgst ? v.igst : v.sgst).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className={`grid text-[8px] font-bold border-t border-dashed border-slate-400 pt-0.5 mt-0.5 ${isIgst ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        <span>Total</span>
                        <span className="text-right">₹{(data.taxableAmount || data.subTotal).toFixed(2)}</span>
                        {!isIgst && <span className="text-right">₹{(data.cgstAmount || 0).toFixed(2)}</span>}
                        <span className="text-right">₹{(isIgst ? (data.igstAmount || 0) : (data.sgstAmount || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })() : null}

                {/* Grand Total Highlight */}
                <div className="border-y-2 border-black py-1 my-1 flex justify-between items-center text-sm font-black">
                  <span>NET TOTAL:</span>
                  <span>₹{data.totalAmount.toFixed(2)}</span>
                </div>

                {/* Savings Banner */}
                {data.totalSavings !== undefined && data.totalSavings > 0 && (
                  <div className="text-center font-bold text-[10px] uppercase border border-dashed border-black py-0.5 my-1">
                    *** YOU SAVED ₹{data.totalSavings.toFixed(2)}! ***
                  </div>
                )}

                {/* Tender Breakdown */}
                <div className="pt-1 text-[9px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Paid via: <strong>{data.paymentMode}</strong></span>
                    <span>Status: <strong>{data.dueAmount && data.dueAmount > 0 ? 'PARTIAL' : 'PAID'}</strong></span>
                  </div>
                  {data.cashReceived !== undefined && data.cashReceived > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Cash Tendered:</span>
                        <span>₹{data.cashReceived.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Change Returned:</span>
                        <span>₹{(data.changeReturned || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {data.dueAmount !== undefined && data.dueAmount > 0 && (
                    <div className="flex justify-between font-bold text-rose-600">
                      <span>Balance Due:</span>
                      <span>₹{data.dueAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {data.notes && (
                    <div className="pt-0.5 border-t border-dotted border-black text-[8px] text-slate-800">
                      <span>{data.notes}</span>
                    </div>
                  )}
                </div>

                {/* Loyalty Rewards Summary */}
                {(data.loyaltyPointsRedeemed || data.loyaltyPointsEarned || data.customerLoyaltyBalance != null) && (
                  <div className="border-t border-dashed border-black pt-1 my-1 text-[9px] space-y-0.5">
                    <div className="text-center font-bold uppercase tracking-wider text-slate-900">
                      * LOYALTY REWARDS *
                    </div>
                    {data.loyaltyPointsRedeemed ? (
                      <div className="flex justify-between">
                        <span>Points Redeemed:</span>
                        <span>{data.loyaltyPointsRedeemed} pts (-₹{data.loyaltyPointsRedeemed.toFixed(2)})</span>
                      </div>
                    ) : null}
                    {data.loyaltyPointsEarned ? (
                      <div className="flex justify-between">
                        <span>Points Earned Today:</span>
                        <span className="font-bold">+{data.loyaltyPointsEarned} pts</span>
                      </div>
                    ) : null}
                    {data.customerLoyaltyBalance != null ? (
                      <div className="flex justify-between font-bold border-t border-dotted border-slate-400 pt-0.5 mt-0.5">
                        <span>Closing Point Balance:</span>
                        <span>{data.customerLoyaltyBalance} pts</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Statutory B2B e-Invoice QR or Dynamic UPI QR Code */}
              {data.irn ? (
                <div className="text-center py-2.5 my-1 border-t border-dashed border-black space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider">
                    GST Statutory e-Invoice (IRN)
                  </div>
                  <div className="text-[7px] font-mono break-all px-1 leading-tight text-slate-800">
                    IRN: {data.irn}
                  </div>
                  {data.ackNo && (
                    <div className="text-[8px] font-mono text-slate-700">
                      Ack No: {data.ackNo}
                    </div>
                  )}
                  {data.signedQrCode && (
                    <div className="flex justify-center py-1">
                      <QrCodeCanvas value={data.signedQrCode} size={is58mm ? 95 : 120} />
                    </div>
                  )}
                  <div className="text-[8px] text-slate-600 font-sans">
                    NIC IRP Verified • GST Rule 48(4)
                  </div>
                </div>
              ) : upiPayUri ? (
                <div className="text-center py-2.5 my-1 border-t border-dashed border-black space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider">
                    Scan UPI QR to Pay / Verify
                  </div>
                  <div className="flex justify-center">
                    <QrCodeCanvas value={upiPayUri} size={is58mm ? 95 : 120} />
                  </div>
                  <div className="text-[8px] text-slate-600 font-sans">
                    GPay • PhonePe • Paytm • BHIM
                  </div>
                </div>
              ) : null}

              {/* Invoice Barcode */}
              <div className="text-center py-1.5 border-t border-dashed border-black space-y-0.5">
                <BarcodeSvg
                  value={data.invoiceNumber}
                  width={is58mm ? 1.0 : 1.2}
                  height={22}
                  fontSize={8}
                />
              </div>

              {/* Footer Terms & Greetings */}
              <div className="text-center pt-2 border-t border-dashed border-black text-[9px] space-y-0.5">
                <p className="font-bold">THANK YOU! VISIT AGAIN!</p>
                <p className="text-[8px] text-slate-600">
                  Goods once sold can be exchanged within 7 days.
                </p>
                <p className="text-[8px] text-slate-500">
                  Powered by Ziona POS
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for Thermal Printing: Targets ONLY #thermal-receipt-preview */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-preview,
          #thermal-receipt-preview * {
            visibility: visible;
          }
          #thermal-receipt-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperWidth};
            margin: 0 !important;
            padding: ${is58mm ? '4px' : '8px'} !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: ${paperWidth} auto;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
}
