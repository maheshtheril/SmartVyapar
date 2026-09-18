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
}

export default function CustomerSearch({
  customerName,
  customerPhone,
  onSelectCustomer,
  onNameChange,
  onPhoneChange,
}: CustomerSearchProps) {
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
      {/* Customer Dropdown / Selector */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Select Customer (Dropdown) *
        </label>
        
        {/* Visible Dropdown Button */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs flex items-center justify-between cursor-pointer hover:border-indigo-500 shadow-sm transition"
        >
          <div className="flex items-center space-x-2 truncate">
            <User className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className={`truncate font-semibold ${customerName ? 'text-slate-900' : 'text-slate-400'}`}>
              {customerName || "-- Select or Search Customer --"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col">
            {/* Quick Search inside Dropdown */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type to filter customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="overflow-y-auto max-h-52 p-1.5 space-y-1">
              {/* Quick Walk-in Option */}
              <div
                onClick={handleSelectCashWalkIn}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs hover:bg-slate-100 cursor-pointer border-b border-slate-100 pb-2"
              >
                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Cash / Walk-in Customer</span>
                </div>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Quick</span>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  <p>No customer found matching &quot;{searchQuery}&quot;</p>
                  <p className="text-[10px] text-indigo-600 mt-1">
                    Enter details in the fields below to bill as a new customer!
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
                        isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center space-x-1">
                          <span>{c.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="h-2.5 w-2.5" />
                          <span>{c.phone}</span>
                        </div>
                      </div>

                      {bal > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
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
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Customer Phone (WhatsApp) *
        </label>
        <div className="relative flex items-center">
          <Phone className="absolute left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="e.g. 9876543210"
            value={customerPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none font-medium shadow-sm"
          />
        </div>
      </div>
    </div>
  );
}
