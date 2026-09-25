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
  const [focusedIndex, setFocusedIndex] = useState(0); // Track keyboard focus
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

  // Reset focus to top whenever search term changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && filteredOptions.length > 0) {
      const activeElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (activeElement) {
        const container = listRef.current;
        const elementTop = activeElement.offsetTop;
        const elementBottom = elementTop + activeElement.clientHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;

        if (elementTop < containerTop) {
          container.scrollTop = elementTop;
        } else if (elementBottom > containerBottom) {
          container.scrollTop = elementBottom - container.clientHeight;
        }
      }
    }
  }, [focusedIndex, filteredOptions.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[focusedIndex]) {
        handleSelect(filteredOptions[focusedIndex].id);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find(o => o.id === value);

  return (
    <div ref={wrapperRef} className="relative w-full text-left">
      <div 
        onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setSearchTerm('');
              setFocusedIndex(0);
            }
        }}
        className={`flex items-center justify-between cursor-pointer bg-white ${className}`}
      >
        <span className="truncate text-slate-700">{selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}</span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col max-h-60">
          <div className="sticky top-0 bg-white p-2 border-b border-slate-100 z-10 shrink-0 rounded-t-xl">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 bg-white text-slate-900"
              />
            </div>
          </div>
          <div className="p-1 overflow-y-auto" ref={listRef}>
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-xs text-slate-500 text-center">No results found</div>
            ) : (
              filteredOptions.map((opt, index) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`cursor-pointer px-3 py-2 text-xs rounded-lg ${
                    focusedIndex === index 
                      ? 'bg-indigo-100 text-indigo-900 font-bold' 
                      : value === opt.id 
                        ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                        : 'text-slate-700 hover:bg-slate-50'
                  }`}
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
