'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import EWayBillModal from '@/components/EWayBillModal';

export default function EWayBillsRegisterPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ total: 0, activeCount: 0, expiredCount: 0, highValueCount: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showEwayModal, setShowEwayModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEwayBills = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = searchQuery ? `/api/eway-bills?q=${encodeURIComponent(searchQuery)}` : '/api/eway-bills';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch E-Way bills');
      }
      setRecords(data.records || []);
      setMetrics(data.metrics || { total: 0, activeCount: 0, expiredCount: 0, highValueCount: 0 });
    } catch (err: any) {
      setError(err.message || 'Error loading E-Way bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEwayBills();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenGenerator = (row: any) => {
    setSelectedInvoice({
      id: row.docId,
      invoiceNumber: row.docNumber,
      invoiceDate: row.docDate,
      totalAmount: row.totalAmount,
      transDistance: row.distanceKm,
      vehicleNo: row.vehicleNo,
      transporterName: row.transporterName,
      customerName: row.recipientName,
      customerGstin: row.recipientGstin,
    });
    setShowEwayModal(true);
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
                E-Way Bill Register & Dispatch Control (Rule 138)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Mandatory Electronic Way Bill for goods movement exceeding ₹50,000 threshold
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEwayBills}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Link
            href="/invoices"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition"
          >
            <FileText className="h-4 w-4" />
            View Invoices
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Dispatches</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">With Road / Vehicle Movement</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active In-Transit</p>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.activeCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Valid E-Way Bills On Road</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">High Value (≥ ₹50K)</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{metrics.highValueCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Statutory Threshold Applied</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expired / Completed</p>
          <p className="text-2xl font-black text-slate-500 mt-1">{metrics.expiredCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Validity Expired (Rule 138(10))</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-6 flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Vehicle No (e.g. KL-07), Invoice No, Customer, or E-Way Bill Number..."
          className="w-full text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 mr-2">
            Clear
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">E-Way Bill No</th>
                <th className="p-3.5">Doc No / Date</th>
                <th className="p-3.5">Recipient & GSTIN</th>
                <th className="p-3.5">Vehicle & Transporter</th>
                <th className="p-3.5">Distance</th>
                <th className="p-3.5 text-right">Invoice Value</th>
                <th className="p-3.5">Validity Status</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading E-Way Bill records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No E-Way bills found matching query.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition text-slate-800">
                    <td className="p-3.5 font-mono font-bold text-indigo-600">
                      {row.ewayBillNo}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{row.docNumber}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(row.docDate).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{row.recipientName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{row.recipientGstin}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-slate-400" />
                        {row.vehicleNo}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {row.transporterName}
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-700">
                      {row.distanceKm} KM
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900">
                      ₹{row.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5">
                      {row.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          <CheckCircle2 className="h-3 w-3" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          <Clock className="h-3 w-3" />
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleOpenGenerator(row)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition"
                      >
                        NIC Slip / Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* E-Way Bill Modal Trigger */}
      {selectedInvoice && (
        <EWayBillModal
          isOpen={showEwayModal}
          onClose={() => {
            setShowEwayModal(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          onSuccess={() => {
            fetchEwayBills();
          }}
        />
      )}
    </div>
  );
}
