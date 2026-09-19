'use client';

import React from 'react';
import { Search } from 'lucide-react';

export default function TopSearchBar() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 shadow-2xs transition group cursor-pointer"
      title="Search menus & actions (Ctrl + K)"
    >
      <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
      <span className="text-xs font-medium hidden sm:inline text-slate-400 group-hover:text-slate-600">
        Search menus & actions...
      </span>
      <span className="text-xs font-medium sm:hidden text-slate-400">Search</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded shadow-2xs">
        <span>Ctrl</span>
        <span>K</span>
      </kbd>
    </button>
  );
}
