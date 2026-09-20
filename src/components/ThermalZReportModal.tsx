"use client";

import React, { useRef, useState } from "react";
import { Printer, X, CheckCircle, AlertTriangle, ArrowDownRight, Wallet, Store, Zap } from "lucide-react";
import { buildEscposZReport, printDirectHardware, isWebSerialSupported, isWebUsbSupported } from "@/lib/escpos";

export interface ZReportData {
  tenant?: {
    businessName?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    gstin?: string;
  } | null;
  shift: {
    id: string;
    shiftNumber: string;
    openedAt: string | Date;
    closedAt?: string | Date | null;
    openedByName: string;
    closedByName?: string | null;
    openingFloat: number | string;
    cashSales?: number | string;
    upiSales?: number | string;
    cardSales?: number | string;
    creditSales?: number | string;
    grossSales?: number | string;
    cashPayouts?: number | string;
    expectedCash?: number | string;
    actualCashCounted?: number | string;
    cashDifference?: number | string;
    closingNotes?: string | null;
  };
  billCount?: number;
  openingFloat?: number | string;
  sales?: {
    cash: number;
    upi: number;
    card: number;
    credit: number;
    gross: number;
  };
  payouts?: {
    total: number;
    items: Array<{ id: string; amount: number | string; reason: string; paidTo?: string | null; createdAt: string | Date }>;
  };
  reconciliation?: {
    expectedCash: number;
    actualCash: number;
    variance: number;
    varianceType: "BALANCED" | "EXCESS" | "SHORTAGE";
  };
  denominations?: {
    500?: number;
    200?: number;
    100?: number;
    50?: number;
    20?: number;
    10?: number;
    coins?: number;
  };
  closedAt?: string;
  closedByName?: string | null;
}

interface ThermalZReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ZReportData | null;
}

export default function ThermalZReportModal({ isOpen, onClose, data }: ThermalZReportModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [printingDirect, setPrintingDirect] = useState(false);

  if (!isOpen || !data) return null;

  const { shift, tenant, payouts, reconciliation, denominations } = data;
  const isHardwareSupported = isWebSerialSupported() || isWebUsbSupported();

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Z-Report - ${shift.shiftNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 3mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.35;
              color: #000;
              margin: 0;
              padding: 6px;
              width: 72mm;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-lg { font-size: 14px; }
            .text-xl { font-size: 16px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px double #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .badge { border: 1px solid #000; padding: 2px 4px; display: inline-block; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const expCash = Number(reconciliation?.expectedCash ?? shift.expectedCash ?? 0);
  const actCash = Number(reconciliation?.actualCash ?? shift.actualCashCounted ?? 0);
  const diff = Number(reconciliation?.variance ?? shift.cashDifference ?? 0);
  const isBalanced = Math.abs(diff) < 0.01;
  const isShortage = diff < -0.01;
  const isExcess = diff > 0.01;

  const gross = Number(data.sales?.gross ?? shift.grossSales ?? 0);
  const cashSales = Number(data.sales?.cash ?? shift.cashSales ?? 0);
  const upiSales = Number(data.sales?.upi ?? shift.upiSales ?? 0);
  const cardSales = Number(data.sales?.card ?? shift.cardSales ?? 0);
  const creditSales = Number(data.sales?.credit ?? shift.creditSales ?? 0);
  const totalPayouts = Number(payouts?.total ?? shift.cashPayouts ?? 0);
  const openFloat = Number(data.openingFloat ?? shift.openingFloat ?? 0);

  const handleDirectZReportPrint = async () => {
    setPrintingDirect(true);
    try {
      const bytes = buildEscposZReport({
        businessName: tenant?.businessName || "SMARTVYAPAR STORE",
        businessGstin: tenant?.gstin,
        businessAddress: tenant?.address,
        businessPhone: tenant?.phone,
        shiftNumber: shift.shiftNumber,
        openedAt: new Date(shift.openedAt).toLocaleString("en-IN"),
        closedAt: shift.closedAt ? new Date(shift.closedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN"),
        openedByName: shift.openedByName,
        closedByName: shift.closedByName || undefined,
        billCount: data.billCount ?? 0,
        openingFloat: openFloat,
        sales: {
          cash: cashSales,
          upi: upiSales,
          card: cardSales,
          credit: creditSales,
          gross: gross,
        },
        payouts: {
          total: totalPayouts,
          items: payouts?.items ? payouts.items.map((p) => ({ reason: p.reason, amount: Number(p.amount) })) : [],
        },
        expectedCash: expCash,
        actualCash: actCash,
        variance: diff,
        paperWidth: "80mm",
      });

      const res = await printDirectHardware(bytes);
      if (!res.success) {
        alert(res.error || "Direct silent print failed. Falling back to browser print dialog.");
        handlePrint();
      }
    } catch (err: any) {
      alert("Direct print error: " + err.message);
      handlePrint();
    } finally {
      setPrintingDirect(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Z-Report / Day-End Settlement</h2>
              <p className="text-xs text-slate-500">Official Shift Audit Slip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
          <div
            ref={printAreaRef}
            className="mx-auto max-w-[340px] rounded-lg bg-white p-5 shadow-sm border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed"
          >
            {/* Store Header */}
            <div className="text-center">
              <div className="text-base font-bold uppercase tracking-wider text-slate-900">
                {tenant?.businessName || "SMARTVYAPAR STORE"}
              </div>
              {tenant?.address && <div className="text-[11px] text-slate-600">{tenant.address}</div>}
              {(tenant?.city || tenant?.state) && (
                <div className="text-[11px] text-slate-600">
                  {[tenant.city, tenant.state].filter(Boolean).join(", ")}
                </div>
              )}
              {tenant?.phone && <div className="text-[11px] text-slate-600">Ph: {tenant.phone}</div>}
              {tenant?.gstin && <div className="text-[11px] font-semibold">GSTIN: {tenant.gstin}</div>}
            </div>

            <div className="my-2 border-t border-dashed border-slate-400" />

            <div className="text-center">
              <div className="font-bold text-sm text-slate-900 tracking-wider">*** END-OF-DAY Z-REPORT ***</div>
              <div className="text-[11px] font-medium text-slate-700">SHIFT: {shift.shiftNumber}</div>
            </div>

            <div className="my-2 border-t border-dashed border-slate-400" />

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Opened:</span>
                <span>{new Date(shift.openedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              <div className="flex justify-between">
                <span>Closed:</span>
                <span>
                  {shift.closedAt
                    ? new Date(shift.closedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
                    : new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span className="font-bold">{shift.openedByName}</span>
              </div>
              {shift.closedByName && shift.closedByName !== shift.openedByName && (
                <div className="flex justify-between">
                  <span>Closed By:</span>
                  <span className="font-bold">{shift.closedByName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Total Bills:</span>
                <span className="font-bold">{data.billCount ?? 0}</span>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-slate-400" />

            {/* Sales Section */}
            <div className="font-bold text-[11px] uppercase tracking-wide text-slate-900 mb-1">SALES SUMMARY</div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>(+) Cash Sales</span>
                <span className="font-semibold">₹{cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) UPI / QR Sales</span>
                <span>₹{upiSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) Card / POS Sales</span>
                <span>₹{cardSales.toFixed(2)}</span>
              </div>
              {creditSales > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>(+) Credit (Udhar)</span>
                  <span>₹{creditSales.toFixed(2)}</span>
                </div>
              )}
              <div className="my-1 border-t border-slate-300" />
              <div className="flex justify-between font-bold text-slate-900">
                <span>GROSS SALES</span>
                <span>₹{gross.toFixed(2)}</span>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-slate-400" />

            {/* Cash Drawer Reconciliation */}
            <div className="font-bold text-[11px] uppercase tracking-wide text-slate-900 mb-1">CASH RECONCILIATION</div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Opening Float</span>
                <span>₹{openFloat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) Cash Sales</span>
                <span>₹{cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>(-) Petty Cash Payouts</span>
                <span>-₹{totalPayouts.toFixed(2)}</span>
              </div>
              <div className="my-1 border-t border-slate-300" />
              <div className="flex justify-between font-semibold">
                <span>Expected in Till:</span>
                <span>₹{expCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Actual Counted:</span>
                <span>₹{actCash.toFixed(2)}</span>
              </div>
              <div className="my-1 border-t border-slate-300" />

              <div
                className={`flex justify-between font-bold py-1 px-1.5 rounded ${
                  isBalanced
                    ? "bg-emerald-50 text-emerald-800"
                    : isExcess
                    ? "bg-blue-50 text-blue-800"
                    : "bg-rose-50 text-rose-800"
                }`}
              >
                <span>VARIANCE:</span>
                <span>
                  {isBalanced
                    ? "₹0.00 (PERFECT)"
                    : isExcess
                    ? `+₹${Math.abs(diff).toFixed(2)} (EXCESS)`
                    : `-₹${Math.abs(diff).toFixed(2)} (SHORTAGE)`}
                </span>
              </div>
            </div>

            {/* Denomination Detail */}
            {denominations && (
              <>
                <div className="my-2 border-t border-dashed border-slate-400" />
                <div className="font-bold text-[11px] uppercase tracking-wide text-slate-900 mb-1">
                  DENOMINATIONS COUNTED
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                  <div>₹500 × {denominations[500] || 0} = ₹{(Number(denominations[500] || 0) * 500).toFixed(0)}</div>
                  <div>₹200 × {denominations[200] || 0} = ₹{(Number(denominations[200] || 0) * 200).toFixed(0)}</div>
                  <div>₹100 × {denominations[100] || 0} = ₹{(Number(denominations[100] || 0) * 100).toFixed(0)}</div>
                  <div>₹50  × {denominations[50]  || 0} = ₹{(Number(denominations[50]  || 0) * 50).toFixed(0)}</div>
                  <div>₹20  × {denominations[20]  || 0} = ₹{(Number(denominations[20]  || 0) * 20).toFixed(0)}</div>
                  <div>₹10  × {denominations[10]  || 0} = ₹{(Number(denominations[10]  || 0) * 10).toFixed(0)}</div>
                  <div className="col-span-2">Coins / Loose = ₹{Number(denominations.coins || 0).toFixed(2)}</div>
                </div>
              </>
            )}

            {/* Petty Cash List */}
            {payouts && payouts.items && payouts.items.length > 0 && (
              <>
                <div className="my-2 border-t border-dashed border-slate-400" />
                <div className="font-bold text-[11px] uppercase tracking-wide text-slate-900 mb-1">
                  PETTY CASH OUT ({payouts.items.length})
                </div>
                <div className="space-y-1 text-[10px]">
                  {payouts.items.map((p, idx) => (
                    <div key={p.id || idx} className="flex justify-between">
                      <span className="truncate max-w-[190px]">
                        • {p.reason} {p.paidTo ? `(${p.paidTo})` : ""}
                      </span>
                      <span>₹{Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {shift.closingNotes && (
              <>
                <div className="my-2 border-t border-dashed border-slate-400" />
                <div className="text-[10px] italic text-slate-600">
                  <span className="font-semibold">Note:</span> {shift.closingNotes}
                </div>
              </>
            )}

            <div className="my-4 border-t border-dashed border-slate-400" />

            {/* Signatures */}
            <div className="pt-6 space-y-6 text-[10px]">
              <div className="border-t border-slate-800 pt-1 text-center font-bold">
                CASHIER SIGNATURE
              </div>
              <div className="border-t border-slate-800 pt-1 text-center font-bold">
                MANAGER / AUDITOR SIGNATURE
              </div>
            </div>

            <div className="mt-4 text-center text-[9px] text-slate-500">
              Generated by SmartVyapar POS • All rights reserved
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3.5">
          <div className="text-xs text-slate-500">
            {isBalanced ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle className="h-4 w-4" /> Balanced Shift
              </span>
            ) : isShortage ? (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                <AlertTriangle className="h-4 w-4" /> Shortage of ₹{Math.abs(diff).toFixed(2)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                <AlertTriangle className="h-4 w-4" /> Excess of ₹{Math.abs(diff).toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
            {isHardwareSupported && (
              <button
                onClick={handleDirectZReportPrint}
                disabled={printingDirect}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black transition disabled:opacity-50"
                title="Send raw ESC/POS commands directly to USB/Serial Thermal Printer"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                {printingDirect ? "Printing..." : "⚡ Silent Print (1-Click)"}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Printer className="h-4 w-4" />
              Standard Print Dialog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
