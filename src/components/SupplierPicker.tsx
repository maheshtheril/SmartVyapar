'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Check, Plus, UserPlus, X, AlertTriangle, Loader2 } from 'lucide-react';
import { checkGstin, isSimilarSupplierName } from '@/lib/gstin';

export interface SupplierPickerOption {
  id?: string;
  name: string;
  gstin: string | null;
  phone: string | null;
  billsCount?: number;
  outstandingBalance?: number;
  isPreset?: boolean;
}

interface SupplierPickerProps {
  /** Current supplier name text (controlled by the parent form) */
  value: string;
  /** Called on every keystroke (free typing is still allowed) */
  onChange: (name: string) => void;
  /** Called when a supplier is chosen from the list or just created */
  onSelect: (s: { name: string; gstin: string; phone: string }) => void;
  /** Suppliers derived from past bills (kept for backward compatibility) */
  billSuppliers: SupplierPickerOption[];
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function SupplierPicker({ value, onChange, onSelect, billSuppliers, inputRef }: SupplierPickerProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [masterSuppliers, setMasterSuppliers] = useState<SupplierPickerOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogName, setDialogName] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Load the real Supplier master (read only). Failure is harmless: bill-derived list still works.
  const loadMaster = async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data?.success && Array.isArray(data.suppliers)) {
        setMasterSuppliers(
          data.suppliers
            .filter((s: any) => s.isActive !== false)
            .map((s: any) => ({
              id: s.id,
              name: s.name,
              gstin: s.gstin || null,
              phone: s.phone || null,
              billsCount: s._count?.purchaseBills ?? 0,
              outstandingBalance: Number(s.outstandingBalance) || 0,
            }))
        );
      }
    } catch {
      /* ignore */
    }
  };
  useEffect(() => { loadMaster(); }, []);

  // Master suppliers first, then any bill-derived names that are not in the master
  const allSuppliers = useMemo(() => {
    const seen = new Set(masterSuppliers.map((s) => s.name.trim().toLowerCase()));
    return [
      ...masterSuppliers,
      ...billSuppliers.filter((s) => !seen.has(s.name.trim().toLowerCase())),
    ];
  }, [masterSuppliers, billSuppliers]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return allSuppliers;
    return allSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.gstin && s.gstin.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
    );
  }, [allSuppliers, value]);

  const typed = value.trim();
  const exactMatch = allSuppliers.some((s) => s.name.trim().toLowerCase() === typed.toLowerCase());
  const showCreateRow = typed.length > 0 && !exactMatch;
  const rowCount = filtered.length + (showCreateRow ? 1 : 0);

  useEffect(() => { setHighlight(0); }, [value, open]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const choose = (s: SupplierPickerOption) => {
    onSelect({ name: s.name, gstin: s.gstin || '', phone: s.phone || '' });
    setOpen(false);
  };

  const openCreate = () => {
    setDialogName(typed);
    setDialogOpen(true);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (rowCount ? (h + 1) % rowCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (rowCount ? (h - 1 + rowCount) % rowCount : 0));
    } else if (e.key === 'Enter' && open && rowCount > 0) {
      e.preventDefault();
      if (highlight < filtered.length) choose(filtered[highlight]);
      else if (showCreateRow) openCreate();
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          required
          autoComplete="off"
          placeholder="Search supplier name, GSTIN, or enter vendor..."
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
          className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
        />
        <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 ring-1 ring-black/5">
          {filtered.map((sup, i) => (
            <div
              key={sup.id || sup.name}
              onMouseDown={(e) => { e.preventDefault(); choose(sup); }}
              onMouseEnter={() => setHighlight(i)}
              className={`p-2 cursor-pointer flex items-center justify-between transition text-xs ${i === highlight ? 'bg-blue-50' : ''}`}
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="truncate">{sup.name}</span>
                  {sup.name === value && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {sup.gstin ? `GSTIN: ${sup.gstin}` : 'No GSTIN'} {sup.phone ? `| Ph: ${sup.phone}` : ''}
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  {sup.billsCount || 0} Bills
                </span>
                {!!sup.outstandingBalance && sup.outstandingBalance > 0 && (
                  <div className="text-[9px] text-amber-700 font-mono mt-0.5">
                    Due ₹{sup.outstandingBalance.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && !showCreateRow && (
            <div className="p-3 text-xs text-slate-500 text-center">No suppliers yet. Type a name to add one.</div>
          )}

          {showCreateRow && (
            <div
              onMouseDown={(e) => { e.preventDefault(); openCreate(); }}
              onMouseEnter={() => setHighlight(filtered.length)}
              className={`p-2.5 cursor-pointer flex items-center gap-2 text-xs font-semibold text-blue-700 ${highlight === filtered.length ? 'bg-blue-50' : 'bg-slate-50'}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Create new supplier &quot;{typed}&quot;
              <span className="ml-auto text-[9px] font-normal text-slate-400">Enter</span>
            </div>
          )}
        </div>
      )}

      {/* New-supplier notice: still allowed (keeps AI Scan / quick entry working) but made explicit */}
      {showCreateRow && !open && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-700">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>New supplier — will be created when you post this bill.</span>
          <button type="button" onClick={openCreate} className="font-bold text-blue-600 hover:underline">
            Add full details
          </button>
        </div>
      )}

      {dialogOpen && (
        <QuickAddSupplierDialog
          initialName={dialogName}
          existing={allSuppliers}
          onClose={() => { setDialogOpen(false); inputRef?.current?.focus(); }}
          onCreated={(s) => {
            setDialogOpen(false);
            loadMaster();
            onSelect({ name: s.name, gstin: s.gstin || '', phone: s.phone || '' });
          }}
        />
      )}
    </div>
  );
}

function QuickAddSupplierDialog({
  initialName,
  existing,
  onClose,
  onCreated,
}: {
  initialName: string;
  existing: SupplierPickerOption[];
  onClose: () => void;
  onCreated: (s: { name: string; gstin: string | null; phone: string | null }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const gstCheck = checkGstin(gstin);
  const gstinDuplicate = gstin.length === 15
    ? existing.find((s) => s.gstin && s.gstin.toUpperCase() === gstin.toUpperCase())
    : undefined;
  const exactNameDuplicate = existing.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  const similar = name.trim().length >= 3
    ? existing.filter((s) => s !== exactNameDuplicate && isSimilarSupplierName(s.name, name)).slice(0, 3)
    : [];

  const phoneOk = !phone || /^[0-9+\-\s]{7,15}$/.test(phone);
  const emailOk = !email || /^\S+@\S+\.\S+$/.test(email);
  const blocked = !name.trim() || !gstCheck.valid || !!gstinDuplicate || !!exactNameDuplicate || !phoneOk || !emailOk;

  const problems: string[] = [];
  if (!name.trim()) problems.push('Supplier name is required');
  if (exactNameDuplicate) problems.push('Supplier name already exists');
  if (gstCheck.entered && !gstCheck.valid) problems.push(`GSTIN: ${gstCheck.error}`);
  if (gstinDuplicate) problems.push(`GSTIN already used by "${gstinDuplicate.name}"`);
  if (!phoneOk) problems.push('Phone number is invalid');
  if (!emailOk) problems.push('Email address is invalid');
  const bad = '!border-rose-500 !bg-rose-50 !ring-2 !ring-rose-200';

  const save = async () => {
    if (blocked || saving) return;
    setSaving(true);
    setServerError('');
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          gstin: gstin.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create supplier');
      onCreated({ name: data.supplier.name, gstin: data.supplier.gstin, phone: data.supplier.phone });
    } catch (e: any) {
      setServerError(e.message || 'Failed to create supplier');
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') { e.preventDefault(); save(); }
  };

  const input = 'w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500';
  const label = 'block text-[11px] font-bold text-slate-700 mb-1';

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4" onKeyDown={onKey}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <UserPlus className="w-4 h-4 text-blue-600" /> New Supplier
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className={label}>Supplier / Vendor Name <span className="text-rose-500">*</span></label>
            <input autoFocus className={`${input} ${exactNameDuplicate || !name.trim() ? bad : ''}`} value={name} onChange={(e) => setName(e.target.value)} />
            {exactNameDuplicate && (
              <p className="text-[10px] text-rose-600 mt-1">A supplier with this name already exists. Select it from the list instead.</p>
            )}
            {!exactNameDuplicate && similar.length > 0 && (
              <div className="text-[10px] text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded p-2">
                Did you mean:{' '}
                {similar.map((s) => (
                  <button key={s.name} type="button" onClick={() => onCreated({ name: s.name, gstin: s.gstin, phone: s.phone })}
                    className="font-bold text-blue-600 hover:underline mr-2">{s.name}</button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>GSTIN <span className="font-normal text-slate-400">(optional)</span></label>
              <input
                className={`${input} font-mono ${(gstCheck.entered && !gstCheck.valid) || gstinDuplicate ? bad : ''}`}
                maxLength={15}
                placeholder="29AAACB2021A1Z8"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
              />
              {gstCheck.entered && !gstCheck.valid && (
                <p className="text-[10px] text-rose-600 font-semibold mt-1">
                  ✕ {gstCheck.error}
                </p>
              )}
              {gstCheck.entered && gstCheck.valid && (
                <p className="text-[10px] text-emerald-700 mt-1">✓ Valid · {gstCheck.stateName}</p>
              )}
              {gstinDuplicate && (
                <p className="text-[10px] text-rose-600 mt-1">Already registered as &quot;{gstinDuplicate.name}&quot;.</p>
              )}
            </div>
            <div>
              <label className={label}>Phone</label>
              <input className={`${input} ${!phoneOk ? bad : ''}`} value={phone} onChange={(e) => setPhone(e.target.value)} />
              {!phoneOk && <p className="text-[10px] text-rose-600 font-semibold mt-1">✕ Enter a valid phone number (7-15 digits)</p>}
            </div>
          </div>

          <div>
            <label className={label}>Email</label>
            <input className={`${input} ${!emailOk ? bad : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} />
            {!emailOk && <p className="text-[10px] text-rose-600 font-semibold mt-1">✕ Enter a valid email address</p>}
          </div>
          <div>
            <label className={label}>Address</label>
            <textarea className={input} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {serverError && <p className="text-xs text-rose-600">{serverError}</p>}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          {problems.length > 0 && (
            <div className="mb-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <span className="font-bold">Please fix before saving:</span>
              <ul className="list-disc ml-4 mt-0.5">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel (Esc)</button>
            <button
              type="button"
              disabled={blocked || saving}
              onClick={save}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save &amp; Select (Enter)
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
