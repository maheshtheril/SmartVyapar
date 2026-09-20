'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, Check, ChevronDown, Plus, Search, X } from 'lucide-react';

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  stateCode?: string;
  outstandingBalance: number;
}

interface CustomerSearchProps {
  customerName: string;
  customerPhone: string;
  onSelectCustomer: (cust: CustomerOption | null) => void;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  isDark?: boolean;
}

export default function CustomerSearch({
  customerName,
  customerPhone,
  onSelectCustomer,
  onNameChange,
  onPhoneChange,
  isDark = false,
}: CustomerSearchProps) {
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Pre-load all existing customers from Neon DB
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/customers");
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          setAllCustomers(data.customers);
          setFilteredCustomers(data.customers);
        }
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    }
    fetchCustomers();
  }, []);

  // Filter list as user searches
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(allCustomers);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredCustomers(
        allCustomers.filter(
          (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
        )
      );
    }
  }, [searchQuery, allCustomers]);

  // Outside click listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (cust: CustomerOption) => {
    onSelectCustomer(cust);
    onNameChange(cust.name);
    onPhoneChange(cust.phone);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleSelectCashWalkIn = () => {
    onSelectCustomer({
      id: "walk-in",
      name: "Cash / Walk-in Customer",
      phone: "0000000000",
      stateCode: "32",
      outstandingBalance: 0,
    });
    onNameChange("Cash / Walk-in Customer");
    onPhoneChange("0000000000");
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onSelectCustomer(null);
    onNameChange("");
    onPhoneChange("");
  };

  const isPhoneValid = customerPhone && customerPhone.replace(/\D/g, '').length >= 10;

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Customer Dropdown / Selector */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Customer Name / Search
            </label>
            {customerName && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Visible Dropdown Button */}
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full rounded-xl border px-3 py-2 text-xs flex items-center justify-between cursor-pointer shadow-sm transition ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-white hover:border-indigo-500' 
                : 'bg-white border-slate-300 text-slate-900 hover:border-indigo-500'
            }`}
          >
            <div className="flex items-center space-x-2 truncate">
              <User className={`h-4 w-4 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span className={`truncate font-bold ${
                customerName 
                  ? (isDark ? 'text-white' : 'text-slate-900') 
                  : (isDark ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal')
              }`}>
                {customerName || "-- Select or Search Customer --"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          </div>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className={`absolute left-0 top-full z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border shadow-2xl flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              {/* Quick Search inside Dropdown */}
              <div className={`p-2 border-b ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Type name or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' 
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                    autoFocus
                  />
                </div>
              </div>

              {/* Customer List */}
              <div className="overflow-y-auto max-h-52 p-1.5 space-y-1">
                {/* Quick Walk-in Option */}
                <div
                  onClick={handleSelectCashWalkIn}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer border-b pb-2 ${
                    isDark ? 'hover:bg-slate-800 border-slate-800' : 'hover:bg-slate-100 border-slate-100'
                  }`}
                >
                  <div className={`font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>⚡ Cash / Walk-in Customer</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'
                  }`}>
                    0000000000
                  </span>
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <p>No customer found matching &quot;{searchQuery}&quot;</p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      Type details directly in the fields to bill as a new customer!
                    </p>
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isSelected = customerName === c.name;
                    const bal = Number(c.outstandingBalance || 0);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelect(c)}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition ${
                          isSelected 
                            ? (isDark ? 'bg-indigo-950 border border-indigo-700 text-indigo-200 font-bold' : 'bg-indigo-50 text-indigo-900 font-bold') 
                            : (isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800')
                        }`}
                      >
                        <div>
                          <div className={`font-bold flex items-center space-x-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <span>{c.name}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                          </div>
                          <div className={`text-[10px] flex items-center space-x-1 mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Phone className="h-2.5 w-2.5 text-emerald-400" />
                            <span>{c.phone}</span>
                          </div>
                        </div>

                        {bal > 0 && (
                          <div className="text-right">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              isDark ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              Due: ₹{bal.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Customer Phone (WhatsApp) Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`block text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-slate-700'}`}>
              Customer Mobile (WhatsApp) *
            </label>
            {isPhoneValid ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                ✓ WhatsApp OK
              </span>
            ) : (
              <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                10-Digit Mobile
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <Phone className={`absolute left-3 h-4 w-4 ${isDark ? 'text-emerald-400' : 'text-slate-400'}`} />
            <input
              ref={phoneInputRef}
              type="text"
              placeholder="e.g. 9876543210"
              value={customerPhone}
              onChange={(e) => onPhoneChange(e.target.value.replace(/[^0-9+]/g, ''))}
              className={`w-full rounded-xl border pl-9 pr-8 py-2 text-xs font-mono font-bold tracking-wide focus:outline-none transition shadow-sm ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-emerald-300 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
              }`}
            />
            {customerPhone && (
              <button
                type="button"
                onClick={() => onPhoneChange("")}
                className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-0.5"
                title="Clear mobile number"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Chips & Selected Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-xs">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleSelectCashWalkIn}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
              customerPhone === "0000000000"
                ? 'bg-emerald-600 text-white shadow-xs'
                : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
            }`}
          >
            <span>⚡ Walk-in (Cash)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectCustomer(null);
              onNameChange("");
              onPhoneChange("");
              if (phoneInputRef.current) phoneInputRef.current.focus();
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
              isDark ? 'bg-slate-800 text-indigo-300 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-indigo-700 hover:bg-slate-200'
            }`}
          >
            <span>+ New Customer</span>
          </button>
        </div>

        {/* High-Contrast Phone Badge */}
        {customerPhone && (
          <div className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-black flex items-center space-x-1.5 ${
            isDark 
              ? 'bg-emerald-950/80 border border-emerald-600/60 text-emerald-300' 
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>📱 +91 {customerPhone}</span>
          </div>
        )}
      </div>
    </div>
  );
}
