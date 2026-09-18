'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  PlusCircle, 
  ArrowUpRight, 
  RefreshCw, 
  Printer,
  Download,
  RotateCcw,
  ShieldCheck,
  Receipt,
  Layers,
  Truck,
  FileCode
} from 'lucide-react';
import ThermalReceiptModal, { ThermalReceiptData } from '@/components/ThermalReceiptModal';
import CreditNoteModal from '@/components/CreditNoteModal';
import EWayBillModal from '@/components/EWayBillModal';

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'CREDIT_NOTES'>('INVOICES');

  // Invoices state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceForEway, setSelectedInvoiceForEway] = useState<any | null>(null);
  const [showEwayModal, setShowEwayModal] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [business, setBusiness] = useState<any>({
    name: "Ziona Tech & Electricals",
    gstin: "32AAAAA0000A1Z5",
    phone: "9876543210",
    upiId: "zionabusiness@icici",
  });
  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Credit notes state
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(false);
  const [creditNoteMetrics, setCreditNoteMetrics] = useState({
    totalCredited: 0,
    totalTaxReversed: 0,
    count: 0,
  });
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<any | null>(null);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      let url = "/api/invoices";
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
        if (data.tenant) {
          setBusiness({
            name: data.tenant.businessName,
            gstin: data.tenant.gstin || "",
            stateCode: data.tenant.stateCode || "32",
            phone: data.tenant.phone || "",
            address: data.tenant.address || "",
            upiId: data.tenant.upiId || "",
          });
        }
      }
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadCreditNotes = async () => {
    setLoadingCreditNotes(true);
    try {
      let url = "/api/credit-notes";
      if (searchQuery) {
        url += `?q=${encodeURIComponent(searchQuery)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCreditNotes(data.creditNotes || []);
        if (data.metrics) {
          setCreditNoteMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error("Error loading credit notes:", err);
    } finally {
      setLoadingCreditNotes(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'CREDIT_NOTES') {
      loadCreditNotes();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'INVOICES') {
      loadInvoices();
    } else {
      loadCreditNotes();
    }
  };

  const handleOpenReceipt = (inv: any) => {
    const formattedItems = (inv.items || []).map((item: any) => ({
      name: item.name || item.productName || `Product Item`,
      hsn: item.hsnCode || "9983",
      quantity: Number(item.quantity) || 1,
      unit: item.unitSold || "PCS",
      price: Number(item.unitPrice) || Number(item.totalAmount),
      total: Number(item.lineTotal) || Number(item.totalAmount),
    }));

    setReceiptData({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate || inv.createdAt,
      customerName: inv.customerName || "Walk-in Customer",
      customerPhone: inv.customerPhone,
      customerState: inv.customerStateCode || "32",
      cashierName: "Counter 1",
      items: formattedItems.length > 0 ? formattedItems : [{
        name: "General Retail Sale",
        quantity: 1,
        price: Number(inv.totalAmount),
        total: Number(inv.totalAmount),
      }],
      subTotal: Number(inv.subtotal || inv.totalAmount),
      taxableAmount: Number(inv.subtotal || inv.totalAmount),
      cgstAmount: Number(inv.cgstAmount || 0),
      sgstAmount: Number(inv.sgstAmount || 0),
      igstAmount: Number(inv.igstAmount || 0),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      dueAmount: Number(inv.dueAmount),
      paymentMode: inv.paymentMode || "UPI",
      upiUri: inv.upiUri,
    });
    setShowReceiptModal(true);
  };

  const handleOpenCreditNote = (inv: any) => {
    setSelectedInvoiceForReturn(inv);
    setShowCreditNoteModal(true);
  };

  const handleCreditNoteSuccess = () => {
    loadInvoices();
    if (activeTab === 'CREDIT_NOTES') {
      loadCreditNotes();
    } else {
      setActiveTab('CREDIT_NOTES');
    }
  };

  const handleOpenEway = (inv: any) => {
    setSelectedInvoiceForEway(inv);
    setShowEwayModal(true);
  };

  // Export GSTR-1 Sales Register (Table 4 / 5 / 7)
  const exportGstr1Csv = () => {
    if (invoices.length === 0) {
      alert("No invoices available to export.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Invoice Date",
      "Customer Name",
      "Customer Phone",
      "Customer GSTIN",
      "Place of Supply",
      "Supply Type",
      "Taxable Value (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "IGST (INR)",
      "Total Tax (INR)",
      "Invoice Total (INR)",
      "Paid Amount (INR)",
      "Balance Due (INR)",
      "Payment Status",
      "Payment Mode",
    ];

    const rows = invoices.map((inv) => [
      `"${inv.invoiceNumber || ""}"`,
      `"${inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split("T")[0] : ""}"`,
      `"${(inv.customerName || "Walk-in").replace(/"/g, '""')}"`,
      `"${inv.customerPhone || ""}"`,
      `"${inv.customerGstin || "URP"}"`,
      `"${inv.customerStateCode || "32"}"`,
      `"${inv.isInterState ? "Inter-State" : "Intra-State"}"`,
      Number(inv.subtotal || 0).toFixed(2),
      Number(inv.cgstAmount || 0).toFixed(2),
      Number(inv.sgstAmount || 0).toFixed(2),
      Number(inv.igstAmount || 0).toFixed(2),
      Number(inv.totalTax || 0).toFixed(2),
      Number(inv.totalAmount || 0).toFixed(2),
      Number(inv.paidAmount || 0).toFixed(2),
      Number(inv.dueAmount || 0).toFixed(2),
      `"${inv.paymentStatus || "UNPAID"}"`,
      `"${inv.paymentMode || "UPI"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `GSTR1_Sales_Register_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [downloadingGstr1, setDownloadingGstr1] = useState(false);

  // Export Official GSTN GSTR-1 Portal Upload JSON
  const exportGstr1Json = async () => {
    setDownloadingGstr1(true);
    try {
      const now = new Date();
      const period = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
      const res = await fetch(`/api/reports/gstr-1?period=${period}`);
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to generate GSTR-1 JSON");
        return;
      }

      const jsonStr = JSON.stringify(data.gstr1Payload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", data.filename || `GSTR1_${period}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("GSTR-1 download error:", err);
      alert("Failed to download GSTR-1 Portal JSON");
    } finally {
      setDownloadingGstr1(false);
    }
  };

  // Export GSTR-1 Table 9B Credit / Debit Notes (CDNR / CDNUR)
  const exportGstr1Table9bCsv = () => {
    if (creditNotes.length === 0) {
      alert("No credit notes available to export.");
      return;
    }

    const headers = [
      "GSTIN/UIN of Recipient",
      "Receiver Name",
      "Invoice/Advance Receipt Number",
      "Invoice/Advance Receipt date",
      "Note/Refund Voucher Number",
      "Note/Refund Voucher date",
      "Document Type",
      "Reason For Issuing document",
      "Place Of Supply",
      "Note/Refund Voucher Value",
      "Applicable % of Tax Rate",
      "Rate",
      "Taxable Value",
      "Cess Amount",
      "Pre GST",
    ];

    const rows = creditNotes.map((cn) => {
      const gstin = cn.customerGstin || "URP";
      const receiver = (cn.customerName || "Walk-in").replace(/"/g, '""');
      const origInvNo = cn.originalInvoiceNumber || "";
      const origInvDate = cn.originalInvoiceDate ? new Date(cn.originalInvoiceDate).toISOString().split("T")[0] : "";
      const cnNo = cn.creditNoteNumber || "";
      const cnDate = cn.creditNoteDate ? new Date(cn.creditNoteDate).toISOString().split("T")[0] : "";
      const docType = "C"; // C = Credit Note
      const reasonMap: Record<string, string> = {
        SALES_RETURN: "01-Sales Return",
        POST_SALE_DISCOUNT: "02-Post Sale Discount",
        DEFICIENT_GOODS: "03-Deficiency in services",
        INVOICE_CORRECTION: "04-Correction in Invoice",
        OTHER: "05-Others",
      };
      const reasonStr = reasonMap[cn.reason] || "01-Sales Return";
      const pos = cn.customerStateCode || "32";
      const noteVal = Number(cn.totalAmount || 0).toFixed(2);
      const taxableVal = Number(cn.subtotal || 0).toFixed(2);
      // Determine average or primary rate
      const primaryRate = cn.items && cn.items.length > 0 ? Number(cn.items[0].gstRate || 18) : 18;

      return [
        `"${gstin}"`,
        `"${receiver}"`,
        `"${origInvNo}"`,
        `"${origInvDate}"`,
        `"${cnNo}"`,
        `"${cnDate}"`,
        `"${docType}"`,
        `"${reasonStr}"`,
        `"${pos}"`,
        noteVal,
        "",
        primaryRate,
        taxableVal,
        "0.00",
        "N",
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `GSTR1_Table9B_CreditNotes_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            <span>Invoices & Sales Returns</span>
          </h1>
          <p className="text-xs text-slate-500">Live transaction history stored in Neon PostgreSQL</p>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === 'INVOICES' ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={exportGstr1Json}
                disabled={downloadingGstr1}
                className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-100 flex items-center space-x-1.5 transition disabled:opacity-50"
                title="Download Official GSTN GSTR-1 JSON for GST Portal / Offline Tool Upload"
              >
                <FileCode className="h-4 w-4 text-indigo-600" />
                <span>{downloadingGstr1 ? "Generating..." : "Portal JSON (GSTR-1)"}</span>
              </button>
              <button
                onClick={exportGstr1Csv}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 flex items-center space-x-1.5 transition"
                title="Export CA-Ready GSTR-1 Sales Register (Table 4/7 CSV)"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>Export GSTR-1 (CSV)</span>
              </button>
            </div>
          ) : (
            <button
              onClick={exportGstr1Table9bCsv}
              className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-bold text-amber-800 shadow-sm hover:bg-amber-100 flex items-center space-x-1.5 transition"
              title="Export GSTR-1 Table 9B Credit/Debit Notes (CDNR / CDNUR)"
            >
              <Download className="h-4 w-4 text-amber-600" />
              <span>Export Table 9B CN (CSV)</span>
            </button>
          )}

          <Link
            href="/billing/new"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 flex items-center space-x-1.5 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Create New Invoice</span>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'INVOICES'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Tax Invoices ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('CREDIT_NOTES')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'CREDIT_NOTES'
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Credit Notes / Returns ({creditNotes.length})</span>
        </button>
      </div>

      {/* Metrics Banner (Credit Notes Tab only) */}
      {activeTab === 'CREDIT_NOTES' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Credit Notes</span>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {creditNoteMetrics.count}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <span className="text-xs font-semibold text-amber-700">Total Refunded / Credited</span>
            <div className="text-xl font-extrabold text-amber-800 mt-1">
              ₹{creditNoteMetrics.totalCredited.toFixed(2)}
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
            <span className="text-xs font-semibold text-indigo-700">Tax Output Reversed (ITC Adj)</span>
            <div className="text-xl font-extrabold text-indigo-800 mt-1">
              ₹{creditNoteMetrics.totalTaxReversed.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'INVOICES'
                ? "Search customer, phone, or bill #..."
                : "Search CN #, customer, or original bill #..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </form>

        {activeTab === 'INVOICES' && (
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                statusFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Bills
            </button>
            <button
              onClick={() => setStatusFilter("UNPAID")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                statusFilter === "UNPAID" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              Unpaid (Due)
            </button>
            <button
              onClick={() => setStatusFilter("PARTIAL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                statusFilter === "PARTIAL" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Partial
            </button>
            <button
              onClick={() => setStatusFilter("PAID")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                statusFilter === "PAID" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Paid
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'INVOICES' ? (
        /* Invoices Table */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loadingInvoices ? (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
              <span className="text-xs">Loading live invoices...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-700">No invoices found</p>
              <p className="text-xs text-slate-400 mb-4">No matching records in your Neon database</p>
              <Link
                href="/billing/new"
                className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <span>+ Create your first invoice</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Bill #</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Tax</th>
                    <th className="px-4 py-3 font-semibold">Total Amount</th>
                    <th className="px-4 py-3 font-semibold">Balance Due</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div>{inv.invoiceNumber}</div>
                        {inv.ewayBillNo ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md mt-0.5"
                            title={`E-Way Bill No: ${inv.ewayBillNo}`}
                          >
                            <Truck className="h-2.5 w-2.5" />
                            <span>EWB: {inv.ewayBillNo.slice(0, 4)}...{inv.ewayBillNo.slice(-4)}</span>
                          </span>
                        ) : Number(inv.totalAmount) >= 50000 ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md mt-0.5"
                            title="Statutory Rule 138: Mandatory E-Way Bill for consignments over ₹50,000"
                          >
                            <Truck className="h-2.5 w-2.5 text-amber-600" />
                            <span>E-Way Req.</span>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{inv.customerName}</div>
                        <div className="text-[11px] text-slate-400">{inv.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">{inv.items?.length || 1} items</td>
                      <td className="px-4 py-3 text-slate-500">
                        {inv.igstAmount > 0
                          ? `IGST: ₹${inv.igstAmount}`
                          : `CGST+SGST: ₹${(Number(inv.cgstAmount) + Number(inv.sgstAmount)).toFixed(1)}`}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">₹{Number(inv.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-rose-600">
                        {Number(inv.dueAmount) > 0 ? `₹${Number(inv.dueAmount).toFixed(2)}` : "₹0.00"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : inv.paymentStatus === "PARTIAL"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(inv)}
                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-xs font-semibold"
                            title="Print Thermal ESC/POS Receipt"
                          >
                            <Printer className="h-3 w-3 text-indigo-600" />
                            <span>Receipt</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCreditNote(inv)}
                            className="inline-flex items-center space-x-1 rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-1 text-amber-800 hover:bg-amber-100 transition shadow-xs font-semibold"
                            title="Issue GST Credit Note / Sales Return"
                          >
                            <RotateCcw className="h-3 w-3 text-amber-600" />
                            <span>Return</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEway(inv)}
                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50 transition shadow-xs font-semibold"
                            title="Generate NIC E-Way Bill (Rule 138)"
                          >
                            <Truck className="h-3 w-3 text-indigo-600" />
                            <span>E-Way</span>
                          </button>

                          <a
                            href={`https://wa.me/91${inv.customerPhone}?text=${encodeURIComponent(
                              `Reminder: Your bill #${inv.invoiceNumber} has an outstanding due of ₹${inv.dueAmount}. Pay via UPI: ${inv.upiUri}`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-slate-500 hover:text-emerald-600 font-semibold p-1"
                            title="WhatsApp Bill Link"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Credit Notes (Table 9B) List */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loadingCreditNotes ? (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mb-2" />
              <span className="text-xs">Loading live credit notes...</span>
            </div>
          ) : creditNotes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <RotateCcw className="h-10 w-10 mx-auto mb-2 opacity-30 text-amber-600" />
              <p className="text-sm font-semibold text-slate-700">No credit notes issued yet</p>
              <p className="text-xs text-slate-400 mb-4">
                To issue a credit note, select any invoice from the Tax Invoices tab and click "Return".
              </p>
              <button
                onClick={() => setActiveTab('INVOICES')}
                className="inline-flex items-center space-x-1 text-xs font-bold text-amber-600 hover:text-amber-800"
              >
                <span>View Tax Invoices</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Credit Note #</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Original Bill #</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Reason</th>
                    <th className="px-4 py-3 font-semibold">Refund Mode</th>
                    <th className="px-4 py-3 font-semibold">Tax Reversed</th>
                    <th className="px-4 py-3 font-semibold">Total Credited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {creditNotes.map((cn) => (
                    <tr key={cn.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-amber-700">
                        {cn.creditNoteNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(cn.creditNoteDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-600">
                        {cn.originalInvoiceNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{cn.customerName}</div>
                        <div className="text-[11px] text-slate-400">
                          {cn.customerGstin ? `GSTIN: ${cn.customerGstin}` : cn.customerPhone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {cn.reason.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">
                        {cn.refundMode}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        ₹{Number(cn.totalTax || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">
                        ₹{Number(cn.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ESC/POS Thermal Roll Receipt Modal */}
      <ThermalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        data={receiptData}
        business={business}
      />

      {/* GST Credit Note / Sales Return Modal */}
      {selectedInvoiceForReturn && (
        <CreditNoteModal
          isOpen={showCreditNoteModal}
          onClose={() => setShowCreditNoteModal(false)}
          invoice={selectedInvoiceForReturn}
          onSuccess={handleCreditNoteSuccess}
        />
      )}

      {/* GST E-Way Bill Modal (Rule 138) */}
      {selectedInvoiceForEway && (
        <EWayBillModal
          isOpen={showEwayModal}
          onClose={() => setShowEwayModal(false)}
          invoice={selectedInvoiceForEway}
          onSuccess={loadInvoices}
        />
      )}
    </div>
  );
}
