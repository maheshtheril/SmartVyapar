'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Grid, 
  Layers, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowLeft, 
  Printer, 
  Tag, 
  Sparkles,
  Sliders,
  RefreshCw,
  ShoppingBag,
  Footprints,
  Shirt
} from 'lucide-react';
import BarcodeSvg from '@/components/BarcodeSvg';

interface GeneratedVariant {
  id: string;
  size: string;
  color: string;
  name: string;
  sku: string;
  barcode: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  stock: number;
  isSelected: boolean;
}

export default function VariantMatrixPage() {
  const router = useRouter();

  // Industry Preset: 'footwear' | 'textile' | 'custom'
  const [industry, setIndustry] = useState<'footwear' | 'textile' | 'custom'>('footwear');

  // Master Base Product Details
  const [brandName, setBrandName] = useState('Paragon');
  const [productTitle, setProductTitle] = useState('Walkstyle Comfort Slipper');
  const [category, setCategory] = useState('Footwear');
  const [hsnCode, setHsnCode] = useState('6402');
  const [baseUnit, setBaseUnit] = useState('PRS'); // PRS for footwear, PCS for textile
  const [baseCostPrice, setBaseCostPrice] = useState('180');
  const [baseSalePrice, setBaseSalePrice] = useState('299');
  const [baseMrp, setBaseMrp] = useState('399');
  const [gstRate, setGstRate] = useState('12');

  // Dimensions
  const [sizes, setSizes] = useState<string[]>(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10']);
  const [newSizeInput, setNewSizeInput] = useState('');

  const [colors, setColors] = useState<string[]>(['Black', 'Brown', 'Tan', 'Navy Blue']);
  const [newColorInput, setNewColorInput] = useState('');

  // Generated Matrix Rows
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [bulkStock, setBulkStock] = useState('4');

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);

  // Switch Industry Presets
  const handleSelectPreset = (preset: 'footwear' | 'textile' | 'custom') => {
    setIndustry(preset);
    setIsGenerated(false);
    setSaveSuccess(null);

    if (preset === 'footwear') {
      setBrandName('Paragon');
      setProductTitle('Walkstyle Comfort Slipper');
      setCategory('Footwear');
      setHsnCode('6402');
      setBaseUnit('PRS');
      setBaseCostPrice('180');
      setBaseSalePrice('299');
      setBaseMrp('399');
      setGstRate('12');
      setSizes(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10']);
      setColors(['Black', 'Brown', 'Tan', 'Navy Blue']);
    } else if (preset === 'textile') {
      setBrandName('Raymond');
      setProductTitle("Men's Formal Cotton Shirt");
      setCategory('Textiles & Garments');
      setHsnCode('6205');
      setBaseUnit('PCS');
      setBaseCostPrice('450');
      setBaseSalePrice('899');
      setBaseMrp('1299');
      setGstRate('5');
      setSizes(['S (38)', 'M (40)', 'L (42)', 'XL (44)', 'XXL (46)']);
      setColors(['White', 'Sky Blue', 'Light Grey', 'Navy Blue', 'Maroon']);
    }
  };

  // Add / Remove Sizes & Colors
  const handleAddSize = () => {
    const trimmed = newSizeInput.trim();
    if (trimmed && !sizes.includes(trimmed)) {
      setSizes([...sizes, trimmed]);
      setNewSizeInput('');
    }
  };

  const handleRemoveSize = (size: string) => {
    setSizes(sizes.filter((s) => s !== size));
  };

  const handleAddColor = () => {
    const trimmed = newColorInput.trim();
    if (trimmed && !colors.includes(trimmed)) {
      setColors([...colors, trimmed]);
      setNewColorInput('');
    }
  };

  const handleRemoveColor = (color: string) => {
    setColors(colors.filter((c) => c !== color));
  };

  // Helper to generate a unique 13-digit EAN/Code128 barcode
  const generateBarcode = (index: number) => {
    // Standard Indian prefix 890 + timestamp millis last 6 + 4-digit row index
    const timeSnippet = (Date.now() % 1000000).toString().padStart(6, '0');
    const idxSnippet = (index + 1).toString().padStart(4, '0');
    return `890${timeSnippet}${idxSnippet}`;
  };

  // Helper to generate short clean SKU
  const generateSku = (brand: string, size: string, color: string) => {
    const bCode = (brand || 'PROD').slice(0, 3).toUpperCase();
    const sCode = size.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    const cCode = color.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3);
    return `${bCode}-${sCode}-${cCode}`;
  };

  // Generate Matrix
  const handleGenerateMatrix = () => {
    if (sizes.length === 0 || colors.length === 0) {
      alert('Please add at least one Size and one Color.');
      return;
    }

    const rows: GeneratedVariant[] = [];
    let counter = 0;

    sizes.forEach((size) => {
      colors.forEach((color) => {
        counter++;
        const fullName = `${brandName} ${productTitle} - ${size} / ${color}`.trim();
        const sku = generateSku(brandName, size, color);
        const barcode = generateBarcode(counter);

        // Price surcharge logic: XXL or large sizes can optionally have slight increase
        const isExtraLarge = size.includes('XXL') || size.includes('3XL') || size.includes('11');
        const cost = Number(baseCostPrice) + (isExtraLarge ? 20 : 0);
        const price = Number(baseSalePrice) + (isExtraLarge ? 50 : 0);
        const mrpValue = Number(baseMrp) + (isExtraLarge ? 50 : 0);

        rows.push({
          id: `var-${counter}-${Date.now()}`,
          size,
          color,
          name: fullName,
          sku,
          barcode,
          purchasePrice: cost,
          sellingPrice: price,
          mrp: mrpValue,
          stock: Number(bulkStock) || 4,
          isSelected: true,
        });
      });
    });

    setVariants(rows);
    setIsGenerated(true);
    setSaveSuccess(null);
  };

  // Bulk Apply Stock to all selected variants
  const handleApplyBulkStock = (newVal: string) => {
    setBulkStock(newVal);
    const num = Number(newVal) || 0;
    setVariants((prev) =>
      prev.map((v) => (v.isSelected ? { ...v, stock: num } : v))
    );
  };

  // Toggle All Selection
  const handleToggleSelectAll = (checked: boolean) => {
    setVariants((prev) => prev.map((v) => ({ ...v, isSelected: checked })));
  };

  // Update Individual Row Cell
  const handleUpdateRow = (id: string, field: keyof GeneratedVariant, value: any) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // Save All Selected Variants to Neon DB
  const handleSaveToNeonDb = async () => {
    const selected = variants.filter((v) => v.isSelected);
    if (selected.length === 0) {
      alert('Please select at least one variant to save.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        variants: selected.map((v) => ({
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          hsnCode: hsnCode || '6402',
          category: category || 'General',
          baseUnit: baseUnit || 'PCS',
          purchasePrice: v.purchasePrice,
          sellingPrice: v.sellingPrice,
          mrp: v.mrp,
          gstRate: Number(gstRate) || 12,
          initialStock: v.stock,
          minStockAlert: 2,
        })),
      };

      const res = await fetch('/api/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save variants in batch');
      }

      setSaveSuccess(data.count);
    } catch (err: any) {
      alert('Error saving variants: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = variants.filter((v) => v.isSelected).length;
  const totalStockSum = variants
    .filter((v) => v.isSelected)
    .reduce((acc, v) => acc + (Number(v.stock) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/inventory"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Grid className="h-6 w-6 text-indigo-600" />
              <span>Item Matrix / Variant Generator</span>
            </h1>
            <p className="text-xs text-slate-500">
              Bulk Size × Color generation for Footwear, Chappal, and Textile / Garment shops
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/inventory/barcode-generator"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition flex items-center space-x-1.5"
          >
            <Printer className="h-4 w-4 text-indigo-600" />
            <span>Barcode Printer</span>
          </Link>
        </div>
      </div>

      {/* Success Notification Banner with Direct Barcode Print Link */}
      {saveSuccess !== null && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">
                Success! {saveSuccess} Variants Created in Neon DB
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Total opening stock of {totalStockSum} {baseUnit} logged into Inventory Audit Ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Link
              href="/inventory/barcode-generator"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print Barcode Thermal Stickers Now →</span>
            </Link>
            <Link
              href="/inventory"
              className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition"
            >
              View in Catalog
            </Link>
          </div>
        </div>
      )}

      {/* Preset Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          1. Select Industry / Product Preset
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Footwear Preset */}
          <button
            type="button"
            onClick={() => handleSelectPreset('footwear')}
            className={`p-4 rounded-2xl border text-left transition flex items-start space-x-3 ${
              industry === 'footwear'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${industry === 'footwear' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Footprints className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Footwear & Chappals</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                UK Sizes 6-10, Leather/PU colors, HSN 6402, GST 12%
              </div>
            </div>
          </button>

          {/* Textile / Apparel Preset */}
          <button
            type="button"
            onClick={() => handleSelectPreset('textile')}
            className={`p-4 rounded-2xl border text-left transition flex items-start space-x-3 ${
              industry === 'textile'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${industry === 'textile' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Shirt className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Textiles & Garments</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Sizes S-XXL, Cotton shades, HSN 6205, GST 5%
              </div>
            </div>
          </button>

          {/* Custom Matrix */}
          <button
            type="button"
            onClick={() => handleSelectPreset('custom')}
            className={`p-4 rounded-2xl border text-left transition flex items-start space-x-3 ${
              industry === 'custom'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${industry === 'custom' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Custom Attributes</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Custom sizes, colors, capacity, or specifications
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Base Master Product Details & Attribute Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Columns: Master Product & Pricing Info */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            2. Master Product Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Bata, Paragon, Raymond"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Model / Title</label>
              <input
                type="text"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="e.g. Casual Flip-Flop, Slim Fit Shirt"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Base Unit</label>
              <select
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="PRS">PRS (Pairs - Shoes/Chappal)</option>
                <option value="PCS">PCS (Pieces - Textiles/Apparel)</option>
                <option value="NOS">NOS (Numbers)</option>
                <option value="SET">SET (Sets)</option>
              </select>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (₹)</label>
              <input
                type="number"
                value={baseCostPrice}
                onChange={(e) => setBaseCostPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sale Price (₹)</label>
              <input
                type="number"
                value={baseSalePrice}
                onChange={(e) => setBaseSalePrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">MRP (₹)</label>
              <input
                type="number"
                value={baseMrp}
                onChange={(e) => setBaseMrp(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="5">5% (Textiles &lt;₹1000)</option>
                <option value="12">12% (Footwear &gt;₹1000)</option>
                <option value="18">18% (Standard)</option>
                <option value="0">0% (Nil)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right 6 Columns: Dimension Attributes (Sizes & Colors) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            3. Matrix Dimensions (Sizes × Colors)
          </div>

          {/* Sizes Tag Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Sizes ({sizes.length})
              </label>
              <span className="text-[11px] text-slate-400">Click × to remove</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 min-h-[44px]">
              {sizes.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center space-x-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100 shadow-xs"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSize(s)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="text"
                value={newSizeInput}
                onChange={(e) => setNewSizeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSize())}
                placeholder="Type size and press Enter (e.g. UK 11, 44, XXL)"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSize}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Colors Tag Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Colors ({colors.length})
              </label>
              <span className="text-[11px] text-slate-400">Click × to remove</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 min-h-[44px]">
              {colors.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center space-x-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200 shadow-xs"
                >
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(c)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="text"
                value={newColorInput}
                onChange={(e) => setNewColorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddColor())}
                placeholder="Type color and press Enter (e.g. Olive, Beige, Grey)"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddColor}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Trigger Generate Button */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              Will generate: <strong>{sizes.length} × {colors.length} = {sizes.length * colors.length} Variants</strong>
            </div>
            <button
              type="button"
              onClick={handleGenerateMatrix}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Matrix Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Generated Matrix Grid Table */}
      {isGenerated && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-sm md:text-base flex items-center space-x-2">
                <span>Generated Variant Matrix</span>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  {selectedCount} of {variants.length} selected
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Review SKUs, unique EAN/Code128 barcodes, and opening stock counts before saving.
              </p>
            </div>

            {/* Bulk Stock Controls & Save Button */}
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <span>Set All Stock:</span>
                <input
                  type="number"
                  value={bulkStock}
                  onChange={(e) => handleApplyBulkStock(e.target.value)}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-center"
                />
              </div>

              <button
                type="button"
                disabled={isSaving || selectedCount === 0}
                onClick={handleSaveToNeonDb}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition flex items-center space-x-1.5 ${
                  isSaving || selectedCount === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving to Neon DB...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save {selectedCount} Variants to Neon DB</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedCount === variants.length && variants.length > 0}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Variant Name</th>
                  <th className="px-3 py-2.5 font-semibold">Size</th>
                  <th className="px-3 py-2.5 font-semibold">Color</th>
                  <th className="px-3 py-2.5 font-semibold">SKU</th>
                  <th className="px-3 py-2.5 font-semibold">Barcode</th>
                  <th className="px-3 py-2.5 font-semibold">Cost (₹)</th>
                  <th className="px-3 py-2.5 font-semibold">Sale (₹)</th>
                  <th className="px-3 py-2.5 font-semibold">MRP (₹)</th>
                  <th className="px-3 py-2.5 font-semibold">Initial Stock</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Barcode Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variants.map((v) => (
                  <tr
                    key={v.id}
                    className={`hover:bg-slate-50 transition ${
                      !v.isSelected ? 'opacity-40 bg-slate-50/50' : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={v.isSelected}
                        onChange={(e) => handleUpdateRow(v.id, 'isSelected', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900 max-w-[200px] truncate">
                      {v.name}
                    </td>
                    <td className="px-3 py-2 font-bold text-indigo-600">{v.size}</td>
                    <td className="px-3 py-2 font-medium text-slate-700">{v.color}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleUpdateRow(v.id, 'sku', e.target.value)}
                        className="w-28 rounded border border-slate-200 px-1.5 py-0.5 text-xs font-mono font-bold"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={v.barcode}
                        onChange={(e) => handleUpdateRow(v.id, 'barcode', e.target.value)}
                        className="w-32 rounded border border-slate-200 px-1.5 py-0.5 text-xs font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.purchasePrice}
                        onChange={(e) =>
                          handleUpdateRow(v.id, 'purchasePrice', Number(e.target.value))
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.sellingPrice}
                        onChange={(e) =>
                          handleUpdateRow(v.id, 'sellingPrice', Number(e.target.value))
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs font-bold text-emerald-700"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.mrp}
                        onChange={(e) =>
                          handleUpdateRow(v.id, 'mrp', Number(e.target.value))
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.stock}
                        onChange={(e) =>
                          handleUpdateRow(v.id, 'stock', Number(e.target.value))
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs font-bold text-indigo-700"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="inline-block scale-75 origin-center">
                        <BarcodeSvg
                          value={v.barcode}
                          width={1.0}
                          height={18}
                          fontSize={7}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
