'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === '/') {
    return (
      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mb-4">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-semibold text-slate-800">Executive Dashboard</span>
      </div>
    );
  }

  const segments = pathname.split('/').filter(Boolean);

  const segmentLabels: Record<string, string> = {
    billing: 'Billing & POS',
    new: 'Create Invoice',
    invoices: 'Invoices & Ledger',
    inventory: 'Stock & Inventory',
    customers: 'Customers Directory',
    scanner: 'AI Purchase Scanner',
  };

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
      <Link href="/" className="flex items-center space-x-1 hover:text-indigo-600 transition">
        <Home className="h-3.5 w-3.5" />
        <span>Home</span>
      </Link>

      {segments.map((seg, idx) => {
        const href = '/' + segments.slice(0, idx + 1).join('/');
        const isLast = idx === segments.length - 1;
        const label = segmentLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            {isLast ? (
              <span className="font-bold text-slate-900">{label}</span>
            ) : (
              <Link href={href} className="hover:text-indigo-600 transition">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
