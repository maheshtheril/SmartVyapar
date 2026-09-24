'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Check, AlertTriangle, X, ChevronDown } from 'lucide-react';

export interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  hsnCode: string;
  sellingPrice: number;
  gstRate: number;
  currentStock: number;
  minStockAlert: number;
}

interface ProductSearchComboboxProps {
  products: ProductOption[];
  selectedProductId: string;
  onSelect: (product: ProductOption | null) => void;
  placeholder?: string;
  onBarcodeScan?: (product: ProductOption) => void;
  autoClearOnSelect?: boolean;
}

export default function ProductSearchCombobox({
  products,
  selectedProductId,
  onSelect,
  placeholder = "Search product name, SKU, or barcode (F1)...",
  onBarcodeScan,
  autoClearOnSelect = false,
}: ProductSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter 100s or 1000s of products by name, barcode, sku, or hsn
  const filtered = query.trim() === ""
    ? products.slice(0, 50) // Show first 50 when empty
    : products.filter((p) => {
        const q = query.toLowerCase();
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.hsnCode && p.hsnCode.includes(q))
        );
      }).slice(0, 50);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // Handle immediate selection (used for scan or click)
  const commitSelect = (prod: ProductOption) => {
    if (onBarcodeScan) {
      onBarcodeScan(prod);
    } else {
      onSelect(prod);
    }
    if (autoClearOnSelect) {
      setQuery("");
    }
    setIsOpen(false);
  };

  // Keyboard navigation & Barcode Gun Enter handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // 1. Check exact barcode match first (barcode scanner gun fires text + Enter)
      const trimmed = query.trim();
      if (trimmed) {
        const exactBarcode = products.find(
          (p) => p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()
        );
        if (exactBarcode) {
          commitSelect(exactBarcode);
          return;
        }

        const exactSku = products.find(
          (p) => p.sku && p.sku.toLowerCase() === trimmed.toLowerCase()
        );
        if (exactSku) {
          commitSelect(exactSku);
          return;
        }
      }

      // 2. Select currently highlighted item
      if (filtered.length > 0 && highlightIndex >= 0 && highlightIndex < filtered.length) {
        commitSelect(filtered[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={isOpen ? query : (selectedProduct ? `[${selectedProduct.sku || 'No SKU'}] ${selectedProduct.name} (Qty: ${selectedProduct.currentStock})` : "")}
          placeholder={selectedProduct ? `[${selectedProduct.sku}] ${selectedProduct.name}` : placeholder}
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-lg border pl-8 pr-14 py-1.5 text-xs font-medium focus:border-indigo-500 focus:outline-none transition ${
            selectedProduct ? 'bg-white border-slate-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-500'
          }`}
        />

        <div className="absolute right-2 flex items-center space-x-1">
          {selectedProduct && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setQuery("");
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              No products found matching &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((prod, idx) => {
              const isSelected = prod.id === selectedProductId;
              const isHighlighted = idx === highlightIndex;
              const isLow = prod.currentStock <= prod.minStockAlert;
              return (
                <div
                  key={prod.id}
                  onClick={() => commitSelect(prod)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition ${
                    isHighlighted
                      ? 'bg-indigo-600 text-white font-medium'
                      : isSelected
                      ? 'bg-indigo-50 text-indigo-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className={`truncate font-semibold flex flex-wrap items-center gap-1.5 ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                      {prod.sku && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight border ${
                          isHighlighted ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-50 border-slate-200 text-indigo-700'
                        }`}>
                          {prod.sku}
                        </span>
                      )}
                      <span>{prod.name}</span>
                      {isLow && (
                        <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold inline-flex items-center space-x-0.5 ${
                          isHighlighted ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'
                        }`}>
                          <AlertTriangle className="h-2.5 w-2.5" />
                          <span>{prod.currentStock} left</span>
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 ${isHighlighted ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {prod.barcode && (
                        <span className="font-mono tracking-wider flex items-center gap-1">
                          <span className="opacity-70">BC:</span> {prod.barcode}
                        </span>
                      )}
                      <span>HSN: {prod.hsnCode}</span>
                      <span>Stock: {prod.currentStock}</span>
                      <span>GST: {prod.gstRate}%</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-bold ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                      ₹{Number(prod.sellingPrice).toFixed(2)}
                    </div>
                    {isSelected && !isHighlighted && <Check className="h-3.5 w-3.5 text-indigo-600 ml-auto" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
