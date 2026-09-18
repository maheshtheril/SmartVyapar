'use client';

import React, { useEffect } from 'react';
import { Printer, X, ChefHat, CheckCircle2 } from 'lucide-react';

export interface KotItemData {
  productName: string;
  quantity: number;
  notes?: string | null;
}

export interface KotPrintData {
  kotNumber: string;
  tableName: string;
  waiterName?: string;
  guestCount?: number;
  createdAt: string;
  items: KotItemData[];
}

interface KotPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  kot: KotPrintData | null;
}

export default function KotPrintModal({ isOpen, onClose, kot }: KotPrintModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        window.print();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !kot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-3xl bg-slate-100 shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                {kot.kotNumber} • Table {kot.tableName}
              </h3>
              <p className="text-xs text-slate-500">
                Fired to Kitchen • 3-Inch Thermal KOT
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 flex items-center space-x-1 transition shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Print KOT (Enter)</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Paper Preview */}
        <div className="p-6 overflow-y-auto flex justify-center">
          <div
            className="w-[300px] bg-white p-4 shadow-lg border border-slate-300 font-mono text-[11px] leading-relaxed select-none text-black"
            id="kot-print-area"
          >
            {/* Header */}
            <div className="text-center space-y-0.5 pb-2 border-b-2 border-black">
              <div className="text-base font-black tracking-wider uppercase">
                *** KITCHEN ORDER TICKET ***
              </div>
              <div className="text-lg font-black text-black">
                TABLE: {kot.tableName}
              </div>
              <div className="text-[10px] text-slate-600">
                KOT #: <strong>{kot.kotNumber}</strong>
              </div>
            </div>

            {/* Meta */}
            <div className="py-1.5 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Date: {new Date(kot.createdAt).toLocaleDateString('en-IN')}</span>
                <span>Time: {new Date(kot.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Waiter: {kot.waiterName || 'Captain'}</span>
                <span>Guests: {kot.guestCount || 2}</span>
              </div>
            </div>

            {/* Items Header */}
            <div className="grid grid-cols-12 font-bold text-[11px] py-1 border-b border-black">
              <div className="col-span-2 text-center">QTY</div>
              <div className="col-span-10 pl-2">ITEM DESCRIPTION</div>
            </div>

            {/* Items Rows */}
            <div className="divide-y divide-dashed divide-slate-300 py-1">
              {kot.items.map((item, idx) => (
                <div key={idx} className="py-1.5">
                  <div className="grid grid-cols-12 font-bold text-xs">
                    <div className="col-span-2 text-center text-sm font-black">
                      [{item.quantity}]
                    </div>
                    <div className="col-span-10 pl-2 text-black leading-tight">
                      {item.productName}
                    </div>
                  </div>
                  {item.notes && (
                    <div className="pl-6 text-[10px] font-semibold text-rose-700 italic mt-0.5">
                      ★ Note: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total items footer */}
            <div className="border-t-2 border-black pt-1.5 text-center text-[10px] font-bold">
              Total Items: {kot.items.reduce((acc, i) => acc + Number(i.quantity), 0)}
            </div>
            <div className="text-center text-[9px] text-slate-500 pt-1">
              Please prepare with standard recipe proportions
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #kot-print-area,
          #kot-print-area * {
            visibility: visible;
          }
          #kot-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0 !important;
            padding: 8px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
}
