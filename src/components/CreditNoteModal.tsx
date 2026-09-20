'use client';

import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface CreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: (creditNote: any) => void;
}

export default function CreditNoteModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: CreditNoteModalProps) {
  const [reason, setReason] = useState<string>("SALES_RETURN");
  const [refundMode, setRefundMode] = useState<string>("CASH");
  const [remarks, setRemarks] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize selected items state from invoice items
  const [returnItems, setReturnItems] = useState<{
    [itemId: string]: {
      selected: boolean;
      quantity: number;
      restock: boolean;
    };
  }>(() => {
    const initial: any = {};
    (invoice?.items || []).forEach((item: any) => {
      initial[item.id] = {
        selected: false,
        quantity: Math.min(Number(item.quantity) || 1, 1),
        restock: true,
      };
    });
    return initial;
  });

  if (!isOpen || !invoice) return null;

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
    const clamped = Math.max(0.001, Math.min(maxQty, val));
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: clamped,
      },
    }));
  };

  const handleRestockToggle = (itemId: string) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        restock: !prev[itemId]?.restock,
      },
    }));
  };

  // Compute live totals
  let computedTaxable = 0;
  let computedCgst = 0;
  let computedSgst = 0;
  let computedIgst = 0;

  const selectedPayloadItems: any[] = [];

  (invoice.items || []).forEach((item: any) => {
    const state = returnItems[item.id];
    if (state?.selected) {
      const qty = Number(state.quantity);
      const unitPrice = Number(item.unitPrice);
      const lineTaxable = unitPrice * qty;
      const gstRate = Number(item.gstRate || 0);

      computedTaxable += lineTaxable;

      if (invoice.isInterState) {
        computedIgst += (lineTaxable * gstRate) / 100;
      } else {
        const halfTax = (lineTaxable * (gstRate / 2)) / 100;
        computedCgst += halfTax;
        computedSgst += halfTax;
      }

      selectedPayloadItems.push({
        productId: item.productId,
        invoiceItemId: item.id,
        productName: item.productName || item.name || "Item",
        hsnCode: item.hsnCode || "9983",
        unitReturned: item.unitSold || "PCS",
        quantity: qty,
        unitPrice: unitPrice,
        conversionFactor: Number(item.conversionFactor || 1),
        gstRate: gstRate,
        restock: state.restock,
      });
    }
  });

  const computedTotalTax = computedCgst + computedSgst + computedIgst;
  const computedTotalRefund = computedTaxable + computedTotalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPayloadItems.length === 0) {
      setErrorMessage("Please select at least one item to return.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          reason,
          refundMode,
          remarks: remarks.trim() || undefined,
          items: selectedPayloadItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate Credit Note");
      }

      onSuccess(data.creditNote);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Issue GST Credit Note / Sales Return
              </h3>
              <p className="text-xs text-gray-500">
                Against Invoice #{invoice.invoiceNumber} • {invoice.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Reason & Refund Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Credit Note (GST Rule 53)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="SALES_RETURN">Sales Return (Returned Goods)</option>
                <option value="DEFICIENT_GOODS">Deficient / Damaged Goods</option>
                <option value="POST_SALE_DISCOUNT">Post-Sale Discount / Rebate</option>
                <option value="INVOICE_CORRECTION">Correction in Tax Invoice</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Refund Method
              </label>
              <select
                value={refundMode}
                onChange={(e) => setRefundMode(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="CASH">Cash Refund</option>
                <option value="UPI">UPI Payment</option>
                <option value="CREDIT">Adjust Customer Khata (Credit)</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              </select>
            </div>
          </div>

          {/* Line Items Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">
                Select Items to Return
              </label>
              <span className="text-xs text-gray-400">
                {selectedPayloadItems.length} item(s) selected
              </span>
            </div>

            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {(invoice.items || []).map((item: any) => {
                const isSelected = returnItems[item.id]?.selected || false;
                const maxQty = Number(item.quantity) || 1;
                const currentQty = returnItems[item.id]?.quantity || 1;
                const restock = returnItems[item.id]?.restock ?? true;

                return (
                  <div
                    key={item.id}
                    className={`p-3 transition ${
                      isSelected ? "bg-amber-50/50" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(item.id)}
                          className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.productName || item.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Sold: {item.quantity} {item.unitSold || "PCS"} @ ₹{Number(item.unitPrice).toFixed(2)} • GST {item.gstRate}%
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">Return Qty:</span>
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              max={maxQty}
                              value={currentQty}
                              onChange={(e) =>
                                handleQtyChange(
                                  item.id,
                                  maxQty,
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right text-xs font-semibold focus:border-amber-500 focus:outline-none"
                            />
                            <span className="text-xs text-gray-500">
                              {item.unitSold || "PCS"}
                            </span>
                          </div>

                          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={restock}
                              onChange={() => handleRestockToggle(item.id)}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Restock</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Internal Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Customer returned due to wrong model size"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Calculation Summary */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Taxable Value Reversal:</span>
              <span className="font-semibold">₹{computedTaxable.toFixed(2)}</span>
            </div>
            {computedCgst > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>CGST Reversal:</span>
                <span className="font-semibold">₹{computedCgst.toFixed(2)}</span>
              </div>
            )}
            {computedSgst > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>SGST Reversal:</span>
                <span className="font-semibold">₹{computedSgst.toFixed(2)}</span>
              </div>
            )}
            {computedIgst > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>IGST Reversal:</span>
                <span className="font-semibold">₹{computedIgst.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
              <span>Total Refund / Credit:</span>
              <span className="text-amber-600 font-extrabold">
                ₹{computedTotalRefund.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedPayloadItems.length === 0}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Issuing CN...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Generate Credit Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
