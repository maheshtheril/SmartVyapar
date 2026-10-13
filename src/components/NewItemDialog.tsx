'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PackagePlus, X } from 'lucide-react';
import { isSimilarSupplierName } from '@/lib/gstin';

export interface NewItemDetails {
  productName: string;
  suggestedDisplayName: string;
  partNumber: string;
  hsnCode: string;
  gstRate: number;
  unit: string;
}

interface NewItemDialogProps {
  initial: Partial<NewItemDetails>;
  /** Existing catalogue, used for the duplicate ("Did you mean") check */
  products: any[];
  onClose: () => void;
  onConfirm: (d: NewItemDetails) => void;
  onUseExisting: (product: any) => void;
}

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['PCS', 'CAN', 'BOX', 'SET', 'KG', 'LTR', 'MTR'];
const HSN_REGEX = /^\d{4}(\d{2}|\d{4})?$/;

/**
 * Confirm-details dialog for a product that is not yet in the catalogue.
 * It does NOT write to the database: the product is still created atomically
 * with the purchase bill when it is posted, so a failed bill never leaves an orphan item.
 */
export default function NewItemDialog({ initial, products, onClose, onConfirm, onUseExisting }: NewItemDialogProps) {
  const [productName, setProductName] = useState(initial.productName || '');
  const [display, setDisplay] = useState(initial.suggestedDisplayName || '');
  const [oem, setOem] = useState(initial.partNumber || '');
  const [hsn, setHsn] = useState(initial.hsnCode || '');
  const [gst, setGst] = useState<number | ''>(initial.gstRate !== undefined ? initial.gstRate : '');
  const [unit, setUnit] = useState(initial.unit || 'PCS');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nameToCheck = (display || productName).trim();
  const similar = useMemo(() => {
    if (nameToCheck.length < 3) return [];
    const lowerName = productName.trim().toLowerCase();
    const lowerDisplay = display.trim().toLowerCase();
    return products
      .filter((p) => {
        const pn = String(p.name || '');
        const pd = String(p.displayName || '');
        return (
          pn.toLowerCase() === lowerName || (lowerDisplay && pd.toLowerCase() === lowerDisplay) ||
          isSimilarSupplierName(pn, nameToCheck) || (pd && isSimilarSupplierName(pd, nameToCheck)) ||
          (oem.trim() && p.partNumber && String(p.partNumber).toLowerCase() === oem.trim().toLowerCase())
        );
      })
      .slice(0, 4);
  }, [products, nameToCheck, productName, display, oem]);

  const hsnTrim = hsn.trim();
  const hsnBad = !!hsnTrim && !HSN_REGEX.test(hsnTrim);

  const problems: string[] = [];
  if (!productName.trim()) problems.push('Item name is required');
  if (!display.trim()) problems.push('POS display name is required (what your cashier sees)');
  if (hsnBad) problems.push('HSN must be 4, 6 or 8 digits');
  if (gst === '') problems.push('Select the GST rate');
  const blocked = problems.length > 0;

  const confirm = () => {
    if (blocked) return;
    onConfirm({
      productName: productName.trim(),
      suggestedDisplayName: display.trim(),
      partNumber: oem.trim(),
      hsnCode: hsnTrim,
      gstRate: Number(gst),
      unit,
    });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'SELECT') { e.preventDefault(); confirm(); }
  };

  const input = 'w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500';
  const bad = '!border-rose-500 !bg-rose-50 !ring-2 !ring-rose-200';
  const label = 'block text-[11px] font-bold text-slate-700 mb-1';

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4" onKeyDown={onKey}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <PackagePlus className="w-4 h-4 text-blue-600" /> New Item - confirm details
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3">
          {similar.length > 0 && (
            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3">
              <p className="font-bold mb-1.5">Similar items already exist. Use one of these to avoid duplicate stock:</p>
              <div className="space-y-1">
                {similar.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onUseExisting(p)}
                    className="w-full text-left bg-white border border-amber-200 hover:border-blue-400 hover:bg-blue-50 rounded px-2.5 py-1.5 transition"
                  >
                    <span className="font-bold text-slate-800">{p.displayName || p.name}</span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {' '}· SKU {p.sku || 'N/A'}{p.partNumber ? ` · OEM ${p.partNumber}` : ''} · Stock {p.currentStock} {p.baseUnit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={label}>Supplier invoice name <span className="text-rose-500">*</span></label>
            <input className={`${input} font-mono ${!productName.trim() ? bad : ''}`} value={productName} onChange={(e) => setProductName(e.target.value)} />
            <p className="text-[10px] text-slate-400 mt-1">Exactly as printed on the supplier&apos;s bill. Remembered for matching next time.</p>
          </div>

          <div>
            <label className={label}>POS display name <span className="text-rose-500">*</span></label>
            <input autoFocus className={`${input} font-semibold ${!display.trim() ? bad : ''}`} placeholder="Clean name your cashier sees, e.g. Swift Shock Absorber"
              value={display} onChange={(e) => setDisplay(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Part / OEM #</label>
              <input className={`${input} font-mono`} value={oem} onChange={(e) => setOem(e.target.value)} />
            </div>
            <div>
              <label className={label}>Unit</label>
              <select className={input} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>HSN code <span className="font-normal text-slate-400">(recommended)</span></label>
              <input
                className={`${input} font-mono ${hsnBad ? bad : ''}`}
                maxLength={8}
                placeholder="e.g. 8708"
                value={hsn}
                onChange={(e) => setHsn(e.target.value.replace(/\D/g, ''))}
              />
              {hsnBad && <p className="text-[10px] text-rose-600 font-semibold mt-1">✕ HSN must be 4, 6 or 8 digits</p>}
              {!hsnTrim && <p className="text-[10px] text-amber-700 mt-1">Without HSN this item shows as unclassified in GST returns.</p>}
            </div>
            <div>
              <label className={label}>GST rate <span className="text-rose-500">*</span></label>
              <select className={`${input} ${gst === '' ? bad : ''}`} value={gst} onChange={(e) => setGst(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Select...</option>
                {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
              {gst === '' && <p className="text-[10px] text-rose-600 font-semibold mt-1">✕ Choose the GST rate for this item</p>}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          {blocked && (
            <div className="mb-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <span className="font-bold">Please fix before continuing:</span>
              <ul className="list-disc ml-4 mt-0.5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          <p className="text-[10px] text-slate-500 mb-2">The item is added to your catalogue when you post this bill.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel (Esc)</button>
            <button type="button" disabled={blocked} onClick={confirm}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg">
              Use for this row (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
