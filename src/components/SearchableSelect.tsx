'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id === value);
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div ref={wrapperRef} className="relative w-full text-left">
      <div 
        onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setSearchTerm('');
        }}
        className={`flex items-center justify-between cursor-pointer bg-white ${className}`}
      >
        <span className="truncate text-slate-700">{selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}</span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 bg-white text-slate-900"
              />
            </div>
          </div>
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-xs text-slate-500 text-center">No results found</div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`cursor-pointer px-3 py-2 text-xs rounded-lg hover:bg-slate-50 ${value === opt.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
