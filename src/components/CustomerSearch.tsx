'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, Check, ChevronDown, Plus, Search, X } from 'lucide-react';

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  stateCode?: string;
  outstandingBalance: number;
  priceListId?: string;
  loyaltyPoints?: number;
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
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWalkInMode, setIsWalkInMode] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Server-side debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setFilteredCustomers([]);
      return;
    }
    
    const fetchSearch = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(/api/customers/search?q= + encodeURIComponent(trimmed));
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          setFilteredCustomers(data.customers);
        }
      } catch (err) {
        console.error("Error loading customers:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const delay = setTimeout(fetchSearch, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

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

  const handleClear = () => {
    onSelectCustomer(null);
    onNameChange("");
    onPhoneChange("");
  };

  const isPhoneValid = customerPhone.length === 10;

  return (
    <div ref={containerRef} className="space-y-3 relative">
      {/* Segmented Control */}
      <div className={lex items-center h-10 p-1 rounded-xl border  + '$' + {isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-200/50 border-slate-200/50'}}>
        <button 
          type="button"
          onClick={() => { setIsWalkInMode(false); handleClear(); }} 
          className={h-full w-1/2 text-[10px] font-black rounded-lg transition-all  + '$' + {!isWalkInMode ? (isDark ? 'bg-slate-700 text-indigo-400 shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500'}}
        >
          REGISTERED
        </button>
        <button 
          type="button"
          onClick={() => { setIsWalkInMode(true); handleClear(); }} 
          className={h-full w-1/2 text-[10px] font-black rounded-lg transition-all  + '$' + {isWalkInMode ? (isDark ? 'bg-slate-700 text-pink-400 shadow-sm' : 'bg-white text-pink-600 shadow-sm') : 'text-slate-500'}}
        >
          WALK-IN GUEST
        </button>
      </div>

      {isWalkInMode ? (
        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
          <input
            ref={phoneInputRef}
            type="text"
            placeholder="MOBILE..."
            value={customerPhone}
            onChange={(e) => onPhoneChange(e.target.value.replace(/[^0-9+]/g, ''))}
            className={w-full h-10 rounded-xl border px-3 text-[10px] font-black tracking-widest uppercase focus:outline-none transition shadow-sm  + '$' + {
              isDark
                ? 'bg-slate-950 border-slate-700 text-pink-300 placeholder:text-slate-600 focus:border-pink-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
            }}
          />
          <input
            type="text"
            placeholder="NAME..."
            value={customerName === "Cash / Walk-in Customer" || customerName === "Cash Customer" ? "" : customerName}
            onChange={(e) => onNameChange(e.target.value)}
            className={w-full h-10 rounded-xl border px-3 text-[10px] font-black tracking-widest uppercase focus:outline-none transition shadow-sm  + '$' + {
              isDark
                ? 'bg-slate-950 border-slate-700 text-pink-300 placeholder:text-slate-600 focus:border-pink-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
            }}
          />
        </div>
      ) : (
        <div className="relative animate-in fade-in slide-in-from-left-4 duration-200">
          {/* Visible Dropdown Button */}
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className={w-full h-10 rounded-xl border px-3 text-[10px] font-black tracking-widest uppercase flex items-center justify-between cursor-pointer shadow-sm transition  + '$' + {
              isDark 
                ? 'bg-slate-950 border-slate-700 text-indigo-300 hover:border-indigo-500' 
                : 'bg-white border-slate-300 text-slate-900 hover:border-indigo-500'
            }}
          >
            <div className="flex items-center space-x-2 truncate">
              <Search className={h-4 w-4 shrink-0  + '$' + {isDark ? 'text-indigo-400' : 'text-indigo-600'}} />
              <span className="truncate">
                {customerName && customerName !== "Cash Customer" && customerName !== "Cash / Walk-in Customer" 
                  ? ${customerName} + (customerPhone ?  -  : '')
                  : 'SEARCH REGISTERED CUSTOMER...'}
              </span>
            </div>
            {customerName ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="text-rose-400 hover:text-rose-300 ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            )}
          </div>

          {/* Dropdown Panel */}
          {isOpen && (
            <div className={bsolute z-[100] mt-1 w-full rounded-xl border shadow-2xl overflow-hidden  + '$' + {isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}}>
              <div className={p-2 border-b  + '$' + {isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}}>
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type name or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className={w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none  + '$' + {
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' 
                        : 'bg-white border-slate-200 text-slate-900'
                    }}
                  />
                  {isLoading && (
                    <div className="absolute right-3 h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  )}
                </div>
              </div>

              <div className="overflow-y-auto max-h-52 p-1.5 space-y-1">
                {filteredCustomers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <p>{searchQuery ? No customer found matching "" : "Search to find customers"}</p>
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isSelected = customerName === c.name;
                    const bal = Number(c.outstandingBalance || 0);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelect(c)}
                        className={lex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition  + '$' + {
                          isSelected 
                            ? (isDark ? 'bg-indigo-950 border border-indigo-700 text-indigo-200 font-bold' : 'bg-indigo-50 text-indigo-900 font-bold') 
                            : (isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800')
                        }}
                      >
                        <div>
                          <div className={ont-bold flex items-center space-x-1  + '$' + {isDark ? 'text-white' : 'text-slate-900'}}>
                            <span>{c.name}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                          </div>
                          <div className={	ext-[10px] flex items-center space-x-1 mt-0.5 font-mono  + '$' + {isDark ? 'text-slate-400' : 'text-slate-500'}}>
                            <Phone className="h-2.5 w-2.5 text-emerald-400" />
                            <span>{c.phone}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
