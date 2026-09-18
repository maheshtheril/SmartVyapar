'use client';

import React, { useState } from 'react';
import { 
  X, 
  Truck, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  FileCheck2,
  ExternalLink,
  MapPin,
  Clock
} from 'lucide-react';

export interface EWayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess?: () => void;
}

export default function EWayBillModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: EWayBillModalProps) {
  if (!isOpen || !invoice) return null;

  const isStatutoryMandatory = Number(invoice.totalAmount || 0) >= 50000;

  const [transDistance, setTransDistance] = useState<number>(invoice.transDistance || 50);
  const [transMode, setTransMode] = useState<string>(invoice.transportMode || "1");
  const [vehicleNo, setVehicleNo] = useState<string>(invoice.vehicleNo || "");
  const [vehicleType, setVehicleType] = useState<string>(invoice.vehicleType || "R");
  const [transporterId, setTransporterId] = useState<string>(invoice.transporterId || "");
  const [transporterName, setTransporterName] = useState<string>(invoice.transporterName || "");
  const [transDocNo, setTransDocNo] = useState<string>(invoice.transDocNo || "");
  const [transDocDate, setTransDocDate] = useState<string>(
    invoice.transDocDate ? new Date(invoice.transDocDate).toISOString().split("T")[0] : ""
  );

  const [ewayBillNoInput, setEwayBillNoInput] = useState<string>(invoice.ewayBillNo || "");
  const [submitting, setSubmitting] = useState(false);
  const [savingEwbNo, setSavingEwbNo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDownloadNicJson = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const payload = {
        transDistance: Number(transDistance),
        transMode,
        vehicleNo: vehicleNo.trim() ? vehicleNo.trim().toUpperCase().replace(/[\s\-_]/g, "") : null,
        vehicleType,
        transporterId: transporterId.trim() ? transporterId.trim().toUpperCase() : null,
        transporterName: transporterName.trim() || null,
        transDocNo: transDocNo.trim() || null,
        transDocDate: transDocDate || null,
        ewayBillNo: ewayBillNoInput.trim() || undefined,
      };

      const res = await fetch(`/api/invoices/${invoice.id}/eway-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.issues && Array.isArray(data.issues)) {
          throw new Error(data.issues.map((i: any) => i.message).join(", "));
        }
        throw new Error(data.error || "Failed to generate E-Way Bill JSON");
      }

      // Download NIC JSON
      const jsonBlob = new Blob([JSON.stringify(data.nicPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(jsonBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoiceNumber}_NIC_EWAYBILL.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage(
        "NIC JSON generated and downloaded! Upload this file to ewaybillgst.gov.in under 'Generate Bulk'."
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEwbNumber = async () => {
    if (!/^\d{12}$/.test(ewayBillNoInput.trim())) {
      setErrorMessage("Please enter a valid 12-digit numeric E-Way Bill Number.");
      return;
    }

    setErrorMessage(null);
    setSavingEwbNo(true);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/eway-bill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ewayBillNo: ewayBillNoInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save E-Way Bill Number");
      }

      setSuccessMessage("12-digit E-Way Bill Number saved to this invoice!");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
    } finally {
      setSavingEwbNo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                GST E-Way Bill Generator (Rule 138)
              </h3>
              <p className="text-xs text-slate-500">
                Invoice #{invoice.invoiceNumber} • ₹{Number(invoice.totalAmount).toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mandatory Alert Banner if > ₹50,000 */}
        {isStatutoryMandatory && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Statutory Compliance:</strong> Movement of goods with invoice value exceeding ₹50,000 mandates an E-Way Bill prior to dispatch.
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleDownloadNicJson} className="p-6 space-y-5">
          {/* Part A: Invoice Summary Card */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Consignee (Customer):</span>
              <span className="font-bold text-slate-900">{invoice.customerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Customer GSTIN:</span>
              <span className="font-semibold text-slate-800">
                {invoice.customerGstin || "URP (Unregistered)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Destination State Code:</span>
              <span className="font-semibold text-slate-800">{invoice.customerStateCode}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 font-bold">
              <span className="text-slate-700">Total Invoice Value (₹):</span>
              <span className="text-indigo-600 text-sm">₹{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          {/* Part B: Transport Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              <span>Part-B Transport & Vehicle Details</span>
            </h4>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode of Transport *
                  </label>
                  <select
                    value={transMode}
                    onChange={(e) => setTransMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  >
                    <option value="1">1 - Road</option>
                    <option value="2">2 - Rail</option>
                    <option value="3">3 - Air</option>
                    <option value="4">4 - Ship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approximate Distance (in KM) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={4000}
                    value={transDistance}
                    onChange={(e) => setTransDistance(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle Number {transMode === "1" ? "*" : "(Optional)"}
                  </label>
                  <input
                    type="text"
                    required={transMode === "1"}
                    placeholder="e.g. KL07AB1234"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  >
                    <option value="R">Regular Cargo (R)</option>
                    <option value="O">Over Dimensional Cargo (O)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transporter GSTIN / TRANSIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 32TRANS0000A1Z5"
                    value={transporterId}
                    onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transporter Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VRL Logistics / BlueDart"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transporter Doc No (LR / RR / Airway Bill)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LR-98124"
                    value={transDocNo}
                    onChange={(e) => setTransDocNo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transporter Doc Date
                  </label>
                  <input
                    type="date"
                    value={transDocDate}
                    onChange={(e) => setTransDocDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Download NIC JSON Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Generating NIC JSON...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download Official NIC E-Way Bill JSON</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-1.5">
              Directly uploadable to <strong>ewaybillgst.gov.in &gt; e-Waybill &gt; Generate Bulk</strong>
            </p>
          </div>
        </form>

        {/* Section to Record Issued E-Way Bill Number */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-6 rounded-b-3xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
            <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Record Government-Issued 12-Digit E-Way Bill Number</span>
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            Once generated on the NIC portal, paste the 12-digit number here to print it on the delivery challan &amp; tax invoice.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              maxLength={12}
              placeholder="e.g. 121012345678"
              value={ewayBillNoInput}
              onChange={(e) => setEwayBillNoInput(e.target.value.replace(/\D/g, ""))}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold tracking-wider text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveEwbNumber}
              disabled={savingEwbNo || ewayBillNoInput.trim().length !== 12}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
            >
              {savingEwbNo ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>Save EWB #</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
