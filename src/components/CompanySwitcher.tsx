'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building2, Check, ChevronsUpDown, Plus, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: string;
  businessName: string;
  legalName?: string | null;
  gstin?: string | null;
  slug: string;
  subscriptionTier: string;
  businessType: string;
  isCurrent: boolean;
}

interface CompanySwitcherProps {
  variant?: 'sidebar' | 'topbar';
}

export default function CompanySwitcher({ variant = 'topbar' }: CompanySwitcherProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies/my-companies');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.companies)) {
          setCompanies(data.companies);
        }
      }
    } catch {
      // Background fetch error ignored
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCompany = companies.find((c) => c.isCurrent) || companies[0];

  const handleSwitchCompany = async (targetId: string) => {
    if (targetId === activeCompany?.id || switchingId) return;

    setSwitchingId(targetId);
    try {
      const res = await fetch('/api/companies/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: targetId }),
      });

      if (res.ok) {
        // Fast reload to apply new company session
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to switch company');
        setSwitchingId(null);
      }
    } catch (err) {
      console.error('Error switching company:', err);
      setSwitchingId(null);
    }
  };

  if (!activeCompany) return null;

  return (
    <div className={`relative ${variant === 'sidebar' ? 'w-full' : ''}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 p-2.5 text-left transition cursor-pointer group shadow-2xs flex items-center justify-between"
          title="Click to Switch Company / Organization"
        >
          <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0 pr-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="truncate flex-1 min-w-0">
              <p className="truncate text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                {activeCompany.businessName}
              </p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${activeCompany.subscriptionTier === 'FREE' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  {activeCompany.gstin ? `GST: ${activeCompany.gstin}` : `${activeCompany.subscriptionTier} Plan`}
                </p>
              </div>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition shadow-2xs group cursor-pointer text-left max-w-[260px]"
          title="Switch Company / Organization (Zoho & SAP Multi-Company)"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="truncate flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="truncate text-xs font-bold text-slate-900">
                {activeCompany.businessName}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {activeCompany.gstin ? `GST: ${activeCompany.gstin}` : 'Active Organization'}
            </p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>
      )}

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Organizations & Companies
              </p>
              <p className="text-[11px] font-medium text-slate-600">
                {companies.length} {companies.length === 1 ? 'Company' : 'Companies'} linked
              </p>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
              Zoho-Multi-Entity
            </span>
          </div>

          {/* Company List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {companies.map((comp) => {
              const isCurrent = comp.id === activeCompany.id;
              const isSwitching = switchingId === comp.id;

              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => handleSwitchCompany(comp.id)}
                  disabled={isCurrent || !!switchingId}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-50/60 border border-indigo-200 text-indigo-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0 pr-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="truncate flex-1 min-w-0">
                      <p className="truncate text-xs font-bold leading-tight">
                        {comp.businessName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {comp.gstin || comp.businessType || 'Retail'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isSwitching ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    ) : isCurrent ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Action: Register New Entity */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50">
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center space-x-1.5 w-full py-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 text-indigo-600 text-xs font-bold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Register Sister Company</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
