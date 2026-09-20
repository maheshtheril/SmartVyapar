'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Printer,
  FileText,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export interface PurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  onSuccess: (result: any) => void;
}

export default function PurchaseReturnModal({
  isOpen,
  onClose,
  bill,
  onSuccess,
}: PurchaseReturnModalProps) {
  // All hooks called unconditionally before any return
  const [reason, setReason] = useState<string>('DEFECTIVE');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedDebitNote, setCompletedDebitNote] = useState<any | null>(null);

  // Return items selection state: mapped by item id
  const [returnItems, setReturnItems] = useState<{
    [itemId: string]: {
      selected: boolean;
      quantity: number;
    };
  }>({});

  // Reset or populate items whenever `bill` changes
  useEffect(() => {
    if (bill?.items && Array.isArray(bill.items)) {
      const initial: Record<string, { selected: boolean; quantity: number }> = {};
      bill.items.forEach((item: any) => {
        const maxReturn = Math.max(1, Number(item.quantity) || 1);
        initial[item.id] = {
          selected: false,
          quantity: maxReturn,
        };
      });
      setReturnItems(initial);
      setErrorMessage(null);
      setCompletedDebitNote(null);
    }
  }, [bill]);

  if (!isOpen || !bill) return null;

  const handleToggleItem = (itemId: string) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected,
      },
    }));
  };

  const handleQtyChange = (itemId: string, maxQty: number, val: number) => {
    const clamped = Math.max(0.01, Math.min(maxQty, val));
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: clamped,
      },
    }));
  };

  // Calculate live totals
  let computedTaxable = 0;
  let computedTax = 0;
  const selectedItemsPayload: any[] = [];

  const supplierStateCode = bill.supplierGstin ? bill.supplierGstin.substring(0, 2) : undefined;

  (bill.items || []).forEach((item: any) => {
    const state = returnItems[item.id];
    if (state?.selected) {
      const qty = Number(state.quantity) || 0;
      const rate = Number(item.purchasePrice) || 0;
      const gstRate = Number(item.gstRate || item.product?.gstRate || 0);
      const lineTaxable = qty * rate;
      const lineTax = (lineTaxable * gstRate) / 100;

      computedTaxable += lineTaxable;
      computedTax += lineTax;

      selectedItemsPayload.push({
        productId: item.productId,
        quantity: qty,
        costRate: rate,
        batchId: item.batchId || undefined,
        supplierStateCode,
        productName: item.product?.name || item.productName || 'Item',
        gstRate,
        lineTaxable,
        lineTax,
        lineTotal: lineTaxable + lineTax,
      });
    }
  });

  const computedTotalDebitNote = computedTaxable + computedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemsPayload.length === 0) {
      setErrorMessage('Please select at least one item from the inward list to return.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/purchase/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: bill.supplierName,
          supplierGstin: bill.supplierGstin || undefined,
          originalBillNumber: bill.billNumber,
          items: selectedItemsPayload.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            costRate: it.costRate,
            batchId: it.batchId,
            supplierStateCode: it.supplierStateCode,
          })),
          reason,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process purchase return');
      }

      setCompletedDebitNote({
        ...data.data,
        supplierName: bill.supplierName,
        supplierGstin: bill.supplierGstin,
        originalBillNumber: bill.billNumber,
        originalBillDate: bill.billDate,
        reason,
        notes,
        createdAt: new Date().toISOString(),
      });
      onSuccess(data.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating debit note.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintDebitNote = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Purchase Return &amp; Supplier Debit Note
                <span className="text-[11px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                  GST Inward Reversal
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Against Bill #{bill.billNumber} • {bill.supplierName} • GRN #{bill.grnNumber || 'GRN-MANUAL'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Completed View */}
        {completedDebitNote ? (
          <div className="p-6 space-y-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                Supplier Debit Note Successfully Issued!
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Inventory stock has been deducted, and Accounts Payable has been reversed in the General Ledger.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-emerald-300 rounded-lg shadow-xs font-mono font-bold text-emerald-700 text-sm">
                Debit Note #{completedDebitNote.debitNoteNumber}
              </div>
            </div>

            {/* Statutory Debit Note Printable Voucher Preview */}
            <div id="printable-debit-note" className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Statutory GST Document</span>
                  <h5 className="text-base font-bold text-slate-900">DEBIT NOTE TO SUPPLIER</h5>
                  <div className="text-xs font-mono font-semibold text-slate-700">{completedDebitNote.debitNoteNumber}</div>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-IN')}</div>
                  <div><strong>Original Bill:</strong> #{bill.billNumber}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Issued To (Supplier):</span>
                  <div className="font-bold text-slate-900">{bill.supplierName}</div>
                  {bill.supplierGstin && <div className="text-slate-600">GSTIN: {bill.supplierGstin}</div>}
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Return Reason &amp; Impact:</span>
                  <div className="font-semibold text-slate-800">{reason.replace('_', ' ')}</div>
                  <div className="text-[11px] text-slate-500">Stock Decrement &amp; Accounts Payable Reduction</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right">Return Qty</th>
                      <th className="p-2.5 text-right">Cost Rate</th>
                      <th className="p-2.5 text-right">Taxable</th>
                      <th className="p-2.5 text-right">GST</th>
                      <th className="p-2.5 text-right">Total Debit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {completedDebitNote.items?.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-sans font-medium text-slate-900">{it.productName}</td>
                        <td className="p-2.5 text-right font-bold text-rose-600">-{it.quantity}</td>
                        <td className="p-2.5 text-right">₹{Number(it.costRate).toFixed(2)}</td>
                        <td className="p-2.5 text-right">₹{Number(it.lineTaxable).toFixed(2)}</td>
                        <td className="p-2.5 text-right">₹{Number(it.tax).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{Number(it.lineTotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Return Value:</span>
                    <span className="font-mono">₹{Number(completedDebitNote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Input GST Reversal:</span>
                    <span className="font-mono">₹{Number(completedDebitNote.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900 text-sm">
                    <span>Net Debit Note Value:</span>
                    <span className="font-mono text-rose-700">₹{Number(completedDebitNote.totalDebitNoteAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintDebitNote}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                Print Debit Note
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Create Debit Note Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Supplier & Bill Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier</span>
                <span className="font-bold text-slate-900">{bill.supplierName}</span>
                {bill.supplierGstin && <div className="text-slate-500 font-mono text-[11px]">{bill.supplierGstin}</div>}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Original Inward Bill</span>
                <span className="font-mono font-bold text-slate-900">{bill.billNumber}</span>
                <div className="text-slate-500">
                  {bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-IN') : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment &amp; Terms</span>
                <span className="font-semibold text-slate-700">{bill.paymentTerms || 'CREDIT'}</span>
                <div className="text-slate-500">Bill Total: ₹{Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Reason & Notes Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Return (Debit Note) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
                >
                  <option value="DEFECTIVE">Defective / Damaged Goods</option>
                  <option value="EXPIRED">Expired / Near Expiry Stock</option>
                  <option value="EXCESS_SUPPLY">Excess / Incorrect Supply</option>
                  <option value="RATE_DIFFERENCE">Rate / Pricing Discrepancy</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Debit Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Broken packaging / Transporter damage"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Items Selection Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800">
                  Select Line Items to Return
                </label>
                <span className="text-[11px] text-slate-500">
                  {selectedItemsPayload.length} of {bill.items?.length || 0} item(s) selected
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="p-3">Item / Part</th>
                      <th className="p-3 text-right">Inward Qty</th>
                      <th className="p-3 text-right">Available Stock</th>
                      <th className="p-3 text-center w-32">Return Qty</th>
                      <th className="p-3 text-right">Cost Rate</th>
                      <th className="p-3 text-right">GST %</th>
                      <th className="p-3 text-right">Debit Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bill.items?.map((item: any) => {
                      const state = returnItems[item.id] || { selected: false, quantity: item.quantity };
                      const inwardQty = Number(item.quantity) || 1;
                      const availableStock = item.product?.currentStock != null ? Number(item.product.currentStock) : inwardQty;
                      const maxAllowed = Math.min(inwardQty, availableStock);
                      const rate = Number(item.purchasePrice) || 0;
                      const gstRate = Number(item.gstRate || item.product?.gstRate || 0);
                      const lineTaxable = state.quantity * rate;
                      const lineTax = (lineTaxable * gstRate) / 100;
                      const lineTotal = lineTaxable + lineTax;
                      const isStockExceeded = availableStock < inwardQty;

                      return (
                        <tr
                          key={item.id}
                          className={`transition ${state.selected ? 'bg-rose-50/40' : 'hover:bg-slate-50'}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={state.selected}
                              onChange={() => handleToggleItem(item.id)}
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer h-4 w-4"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{item.product?.name || item.productName || 'Product'}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                              {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                              {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            {inwardQty} {item.unit || item.product?.baseUnit || 'PCS'}
                          </td>
                          <td className="p-3 text-right font-mono">
                            <span className={availableStock <= 0 ? 'text-red-600 font-bold' : isStockExceeded ? 'text-amber-600 font-semibold' : 'text-slate-700'}>
                              {availableStock}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              max={availableStock}
                              disabled={!state.selected}
                              value={state.quantity}
                              onChange={(e) => handleQtyChange(item.id, availableStock, parseFloat(e.target.value) || 0)}
                              className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs text-center font-mono font-bold text-slate-800 disabled:opacity-40 disabled:bg-slate-100 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
                            />
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            ₹{rate.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {gstRate}%
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {state.selected ? `₹${lineTotal.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & Summary Bar */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div>
                    <span className="font-semibold text-slate-700">GST Reversal Effect:</span>
                    {bill.supplierGstin ? ' Reverses claimed Input Tax Credit (ITC)' : ' Reverses purchase expense'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Reduces Supplier Accounts Payable balance by total debit note value.
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-auto font-mono text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">Taxable Return</span>
                    <span className="text-xs font-semibold text-slate-700">
                      ₹{computedTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">GST Reversal</span>
                    <span className="text-xs font-semibold text-rose-600">
                      ₹{computedTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pl-3 border-l border-slate-300">
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">Debit Note Total</span>
                    <span className="text-base font-bold text-rose-700">
                      ₹{computedTotalDebitNote.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Form Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedItemsPayload.length === 0}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>Processing Debit Note...</>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Issue Debit Note ({selectedItemsPayload.length} Items)
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
