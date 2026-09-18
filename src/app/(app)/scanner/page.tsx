'use client';

import React, { useState } from 'react';
import { 
  Camera, 
  Upload, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Printer,
  Tag,
  X,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import BarcodeSvg from '@/components/BarcodeSvg';

interface StickerItem {
  name: string;
  barcode: string;
  mrp: string;
  price: string;
  qty: number;
  unit: string;
}

export default function ScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);

  // Barcode Printing State
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [stickerItems, setStickerItems] = useState<StickerItem[]>([]);
  const [storeName, setStoreName] = useState('ZIONA RETAIL');
  const [stickersPerRow, setStickersPerRow] = useState<1 | 2 | 3>(1);
  const [stickerWidthMm, setStickerWidthMm] = useState(50);
  const [stickerHeightMm, setStickerHeightMm] = useState(25);
  const [gapMm, setGapMm] = useState(2);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
      setResult(null);
      setConfirmSuccess(null);

      if (selected.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selected));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleStartScan = async () => {
    if (!file) return;

    setIsScanning(true);
    setError(null);
    setConfirmSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/scan-purchase', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze invoice');
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmStock = async () => {
    if (!result) return;
    setIsConfirming(true);
    setConfirmSuccess(null);
    try {
      const res = await fetch('/api/purchase/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save purchase bill');
      }
      setConfirmSuccess(data.message || 'Items successfully entered into catalog and stock updated!');

      // Populate sticker items with received base quantities
      const itemsForStickers: StickerItem[] = (result.items || []).map((it: any) => {
        const baseQty = Math.max(1, Math.floor(Number(it.baseQuantity || it.quantity || 1)));
        const cost = Number(it.baseCostPrice || it.purchasePrice || 100);
        const estMrp = it.mrp ? String(it.mrp) : String(Math.round(cost * 1.35));
        const estPrice = it.mrp ? String(it.mrp) : String(Math.round(cost * 1.25));
        return {
          name: it.productName,
          barcode: it.barcode || it.sku || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          mrp: estMrp,
          price: estPrice,
          qty: baseQty,
          unit: it.baseUnit || it.unit || 'PCS',
        };
      });

      setStickerItems(itemsForStickers);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const totalStickerCount = stickerItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const handlePrintModal = () => {
    window.print();
  };

  const rollWidthMm = (stickerWidthMm * Number(stickersPerRow)) + (gapMm * (Number(stickersPerRow) - 1));

  // Flatten all stickers and chunk into multi-up rows
  const flattenedStickers: StickerItem[] = [];
  stickerItems.forEach((item) => {
    for (let q = 0; q < (Number(item.qty) || 0); q++) {
      flattenedStickers.push(item);
    }
  });

  const batchRows: StickerItem[][] = [];
  for (let i = 0; i < flattenedStickers.length; i += stickersPerRow) {
    batchRows.push(flattenedStickers.slice(i, i + stickersPerRow));
  }

  return (
    <div className="space-y-6">
      {/* Print Media Specific CSS for Thermal Labels */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-print-section, #thermal-print-section * {
            visibility: visible;
          }
          #thermal-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          @page {
            size: ${rollWidthMm}mm ${stickerHeightMm}mm;
            margin: 0;
          }
          .thermal-batch-row {
            width: ${rollWidthMm}mm;
            height: ${stickerHeightMm}mm;
            page-break-after: always;
            break-after: page;
            display: flex;
            justify-content: ${stickersPerRow === 1 ? 'center' : 'space-between'};
            box-sizing: border-box;
            margin: 0 auto;
            overflow: hidden;
          }
          .thermal-batch-sticker {
            width: ${stickerWidthMm}mm;
            height: ${stickerHeightMm}mm;
            box-sizing: border-box;
            padding: 1mm 1.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            font-family: system-ui, -apple-system, sans-serif;
            background: white;
            color: black;
          }
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4 print:hidden">
        <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <Camera className="h-6 w-6 text-indigo-600" />
          <span>Gemini AI Purchase Bill Scanner</span>
          <span className="rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5">
            Flash Vision
          </span>
        </h1>
        <p className="text-xs text-slate-500">
          Upload supplier paper bills or PDFs to automatically extract items, HSN, packaging UOM (Box vs Pcs), batch numbers, and stock-in
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
        {/* Upload Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Upload Supplier Bill</h2>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition bg-slate-50/50">
            <input
              type="file"
              accept="image/*,.pdf"
              id="scannerInput"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="scannerInput" className="cursor-pointer block">
              <Upload className="h-10 w-10 text-indigo-500 mx-auto mb-3" />
              <span className="text-sm font-semibold text-indigo-600 block">
                {file ? file.name : "Click to upload image or PDF bill"}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Supports JPEG, PNG, WEBP, and PDF invoices up to 10MB
              </span>
            </label>
          </div>

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 flex justify-center bg-slate-900">
              <img src={previewUrl} alt="Bill preview" className="object-contain max-h-56" />
            </div>
          )}

          <button
            onClick={handleStartScan}
            disabled={!file || isScanning}
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Analyzing Invoice with Gemini Vision...</span>
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                <span>Start AI Extraction</span>
              </>
            )}
          </button>

          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 font-medium flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* AI Results Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Extracted Bill Data</h2>

          {!result ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Upload a purchase bill to view extracted items, packaging units, and tax slabs</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-indigo-50/60 p-3 border border-indigo-100 flex items-start justify-between">
                <div>
                  <div className="font-bold text-indigo-950 text-sm">{result.supplierName}</div>
                  <div className="text-indigo-700 text-[11px]">
                    Bill #{result.billNumber} • GSTIN: {result.supplierGstin || "N/A"}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  OCR Conf: {Math.round((result.confidenceScore || 0.95) * 100)}%
                </span>
              </div>

              {/* SUCCESS CALLOUT WITH BARCODE STICKER BUTTON */}
              {confirmSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 space-y-2">
                  <div className="font-bold flex items-center space-x-2 text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{confirmSuccess}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    All items entered into inventory ledger. You can now print 50mm × 25mm barcode stickers to stick on newly received physical boxes.
                  </p>
                  
                  {/* DIRECT 1-CLICK BARCODE STICKER BUTTON */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => setShowBarcodeModal(true)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition flex items-center space-x-2 shadow-sm"
                    >
                      <Printer className="h-4 w-4 text-emerald-400" />
                      <span>Print Barcode Stickers ({totalStickerCount} Labels)</span>
                    </button>
                    <Link
                      href="/inventory"
                      className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition"
                    >
                      View Catalog →
                    </Link>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {result.items?.map((item: any, i: number) => {
                  const isPkg = (item.packageSize && item.packageSize > 1) || (item.unit && item.unit !== 'PCS' && item.unit !== item.baseUnit);
                  return (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-900 text-[12px]">{item.productName}</div>
                          {item.hsnCode && <div className="text-[10px] text-slate-400">HSN: {item.hsnCode}</div>}
                        </div>
                        <div className="font-bold text-slate-900 text-right">
                          ₹{Number(item.lineTotal || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                        <span className="bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-medium">
                          Billed: {item.quantity} {item.unit || 'PCS'} @ ₹{item.purchasePrice}
                        </span>

                        {isPkg && (
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold flex items-center space-x-1">
                            <span>📦 Pack: 1 {item.unit} = {item.packageSize} {item.baseUnit || 'PCS'}</span>
                            <span className="text-indigo-500">→</span>
                            <span>Stock In: +{item.baseQuantity} {item.baseUnit || 'PCS'}</span>
                            <span className="text-slate-500">(@ ₹{Number(item.baseCostPrice || 0).toFixed(2)}/{item.baseUnit || 'PC'})</span>
                          </span>
                        )}

                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          GST: {item.gstRate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-1 font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span>Taxable Amount:</span>
                  <span>₹{Number(result.totalTaxable || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-indigo-600">
                  <span>Input Tax Credit (ITC):</span>
                  <span>₹{(Number(result.cgstAmount || 0) + Number(result.sgstAmount || 0) + Number(result.igstAmount || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-1">
                  <span>Total Purchase Bill:</span>
                  <span>₹{Number(result.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              {!confirmSuccess ? (
                <button
                  onClick={handleConfirmStock}
                  disabled={isConfirming}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:bg-slate-300 flex items-center justify-center space-x-1 shadow-sm"
                >
                  {isConfirming ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Updating Inventory & General Ledger...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm & Stock In (+Atomic Base Units)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowBarcodeModal(true)}
                  className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition flex items-center justify-center space-x-2 shadow-sm"
                >
                  <Printer className="h-4 w-4 text-emerald-400" />
                  <span>🖨️ Print {totalStickerCount} Barcode Labels for this Bill</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 
        MODAL: BATCH BARCODE STICKER PRINT MODAL 
        Displays all received items from the purchase bill with editable sticker quantities
      */}
      {showBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Print Thermal Barcode Stickers — Bill #{result?.billNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Vendor: {result?.supplierName} • Total {totalStickerCount} Stickers (50mm × 25mm)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content / Item List */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-xs gap-3">
                <div>
                  <span className="font-semibold text-indigo-950">Store Header: </span>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="ml-2 rounded border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-900 focus:outline-none"
                  />
                </div>
                
                {/* Roll Preset Buttons */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-semibold text-indigo-700">Roll:</span>
                  {[
                    { label: '1-Up (50×25)', up: 1, w: 50, h: 25 },
                    { label: '2-Up (38×25)', up: 2, w: 38, h: 25 },
                    { label: '3-Up (32×19)', up: 3, w: 32, h: 19 },
                  ].map((preset) => (
                    <button
                      key={preset.up}
                      type="button"
                      onClick={() => {
                        setStickersPerRow(preset.up as any);
                        setStickerWidthMm(preset.w);
                        setStickerHeightMm(preset.h);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                        stickersPerRow === preset.up
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Received Items & Sticker Quantities:
                </h4>

                {stickerItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">{item.name}</div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>Barcode: {item.barcode}</span>
                        <span>• MRP: ₹{item.mrp}</span>
                        <span>• Sale: ₹{item.price}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <label className="text-[11px] font-semibold text-slate-600">Stickers:</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={item.qty}
                        onChange={(e) => {
                          const updated = [...stickerItems];
                          updated[idx].qty = Math.max(0, parseInt(e.target.value) || 0);
                          setStickerItems(updated);
                        }}
                        className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-center text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample Sticker Preview Box */}
              {stickerItems.length > 0 && (
                <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-900 text-white flex flex-col items-center justify-center space-y-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Sticker 1 of {totalStickerCount} Preview (Exact Scale):
                  </span>

                  <div 
                    style={{ width: '220px', height: '110px' }}
                    className="bg-white text-black p-2 rounded shadow-md border border-slate-300 flex flex-col justify-between font-sans select-none"
                  >
                    <div className="text-[8px] font-extrabold text-center uppercase border-b border-black pb-0.5 truncate leading-none">
                      {storeName}
                    </div>
                    <div className="text-center mt-0.5">
                      <div className="text-[9.5px] font-black uppercase truncate leading-none">
                        {stickerItems[0]?.name}
                      </div>
                      <div className="text-[7.5px] font-bold text-neutral-700 truncate mt-0.5 leading-none">
                        {stickerItems[0]?.unit}
                      </div>
                    </div>
                    <div className="flex justify-center my-0.5">
                      <BarcodeSvg 
                        value={stickerItems[0]?.barcode || '8901234567890'} 
                        width={1.1} 
                        height={20} 
                        fontSize={7.5} 
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-black pt-0.5 text-[8px] font-extrabold leading-none">
                      <span className="text-neutral-500 line-through">MRP: ₹{stickerItems[0]?.mrp}</span>
                      <span className="text-[10px] font-black">OUR: ₹{stickerItems[0]?.price}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>

              <div className="flex items-center space-x-2">
                <Link
                  href="/inventory/barcode-generator"
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition flex items-center space-x-1"
                >
                  <span>Advanced Generator</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={handlePrintModal}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition flex items-center space-x-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print All {totalStickerCount} Stickers (Ctrl + P)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 
        PRINT CONTAINER:
        Triggered when window.print() is called.
        Renders row by row based on the selected stickersPerRow (1-Up, 2-Up, or 3-Up).
      */}
      <div id="thermal-print-section" className="hidden print:block">
        {batchRows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="thermal-batch-row"
            style={{
              gap: `${gapMm}mm`
            }}
          >
            {row.map((item, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="thermal-batch-sticker"
              >
                {/* Store Header */}
                <div style={{ fontSize: '7pt', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', borderBottom: '0.6pt solid black', paddingBottom: '0.5pt', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {storeName || 'RETAIL'}
                </div>

                {/* Product Title */}
                <div style={{ textAlign: 'center', marginTop: '1pt' }}>
                  <div style={{ fontSize: stickerHeightMm < 22 ? '6.5pt' : '7.5pt', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '5.5pt', fontWeight: 700, lineHeight: 1, marginTop: '0.8pt', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {item.unit}
                  </div>
                </div>

                {/* Barcode SVG */}
                <div style={{ textAlign: 'center', margin: '0.5pt 0', display: 'flex', justifyContent: 'center' }}>
                  <BarcodeSvg 
                    value={item.barcode} 
                    width={stickerWidthMm < 36 ? 0.9 : 1.15} 
                    height={stickerHeightMm < 22 ? 14 : 18} 
                    fontSize={6.5} 
                  />
                </div>

                {/* Pricing Line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.6pt solid black', paddingTop: '0.5pt', lineHeight: 1 }}>
                  <span style={{ fontSize: '5.5pt', textDecoration: 'line-through', fontWeight: 600 }}>
                    MRP: ₹{item.mrp}
                  </span>
                  <span style={{ fontSize: stickerHeightMm < 22 ? '7.5pt' : '8.5pt', fontWeight: 900 }}>
                    OUR: ₹{item.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}
