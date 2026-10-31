'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FlaskConical, 
  Clock, 
  FileCheck, 
  Printer, 
  Tag, 
  Users, 
  Plus,
  LayoutDashboard,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface LabNavProps {
  onNewAccession?: () => void;
  onPrintCatalog?: () => void;
}

export default function LabNav({ onNewAccession, onPrintCatalog }: LabNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Command Center',
      href: '/lab',
      icon: LayoutDashboard,
      active: pathname === '/lab',
    },
    {
      name: 'Phlebotomy Queue',
      href: '/lab/queue',
      icon: Clock,
      active: pathname === '/lab/queue',
    },
    {
      name: 'Result Entry & Worklist',
      href: '/lab/results',
      icon: FileCheck,
      active: pathname.startsWith('/lab/results'),
      highlight: true,
    },
    {
      name: 'Sample Verified Report',
      href: '/lab/report/15570a27-e4e0-4fb8-a348-d0be023bec50',
      icon: Printer,
      active: pathname.startsWith('/lab/report'),
      badge: 'A4 Print',
    },
    {
      name: 'Test Catalog (32 Tests)',
      href: '/lab/tests',
      icon: Tag,
      active: pathname.startsWith('/lab/tests'),
    },
    {
      name: 'Referring Doctors',
      href: '/lab/doctors',
      icon: Users,
      active: pathname.startsWith('/lab/doctors'),
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm space-y-2 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  item.active
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                <Icon className={`h-4 w-4 ${item.active ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
                {item.badge && (
                  <span
                    className={`ml-1 text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                      item.active
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onPrintCatalog && (
            <button
              type="button"
              onClick={onPrintCatalog}
              className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Printer className="h-3.5 w-3.5 text-emerald-600" />
              <span>Print Catalog</span>
            </button>
          )}

          {onNewAccession ? (
            <button
              type="button"
              onClick={onNewAccession}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Lab Accession</span>
            </button>
          ) : (
            <Link
              href="/lab/queue"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Lab Accession</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
