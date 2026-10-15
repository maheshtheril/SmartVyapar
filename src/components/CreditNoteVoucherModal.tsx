'use client';

import React from 'react';
import { X, Printer, ShieldCheck, RotateCcw } from 'lucide-react';

export interface CreditNoteVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditNote: any;
  tenant?: {
    businessName?: string;
    gstin?: string;
    address?: string;
    phone?: string;
    stateCode?: string;
    logoUrl?: string;
  } | null;
}

export default function CreditNoteVoucherModal({
  isOpen,
  onClose,
  creditNote,
  tenant,
}: CreditNoteVoucherModalProps) {
  if (!isOpen || !creditNote) return null;

  const handlePrint = () => {
    window.print();
  };

  const isInterState =
    creditNote.igst && Number(creditNote.igst) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Modal Dialog Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar (Hidden on print) */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Statutory Credit Note Voucher
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  GST Rule 53
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {creditNote.creditNoteNumber} &nbsp;·&nbsp;
                {new Date(creditNote.creditNoteDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print Voucher
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div id="statutory-credit-note-voucher" className="p-6 overflow-y-auto space-y-5">
          {/* Top Business & Customer Banner */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Issued By (Merchant)</span>
              <div className="font-bold text-slate-900 text-sm">{tenant?.businessName || 'Business Entity'}</div>
              {tenant?.gstin && <div className="text-slate-600 font-mono">GSTIN: {tenant.gstin}</div>}
              {tenant?.address && <div className="text-slate-500 mt-0.5">{tenant.address}</div>}
              {tenant?.phone && <div className="text-slate-500">Phone: {tenant.phone}</div>}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Issued To (Customer)</span>
              <div className="font-bold text-slate-900 text-sm">{creditNote.customerName}</div>
              {creditNote.customerGstin ? (
                <div className="text-slate-600 font-mono">GSTIN: {creditNote.customerGstin}</div>
              ) : creditNote.customerPhone ? (
                <div className="text-slate-500 font-mono">Phone: {creditNote.customerPhone}</div>
              ) : (
                <div className="text-slate-400 italic">Counter Sale / Retail Customer</div>
              )}
              {creditNote.originalInvoiceNumber && (
                <div className="text-slate-700 font-mono mt-1 font-semibold">
                  Against Invoice #{creditNote.originalInvoiceNumber}
                  {creditNote.originalInvoiceDate && (
                    <span className="text-slate-500 font-normal ml-1">
                      dated {new Date(creditNote.originalInvoiceDate).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reason & Refund Info */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Return Reason:</span>
              <span className="font-semibold text-slate-800">
                {creditNote.reason?.replace(/_/g, ' ') || 'SALES RETURN'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Refund Mode:</span>
              <span className="font-semibold text-slate-800">
                {creditNote.refundMode === 'CASH'
                  ? 'Immediate Cash Refund'
                  : creditNote.refundMode === 'UPI' || creditNote.refundMode === 'BANK'
                  ? 'Bank / UPI Refund'
                  : 'Customer Account Credit'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Statutory Impact:</span>
              <span className="font-semibold text-emerald-700">
                GSTR-1 Table 9B / GSTR-3B 3.1
              </span>
            </div>
            {creditNote.remarks && (
              <div className="w-full text-slate-500 italic text-[11px] pt-1 border-t border-slate-100">
                Remarks: {creditNote.remarks}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Return Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">GST %</th>
                  <th className="py-2.5 px-3 text-right">GST Amount</th>
                  <th className="py-2.5 px-3 text-right">Credit Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {creditNote.items?.map((it: any, idx: number) => {
                  const qty = Number(it.quantity || 0);
                  const price = Number(it.unitPrice || 0);
                  const taxable = Number(it.taxableAmount || (qty * price));
                  const taxAmt = Number(it.taxAmount || 0);
                  const total = Number(it.totalAmount || (taxable + taxAmt));
                  return (
                    <tr key={it.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-900">{it.productName}</td>
                      <td className="py-2 px-3 text-right font-bold text-amber-600">
                        -{qty} {it.unitReturned || 'PCS'}
                      </td>
                      <td className="py-2 px-3 text-right">₹{price.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">₹{taxable.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">{Number(it.gstRate || 0)}%</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">₹{taxAmt.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">₹{total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span className="font-mono">₹{Number(creditNote.subtotal || 0).toFixed(2)}</span>
              </div>
              {!isInterState ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST Reversal:</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      ₹{Number(creditNote.cgst || (Number(creditNote.totalTax || 0) / 2)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST Reversal:</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      ₹{Number(creditNote.sgst || (Number(creditNote.totalTax || 0) / 2)).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST Reversal:</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    ₹{Number(creditNote.igst || creditNote.totalTax || 0).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900 text-sm">
                <span>Total Credit / Refund:</span>
                <span className="font-mono text-rose-600 font-black">
                  ₹{Number(creditNote.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Statutory Declaration and Signature */}
          <div className="border-t border-slate-200 pt-6 mt-4 flex items-end justify-between text-[11px] text-slate-500">
            <div className="space-y-1 max-w-sm">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Statutory Compliance (GST Rule 53)
              </div>
              <p>
                Issued pursuant to Section 34 of the CGST Act, 2017. Reported in GSTR-1 Table 9B for output tax reversal.
              </p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-dashed border-slate-300 w-48 mb-1"></div>
              <div className="font-bold text-slate-800">Authorized Signatory</div>
              <div className="text-[10px] text-slate-400">{tenant?.businessName || 'Business Entity'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
