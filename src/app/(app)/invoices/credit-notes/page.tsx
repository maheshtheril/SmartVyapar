'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
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
  Filter,
  X,
} from 'lucide-react';
import CreditNoteModal from '@/components/CreditNoteModal';

export default function CreditNotesRegisterPage() {
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ totalCredited: 0, totalTaxReversed: 0, count: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
  const [showInvoicePicker, setShowInvoicePicker] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleOpenIssueModal = () => {
    fetchInvoices();
    setShowInvoicePicker(true);
  };

  const handleSelectInvoice = (inv: any) => {
    setSelectedInvoice(inv);
    setShowInvoicePicker(false);
    setShowModal(true);
  };

  const fetchCreditNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (reasonFilter !== 'ALL') params.append('reason', reasonFilter);

      const res = await fetch(`/api/credit-notes?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch credit notes');
      }
      setCreditNotes(data.creditNotes || []);
      setMetrics(data.metrics || { totalCredited: 0, totalTaxReversed: 0, count: 0 });
    } catch (err: any) {
      setError(err.message || 'Error loading credit notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCreditNotes();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, reasonFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Credit Notes & Sales Returns Register (GST Rule 53)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Official statutory credit vouchers reported in GSTR-1 Table 9B for GST tax liability reduction
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCreditNotes}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleOpenIssueModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Issue Credit Note
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Value Credited</p>
          <p className="text-2xl font-black text-rose-600 mt-1">
            ₹{Number(metrics.totalCredited || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Gross sales deductions & refunds</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">GST Output Tax Reversed</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            ₹{Number(metrics.totalTaxReversed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Saved tax liability in GSTR-3B Table 3.1</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Notes Issued</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.count || 0}</p>
          <p className="text-[10px] text-slate-500 mt-1">Sequential statutory credit vouchers</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 flex-1 w-full">
          <Search className="h-4 w-4 text-slate-400 ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Credit Note No (e.g. CN-), Original Invoice, Customer Name, or Phone..."
            className="w-full text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 mr-2">
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-3 w-full md:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-500">Reason:</span>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Reasons</option>
            <option value="SALES_RETURN">Sales Return</option>
            <option value="POST_SALE_DISCOUNT">Post-Sale Discount</option>
            <option value="DEFICIENT_GOODS">Deficient Goods</option>
            <option value="INVOICE_CORRECTION">Invoice Correction</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
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
                <th className="p-3.5">Credit Note No</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Original Invoice</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Reason</th>
                <th className="p-3.5 text-right">Taxable</th>
                <th className="p-3.5 text-right">Tax Reversed</th>
                <th className="p-3.5 text-right font-black">Total Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading credit notes...
                  </td>
                </tr>
              ) : creditNotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No credit notes found. Click &quot;Issue Credit Note&quot; to create one.
                  </td>
                </tr>
              ) : (
                creditNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-slate-50/60 transition text-slate-800">
                    <td className="p-3.5 font-mono font-bold text-indigo-600">
                      {cn.creditNoteNumber}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(cn.creditNoteDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-800">{cn.originalInvoiceNumber}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(cn.originalInvoiceDate).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{cn.customerName}</div>
                      <div className="text-[10px] text-slate-400">{cn.customerPhone || 'Counter Sale'}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        {cn.reason?.replace(/_/g, ' ') || 'SALES RETURN'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      ₹{Number(cn.subtotal || 0).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                      ₹{Number(cn.totalTax || 0).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-rose-600">
                      ₹{Number(cn.totalAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Picker Modal */}
      {showInvoicePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Select Invoice for Return</h3>
                <p className="text-xs text-slate-500">Choose the original sale invoice to issue a credit note against</p>
              </div>
              <button
                onClick={() => setShowInvoicePicker(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {loadingInvoices ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading invoices...
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No invoices available to credit.
                </div>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between hover:bg-slate-50 p-2 rounded-xl">
                    <div>
                      <div className="font-mono font-bold text-xs text-indigo-600">{inv.invoiceNumber}</div>
                      <div className="text-xs font-bold text-slate-800">{inv.customerName}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN')} • ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectInvoice(inv)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      Credit This Bill
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {showModal && selectedInvoice && (
        <CreditNoteModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          onSuccess={() => {
            setShowModal(false);
            setSelectedInvoice(null);
            fetchCreditNotes();
          }}
        />
      )}
    </div>
  );
}
