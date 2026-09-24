'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldAlert,
  Clock,
  Ban,
  QrCode,
  Building2,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';

export interface EInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess?: () => void;
}

export default function EInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: EInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedIrn, setCopiedIrn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cancellation State
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState<'1' | '2' | '3' | '4'>('2');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Load latest details whenever modal opens
  useEffect(() => {
    if (isOpen && invoice?.id) {
      fetchEinvoiceDetails();
    } else {
      setData(null);
      setQrDataUrl('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setShowCancelDialog(false);
    }
  }, [isOpen, invoice?.id]);

  const fetchEinvoiceDetails = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/einvoice`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch e-invoice status');
      }
      setData(json);

      // Render Signed QR code if available
      const qrPayload = json.invoice?.signedQrCode || invoice.signedQrCode;
      if (qrPayload) {
        const url = await QRCode.toDataURL(qrPayload, {
          width: 240,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEinvoice = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/einvoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate E-Invoice');
      }

      setSuccessMessage('E-Invoice IRN and Signed QR Code successfully generated!');
      await fetchEinvoiceDetails();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNicJson = () => {
    if (!data?.nicPayload) return;
    const jsonBlob = new Blob([JSON.stringify(data.nicPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}_NIC_EINVOICE.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCancelEinvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelling(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/einvoice`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelReason,
          cancelRemarks: cancelRemarks.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to cancel E-Invoice');
      }

      setSuccessMessage('E-Invoice IRN cancelled successfully.');
      setShowCancelDialog(false);
      await fetchEinvoiceDetails();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyIrn = (irnText: string) => {
    navigator.clipboard.writeText(irnText);
    setCopiedIrn(true);
    setTimeout(() => setCopiedIrn(false), 2000);
  };

  if (!isOpen || !invoice) return null;

  const currentStatus = data?.invoice?.einvoiceStatus || invoice.einvoiceStatus || 'PENDING';
  const irn = data?.invoice?.irn || invoice.irn;
  const ackNo = data?.invoice?.ackNo || invoice.ackNo;
  const ackDate = data?.invoice?.ackDate || invoice.ackDate;
  const cancelEligibility = data?.cancelEligibility;
  const isB2B = Boolean(invoice.customerGstin && invoice.customerGstin.length === 15);
  const isSimulated = data?.invoice?.einvoiceIsSimulated ?? invoice.einvoiceIsSimulated ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg text-white">
                  Statutory E-Invoice (IRN)
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-500/30 text-indigo-300">
                  GST Rule 48(4)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Invoice #{invoice.invoiceNumber} • ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Messages */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800 text-sm animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Statutory E-Invoice Notice</p>
                <p className="text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-sm animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          {/* Customer & Tax Type Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900 text-sm">
                  {invoice.customerName || 'Walk-in Customer'}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-x-2">
                <span>
                  GSTIN:{' '}
                  <strong className="text-slate-800">
                    {invoice.customerGstin || 'Unregistered (B2C)'}
                  </strong>
                </span>
                <span>•</span>
                <span>State Code: {invoice.customerStateCode || '32'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  isB2B
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isB2B ? 'B2B Mandatory' : 'B2C Standard'}
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  currentStatus === 'GENERATED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : currentStatus === 'CANCELLED'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {currentStatus === 'GENERATED'
                  ? 'IRN Active'
                  : currentStatus === 'CANCELLED'
                  ? 'IRN Cancelled'
                  : 'IRN Pending'}
              </span>
            </div>
          </div>

          {/* ACTIVE IRN STATE */}
          {currentStatus === 'GENERATED' && irn && (
            <div className="space-y-5 animate-in fade-in">
              {isSimulated && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Simulated E-Invoice</p>
                    <p className="text-amber-800 mt-0.5">This E-Invoice payload was generated locally for offline upload. It has NOT been registered with the official IRP portal.</p>
                  </div>
                </div>
              )}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
                    64-Character Invoice Reference Number (IRN)
                  </span>
                  <button
                    onClick={() => handleCopyIrn(irn)}
                    className="flex items-center space-x-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium bg-emerald-100 px-2 py-1 rounded-md transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedIrn ? 'Copied!' : 'Copy IRN'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-emerald-950 bg-white p-3 rounded-lg border border-emerald-200 break-all select-all font-semibold shadow-sm">
                  {irn}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-500">Acknowledgment No:</span>{' '}
                    <strong className="font-mono text-slate-900">{ackNo || 'Pending'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Ack Timestamp:</span>{' '}
                    <strong className="text-slate-900">
                      {ackDate ? new Date(ackDate).toLocaleString('en-IN') : 'N/A'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* QR Code and Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {qrDataUrl ? (
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 shrink-0">
                    <img
                      src={qrDataUrl}
                      alt="B2B Statutory Signed QR Code"
                      className="w-36 h-36"
                    />
                    <p className="text-[10px] text-center text-slate-500 font-medium mt-1">
                      NIC Signed QR
                    </p>
                  </div>
                ) : (
                  <div className="w-36 h-36 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                    <QrCode className="w-10 h-10" />
                  </div>
                )}

                <div className="space-y-3 w-full">
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      NIC Compliance Verified
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      This QR code contains the digital cryptographic signature verified by the
                      Goods and Services Tax Network (GSTN). Printed tax invoices include this QR
                      code automatically.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={handleDownloadNicJson}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium rounded-lg border border-indigo-200 transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download INV-01 JSON</span>
                    </button>

                    <button
                      onClick={() => setShowCancelDialog(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium rounded-lg border border-red-200 transition shadow-sm"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel IRN</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cancellation Dialog Inline */}
              {showCancelDialog && (
                <form
                  onSubmit={handleCancelEinvoice}
                  className="p-4 bg-red-50/80 border border-red-200 rounded-xl space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center space-x-2 text-red-900">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <h4 className="font-semibold text-xs uppercase tracking-wider">
                      Statutory IRN Cancellation (Rule 48(4))
                    </h4>
                  </div>
                  <p className="text-xs text-red-800">
                    IRN can only be cancelled within <strong>24 hours</strong> of generation.
                    Once cancelled, the same invoice number cannot be re-registered.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Cancellation Reason *
                      </label>
                      <select
                        value={cancelReason}
                        onChange={(e: any) => setCancelReason(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-red-500"
                      >
                        <option value="1">1: Duplicate</option>
                        <option value="2">2: Data entry mistake</option>
                        <option value="3">3: Order cancelled</option>
                        <option value="4">4: Others</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        value={cancelRemarks}
                        onChange={(e) => setCancelRemarks(e.target.value)}
                        placeholder="e.g. Incorrect quantity entered"
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-red-500"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelDialog(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      disabled={cancelling}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg flex items-center space-x-1 disabled:opacity-50"
                    >
                      {cancelling ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <span>Confirm IRN Cancellation</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* CANCELLED STATE */}
          {currentStatus === 'CANCELLED' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center space-x-2 text-red-900 font-semibold text-sm">
                <Ban className="w-4 h-4 text-red-600" />
                <span>IRN Cancelled on Government Portal</span>
              </div>
              <p className="text-red-700">
                Reason:{' '}
                <strong>{data?.invoice?.einvoiceCancelReason || invoice.einvoiceCancelReason}</strong>
              </p>
              {data?.invoice?.einvoiceCancelDate && (
                <p className="text-red-600">
                  Cancelled At: {new Date(data.invoice.einvoiceCancelDate).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )}

          {/* PENDING STATE */}
          {currentStatus === 'PENDING' && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-semibold text-slate-900 text-sm">
                  Register E-Invoice with NIC Portal
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Generates the unique 64-character SHA-256 IRN hash, 16-digit acknowledgment number,
                  and signed B2B QR code for official GST compliance.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={handleGenerateEinvoice}
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating IRN...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>Generate E-Invoice (IRN)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Statutory Guidelines Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Statutory Compliance Notes (Rule 48(4)):</span>
            </div>
            <p>
              1. <strong>Mandatory B2B Scope</strong>: Invoices issued to GST-registered businesses must carry the official IRN and Signed QR code to be legally valid for input tax credit (ITC).
            </p>
            <p>
              2. <strong>24-Hour Cancellation</strong>: Under GST rules, an IRN can only be cancelled within 24 hours of generation on the IRP. After 24 hours, you must issue a Credit Note.
            </p>
            <p>
              3. <strong>Bulk Manual Upload</strong>: You can also click <em>Download INV-01 JSON</em> and upload directly to <code>einvoice1.gst.gov.in</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>SmartVyapar Statutory Compliance Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
