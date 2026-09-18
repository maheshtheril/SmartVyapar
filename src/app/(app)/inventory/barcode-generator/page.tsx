'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Tag, 
  Sparkles, 
  Sliders, 
  ArrowLeft, 
  Box,
  Layers,
  Settings,
  Grid,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import BarcodeSvg from '@/components/BarcodeSvg';

export default function BarcodeGeneratorPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Sticker Content States
  const [storeName, setStoreName] = useState('ZIONA RETAIL');
  const [itemName, setItemName] = useState('Gents Comfort Sandal');
  const [variantText, setVariantText] = useState('Size: 08 | Color: Tan');
  const [barcodeValue, setBarcodeValue] = useState('8901234567890');
  const [mrp, setMrp] = useState('899');
  const [sellingPrice, setSellingPrice] = useState('599');
  const [printCount, setPrintCount] = useState(10);

  // Field Toggles
  const [showStoreName, setShowStoreName] = useState(true);
  const [showVariant, setShowVariant] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showSalePrice, setShowSalePrice] = useState(true);

  // Custom Sticker Geometry & Roll Settings
  const [stickersPerRow, setStickersPerRow] = useState<1 | 2 | 3 | 'a4'>(1);
  const [stickerWidthMm, setStickerWidthMm] = useState(50);
  const [stickerHeightMm, setStickerHeightMm] = useState(25);
  const [gapMm, setGapMm] = useState(2); // Gap between stickers on 2-up / 3-up rolls
  const [activePreset, setActivePreset] = useState<string>('50x25_1up');

  // Load live products from Neon DB
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success && data.products) {
          setProducts(data.products);
          if (data.tenant?.businessName) {
            setStoreName(data.tenant.businessName.toUpperCase());
          }
          if (data.products.length > 0) {
            const first = data.products[0];
            setSelectedProductId(first.id);
            setItemName(first.name);
            setBarcodeValue(first.barcode || first.sku || '8901234567890');
            setMrp(first.mrp ? String(first.mrp) : String(first.sellingPrice));
            setSellingPrice(String(first.sellingPrice));
            setPrintCount(Math.max(1, Math.min(50, Math.floor(Number(first.currentStock || 10)))));
          }
        }
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const handleProductSelect = (pId: string) => {
    setSelectedProductId(pId);
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setItemName(prod.name);
      setBarcodeValue(prod.barcode || prod.sku || `890${Date.now().toString().slice(-10)}`);
      setMrp(prod.mrp ? String(prod.mrp) : String(prod.sellingPrice));
      setSellingPrice(String(prod.sellingPrice));
      if (prod.category) {
        setVariantText(`Cat: ${prod.category} | HSN: ${prod.hsnCode}`);
      }
      setPrintCount(Math.max(1, Math.min(50, Math.floor(Number(prod.currentStock || 1)))));
    }
  };

  // Preset Handlers
  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    switch (presetKey) {
      case '50x25_1up':
        setStickersPerRow(1);
        setStickerWidthMm(50);
        setStickerHeightMm(25);
        setGapMm(0);
        break;
      case '38x25_2up':
        setStickersPerRow(2);
        setStickerWidthMm(38);
        setStickerHeightMm(25);
        setGapMm(2);
        break;
      case '38x25_1up':
        setStickersPerRow(1);
        setStickerWidthMm(38);
        setStickerHeightMm(25);
        setGapMm(0);
        break;
      case '32x19_3up':
        setStickersPerRow(3);
        setStickerWidthMm(32);
        setStickerHeightMm(19);
        setGapMm(2);
        break;
      case '100x50_1up':
        setStickersPerRow(1);
        setStickerWidthMm(100);
        setStickerHeightMm(50);
        setGapMm(0);
        break;
      case 'a4_grid':
        setStickersPerRow('a4');
        setStickerWidthMm(63.5);
        setStickerHeightMm(38.1);
        setGapMm(2.5);
        break;
      case 'custom':
        // Keep existing custom values
        break;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Chunk items into rows for 1-Up, 2-Up, or 3-Up rolls
  const totalLabels = Array.from({ length: Math.max(1, printCount) });
  const upCount = stickersPerRow === 'a4' ? 3 : stickersPerRow;
  const rollRows: number[][] = [];
  for (let i = 0; i < totalLabels.length; i += upCount) {
    const rowItems = [];
    for (let j = 0; j < upCount; j++) {
      if (i + j < totalLabels.length) {
        rowItems.push(i + j);
      }
    }
    rollRows.push(rowItems);
  }

  // Calculate total roll width
  const totalRollWidthMm = stickersPerRow === 'a4' 
    ? 210 
    : (stickerWidthMm * Number(upCount)) + (gapMm * (Number(upCount) - 1));

  return (
    <div className="space-y-6">
      {/* Dynamic Print CSS for Thermal Roll / A4 Sheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          @page {
            size: ${stickersPerRow === 'a4' 
              ? 'A4 portrait' 
              : `${totalRollWidthMm}mm ${stickerHeightMm}mm`};
            margin: 0;
          }
          .thermal-roll-row {
            width: ${stickersPerRow === 'a4' ? 'auto' : `${totalRollWidthMm}mm`};
            height: ${`${stickerHeightMm}mm`};
            page-break-after: always;
            break-after: page;
            display: flex;
            justify-content: ${upCount === 1 ? 'center' : 'space-between'};
            box-sizing: border-box;
            margin: ${stickersPerRow === 'a4' ? '2mm auto' : '0 auto'};
            overflow: hidden;
          }
        }
      `}</style>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/inventory" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Tag className="h-6 w-6 text-indigo-600" />
              <span>Thermal Barcode Sticker & Roll Customizer</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure custom sticker sizes (mm), 1-Up / 2-Up / 3-Up roll formats, and print continuous rolls
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition flex items-center space-x-2"
        >
          <Printer className="h-4 w-4" />
          <span>Print {printCount} Sticker{printCount > 1 ? 's' : ''} ({rollRows.length} Rows)</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
        
        {/* Left Column: Roll Geometry & Sticker Content */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Section 1: Roll Type & Preset Selector */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>1. Sticker Roll Geometry & Layout</span>
              </span>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {stickersPerRow === 'a4' ? 'A4 Sheet' : `${stickersPerRow}-Up Roll (${totalRollWidthMm}mm Roll)`}
              </span>
            </h2>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: '50x25_1up', label: '50×25 mm (1-Up)', sub: 'Footwear & Garments' },
                { id: '38x25_2up', label: '38×25 mm (2-Up)', sub: 'Supermarket Twin Roll' },
                { id: '38x25_1up', label: '38×25 mm (1-Up)', sub: 'Compact Retail' },
                { id: '32x19_3up', label: '32×19 mm (3-Up)', sub: 'Jewelry & Pharmacy' },
                { id: '100x50_1up', label: '100×50 mm (1-Up)', sub: 'Carton / Box Label' },
                { id: 'a4_grid', label: 'A4 Sheet Grid', sub: '24 per page (3×8)' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    activePreset === p.id 
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className={`text-xs font-bold ${activePreset === p.id ? 'text-indigo-950' : 'text-slate-800'}`}>
                    {p.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.sub}</div>
                </button>
              ))}
            </div>

            {/* Custom Dimension Inputs */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                <span>Custom Dimensions & Multi-Up Adjustments:</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    min="20"
                    max="150"
                    value={stickerWidthMm}
                    onChange={(e) => {
                      setStickerWidthMm(Number(e.target.value));
                      setActivePreset('custom');
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Height (mm)</label>
                  <input
                    type="number"
                    min="15"
                    max="150"
                    value={stickerHeightMm}
                    onChange={(e) => {
                      setStickerHeightMm(Number(e.target.value));
                      setActivePreset('custom');
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Per Row (Up)</label>
                  <select
                    value={stickersPerRow}
                    onChange={(e: any) => {
                      setStickersPerRow(e.target.value === 'a4' ? 'a4' : Number(e.target.value) as any);
                      setActivePreset('custom');
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value={1}>1-Up (Single)</option>
                    <option value={2}>2-Up (Twin)</option>
                    <option value={3}>3-Up (Triple)</option>
                    <option value="a4">A4 Sheet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gap (mm)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={gapMm}
                    onChange={(e) => {
                      setGapMm(Number(e.target.value));
                      setActivePreset('custom');
                    }}
                    disabled={stickersPerRow === 1}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Product & Text Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-indigo-600" />
              <span>2. Sticker Content & Values</span>
            </h2>

            {/* Select Item from Catalog */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Item from Catalog (Auto-Fills Details)
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
              >
                <option value="">-- Select Catalog Item or Enter Custom Below --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {Number(p.currentStock)} {p.baseUnit || 'PCS'} • ₹{p.sellingPrice})
                  </option>
                ))}
              </select>
            </div>

            {/* Store Name Header */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">Store / Brand Header</label>
                <label className="flex items-center space-x-1 text-[11px] text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Show</span>
                </label>
              </div>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. ZIONA FOOTWEAR & TEXTILES"
                disabled={!showStoreName}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Item Description *</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Men Daily Walk Sandal - Tan"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Variant / Size / Color */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">Size / Variant Line</label>
                  <label className="flex items-center space-x-1 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showVariant}
                      onChange={(e) => setShowVariant(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Show</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={variantText}
                  onChange={(e) => setVariantText(e.target.value)}
                  placeholder="e.g. Size: 08 | Color: Tan"
                  disabled={!showVariant}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Barcode / SKU *</label>
                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">MRP (₹)</label>
                  <label className="flex items-center space-x-1 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMrp}
                      onChange={(e) => setShowMrp(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Show</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="899"
                  disabled={!showMrp}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none text-slate-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">Our Sale Price (₹) *</label>
                  <label className="flex items-center space-x-1 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSalePrice}
                      onChange={(e) => setShowSalePrice(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Show</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="599"
                  disabled={!showSalePrice}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-emerald-700 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Total Count */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Total Number of Stickers to Print
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={printCount}
                onChange={(e) => setPrintCount(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Will produce {rollRows.length} continuous roll rows ({upCount} sticker{upCount > 1 ? 's' : ''} per row)
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Multi-Up Roll Visualizer */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-900 text-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center space-x-2 text-slate-100">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Live Thermal Roll Preview ({stickersPerRow === 'a4' ? 'A4 Grid' : `${stickersPerRow}-Up Roll`})</span>
              </h2>
              <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded border border-slate-700">
                {stickerWidthMm}mm × {stickerHeightMm}mm (Gap: {gapMm}mm)
              </span>
            </div>

            {/* Multi-Up Roll Container on Dark Backing */}
            <div className="p-6 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-3 overflow-x-auto">
              <div className="text-[10px] text-slate-400 font-mono">
                ← Thermal Roll Width: ~{totalRollWidthMm}mm →
              </div>

              {/* Simulated Thermal Roll Backing Paper */}
              <div 
                style={{ 
                  width: `${Math.min(420, totalRollWidthMm * 3.6)}px`,
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  padding: '10px 8px',
                  border: '1px solid #cbd5e1'
                }}
                className="shadow-2xl"
              >
                {/* 1st Row of Stickers */}
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: upCount === 1 ? 'center' : 'space-between',
                    gap: `${gapMm * 3}px`
                  }}
                >
                  {Array.from({ length: Number(upCount) }).map((_, colIdx) => (
                    <div 
                      key={colIdx}
                      style={{ 
                        flex: 1, 
                        minHeight: `${Math.min(130, stickerHeightMm * 4.2)}px`,
                        padding: '6px'
                      }}
                      className="bg-white text-black rounded border border-slate-300 shadow-sm flex flex-col justify-between select-none relative overflow-hidden font-sans"
                    >
                      {/* Store Name */}
                      {showStoreName && (
                        <div className="text-[8px] font-black tracking-wider text-center uppercase border-b border-black/80 pb-0.5 truncate leading-none">
                          {storeName || 'RETAIL STORE'}
                        </div>
                      )}

                      {/* Product Name & Variant */}
                      <div className="text-center mt-0.5">
                        <div className="text-[9px] font-black uppercase truncate leading-none">
                          {itemName || 'PRODUCT NAME'}
                        </div>
                        {showVariant && variantText && (
                          <div className="text-[7.5px] font-bold text-neutral-800 truncate mt-0.5 leading-none">
                            {variantText}
                          </div>
                        )}
                      </div>

                      {/* Barcode SVG */}
                      <div className="flex justify-center my-0.5">
                        <BarcodeSvg 
                          value={barcodeValue || '8901234567890'} 
                          width={stickerWidthMm < 40 ? 0.9 : 1.15} 
                          height={stickerHeightMm < 22 ? 16 : 22} 
                          fontSize={7.5} 
                        />
                      </div>

                      {/* Pricing Footer */}
                      <div className="flex items-center justify-between border-t border-black/80 pt-0.5 text-[8px] leading-none font-black">
                        {showMrp && mrp && Number(mrp) > Number(sellingPrice) ? (
                          <div className="text-[7.5px] text-neutral-600 line-through">
                            MRP: ₹{mrp}
                          </div>
                        ) : (
                          <div className="text-[6.5px] uppercase">INCL. TAX</div>
                        )}
                        {showSalePrice && (
                          <div className="text-[10px] font-black tracking-tight text-right">
                            OUR: ₹{sellingPrice || '0'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Perforation Line Indicator */}
                <div className="my-2 border-b border-dashed border-slate-400/60" />

                {/* 2nd Row preview (subtle) */}
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: upCount === 1 ? 'center' : 'space-between',
                    gap: `${gapMm * 3}px`,
                    opacity: 0.55
                  }}
                >
                  {Array.from({ length: Number(upCount) }).map((_, colIdx) => (
                    <div 
                      key={`next-${colIdx}`}
                      style={{ 
                        flex: 1, 
                        minHeight: `${Math.min(130, stickerHeightMm * 4.2)}px`,
                        padding: '6px'
                      }}
                      className="bg-white text-black rounded border border-slate-300 shadow-sm flex flex-col justify-between select-none relative overflow-hidden font-sans"
                    >
                      {showStoreName && (
                        <div className="text-[8px] font-black text-center uppercase border-b border-black/60 pb-0.5 truncate leading-none">
                          {storeName}
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-[8.5px] font-black uppercase truncate leading-none">{itemName}</div>
                      </div>
                      <div className="h-4 bg-neutral-200 rounded mx-auto w-3/4 my-1" />
                      <div className="flex justify-between border-t border-black/60 pt-0.5 text-[8px] font-bold">
                        <span>MRP: ₹{mrp}</span>
                        <span>OUR: ₹{sellingPrice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-400">
                Continuous Roll Feed • Perforated between rows
              </div>
            </div>

            {/* Hardware Compatibility */}
            <div className="text-[11px] text-slate-400 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1">
              <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <Box className="h-3.5 w-3.5 text-indigo-400" />
                <span>Multi-Up Hardware Compatibility:</span>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Seamlessly works on <strong>TVS, TSC, Zebra, Xprinter, Citizen, and Godex</strong> thermal printers. The printer driver handles 2-Up & 3-Up rolls continuously without paper feed jams.
              </p>
            </div>

            <button
              onClick={handlePrint}
              className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition flex items-center justify-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print {printCount} Stickers on {totalRollWidthMm}mm Roll (Ctrl + P)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 
        PRINT CONTAINER:
        Runs when window.print() is executed.
        Renders row by row based on the stickersPerRow up-count.
      */}
      <div id="print-area" className="hidden print:block">
        {rollRows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="thermal-roll-row"
            style={{
              gap: `${gapMm}mm`
            }}
          >
            {row.map((stickerIdx) => (
              <div
                key={stickerIdx}
                style={{
                  width: `${stickerWidthMm}mm`,
                  height: `${stickerHeightMm}mm`,
                  padding: '1mm 1.5mm',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  background: 'white',
                  color: 'black',
                  border: stickersPerRow === 'a4' ? '0.3pt solid #e2e8f0' : 'none'
                }}
              >
                {/* Store Header */}
                {showStoreName && (
                  <div style={{ fontSize: '7pt', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', borderBottom: '0.6pt solid black', paddingBottom: '0.5pt', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {storeName || 'RETAIL'}
                  </div>
                )}

                {/* Title & Size */}
                <div style={{ textAlign: 'center', marginTop: '1pt' }}>
                  <div style={{ fontSize: stickerHeightMm < 22 ? '6.5pt' : '7.5pt', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {itemName || 'ITEM'}
                  </div>
                  {showVariant && variantText && (
                    <div style={{ fontSize: '5.5pt', fontWeight: 700, lineHeight: 1, marginTop: '0.8pt', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {variantText}
                    </div>
                  )}
                </div>

                {/* Barcode SVG */}
                <div style={{ textAlign: 'center', margin: '0.5pt 0', display: 'flex', justifyContent: 'center' }}>
                  <BarcodeSvg 
                    value={barcodeValue || '8901234567890'} 
                    width={stickerWidthMm < 36 ? 0.9 : 1.15} 
                    height={stickerHeightMm < 22 ? 14 : 18} 
                    fontSize={6.5} 
                  />
                </div>

                {/* Price Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.6pt solid black', paddingTop: '0.5pt', lineHeight: 1 }}>
                  {showMrp && mrp && Number(mrp) > Number(sellingPrice) ? (
                    <span style={{ fontSize: '5.5pt', textDecoration: 'line-through', fontWeight: 600 }}>
                      MRP: ₹{mrp}
                    </span>
                  ) : (
                    <span style={{ fontSize: '5pt', textTransform: 'uppercase' }}>INCL. TAX</span>
                  )}
                  {showSalePrice && (
                    <span style={{ fontSize: stickerHeightMm < 22 ? '7.5pt' : '8.5pt', fontWeight: 900 }}>
                      OUR: ₹{sellingPrice || '0'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}
