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
}

export default function ProductSearchCombobox({
  products,
  selectedProductId,
  onSelect,
  placeholder = "Search product name, SKU, or barcode...",
}: ProductSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          p.hsnCode.includes(q)
        );
      }).slice(0, 50);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={isOpen ? query : (selectedProduct ? `${selectedProduct.name} (Stock: ${selectedProduct.currentStock})` : "")}
          placeholder={selectedProduct ? selectedProduct.name : placeholder}
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
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
            filtered.map((prod) => {
              const isSelected = prod.id === selectedProductId;
              const isLow = prod.currentStock <= prod.minStockAlert;
              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    onSelect(prod);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition ${
                    isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="truncate font-semibold text-slate-900 flex items-center space-x-1.5">
                      <span>{prod.name}</span>
                      {isLow && (
                        <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-600 inline-flex items-center space-x-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          <span>{prod.currentStock} left</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      HSN: {prod.hsnCode} • Stock: {prod.currentStock} • GST: {prod.gstRate}%
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900">₹{Number(prod.sellingPrice).toFixed(2)}</div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 ml-auto" />}
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
