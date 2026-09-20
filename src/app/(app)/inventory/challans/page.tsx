'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Printer,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowUpRight,
  X,
  Trash2
} from 'lucide-react';

export default function DeliveryChallansPage() {
  const [challans, setChallans] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ totalChallans: 0, openChallans: 0, convertedChallans: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State for New Challan
  const [formPurpose, setFormPurpose] = useState<string>('SUPPLY_ON_APPROVAL');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [recipientGstin, setRecipientGstin] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [transporterName, setTransporterName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<any[]>([
    { productName: '', hsnCode: '9983', quantity: 1, unit: 'PCS', unitPrice: 0, gstRate: 18 },
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchChallans = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = searchQuery ? `/api/challans?q=${encodeURIComponent(searchQuery)}` : '/api/challans';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch challans');
      }
      setChallans(data.challans || []);
      setMetrics(data.metrics || { totalChallans: 0, openChallans: 0, convertedChallans: 0 });
    } catch (err: any) {
      setError(err.message || 'Error loading challans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChallans();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { productName: '', hsnCode: '9983', quantity: 1, unit: 'PCS', unitPrice: 0, gstRate: 18 },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    setItems(next);
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      setError('Please provide recipient / customer name');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: formPurpose,
          recipientName,
          recipientPhone,
          recipientAddress,
          recipientGstin,
          vehicleNo,
          transporterName,
          notes,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create Delivery Challan');
      }
      setSuccessMessage(`Delivery Challan ${data.challan?.challanNumber} issued successfully!`);
      setShowCreateModal(false);
      // Reset form
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAddress('');
      setRecipientGstin('');
      setVehicleNo('');
      setTransporterName('');
      setNotes('');
      setItems([{ productName: '', hsnCode: '9983', quantity: 1, unit: 'PCS', unitPrice: 0, gstRate: 18 }]);
      fetchChallans();
    } catch (err: any) {
      setError(err.message || 'Error saving challan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToInvoice = async (challanId: string) => {
    if (!confirm('Are you sure you want to convert this Delivery Challan into a Tax Invoice?')) return;
    setConvertingId(challanId);
    setError(null);
    try {
      const res = await fetch(`/api/challans/${challanId}/convert`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert challan');
      }
      setSuccessMessage(data.message || 'Challan converted to Tax Invoice successfully!');
      fetchChallans();
    } catch (err: any) {
      setError(err.message || 'Conversion failed');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Delivery Challans & Movement of Goods (Rule 55)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Statutory transport document for supply on approval, job work, demonstrations, or non-sale dispatches
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchChallans}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition"
          >
            <PlusCircle className="h-4 w-4" />
            New Delivery Challan
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Challans Issued</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalChallans}</p>
          <p className="text-[10px] text-slate-500 mt-1">Rule 55 documents registered</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open / Dispatched</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{metrics.openChallans}</p>
          <p className="text-[10px] text-slate-500 mt-1">Goods on approval / at customer site</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Converted to Invoice</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.convertedChallans}</p>
          <p className="text-[10px] text-slate-500 mt-1">Confirmed sales billed to ledger</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-6 flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Challan Number (e.g. DC-), Recipient Name, or Vehicle No..."
          className="w-full text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 mr-2">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Challan Number</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Purpose</th>
                <th className="p-3.5">Recipient</th>
                <th className="p-3.5">Vehicle</th>
                <th className="p-3.5 text-right">Taxable</th>
                <th className="p-3.5 text-right font-black">Total Value</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading Delivery Challans...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No Delivery Challans found. Click &quot;New Delivery Challan&quot; to issue one.
                  </td>
                </tr>
              ) : (
                challans.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition text-slate-800">
                    <td className="p-3.5 font-mono font-bold text-indigo-600">
                      {c.challanNumber}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(c.challanDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {c.purpose?.replace(/_/g, ' ') || 'APPROVAL'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{c.recipientName}</div>
                      {c.recipientPhone && <div className="text-[10px] text-slate-400">{c.recipientPhone}</div>}
                    </td>
                    <td className="p-3.5 font-mono text-slate-700">
                      {c.vehicleNo || 'N/A'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      ₹{Number(c.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900">
                      ₹{Number(c.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5">
                      {c.status === 'CONVERTED_TO_INVOICE' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          <CheckCircle2 className="h-3 w-3" />
                          Billed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          Dispatched
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {c.status === 'CONVERTED_TO_INVOICE' ? (
                        <Link
                          href="/invoices"
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
                        >
                          View Invoice
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleConvertToInvoice(c.id)}
                          disabled={convertingId === c.id}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition disabled:opacity-50"
                        >
                          {convertingId === c.id ? 'Converting...' : 'Convert to Invoice'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DELIVERY CHALLAN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Issue Delivery Challan (Rule 55)</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChallan} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Challan Purpose</label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold bg-white"
                  >
                    <option value="SUPPLY_ON_APPROVAL">Supply on Approval / Return</option>
                    <option value="JOB_WORK">Job Work Processing</option>
                    <option value="REMOVAL_FOR_SALE">Removal for Sale / Van Sale</option>
                    <option value="EXHIBITION_OR_DEMO">Exhibition or Customer Demo</option>
                    <option value="OTHER">Other Movement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Recipient / Party Name *</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Apex Auto Garage / Client"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Recipient Phone</label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Recipient GSTIN (If any)</label>
                  <input
                    type="text"
                    value={recipientGstin}
                    onChange={(e) => setRecipientGstin(e.target.value.toUpperCase())}
                    placeholder="15-character GSTIN"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Dispatch Vehicle No</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    placeholder="e.g. KL-07-CB-4491"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Transporter Name</label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="Self / Express Logistics"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Delivery Address / Destination</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Delivery location or job work site"
                  className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              {/* Line Items */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 uppercase">Line Items to Transport</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
                      <input
                        type="text"
                        required
                        placeholder="Item Description"
                        value={item.productName}
                        onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                        className="flex-2 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        placeholder="HSN"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                        className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-16 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Rate ₹"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-24 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statutory Footnote */}
              <div className="p-3 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-medium">
                ⚖️ <strong>Statutory Declaration (Rule 55):</strong> This document is issued strictly for transportation of goods without sale. If accepted by customer, it can be converted into a GST Tax Invoice with 1 click.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Issue Delivery Challan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
