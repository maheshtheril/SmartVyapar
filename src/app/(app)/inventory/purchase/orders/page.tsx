'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  MessageSquare,
  Package,
  Trash2,
  ChevronDown,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

interface PurchaseOrderItemInput {
  productId?: string;
  productName: string;
  hsnCode?: string;
  unit: string;
  orderedQuantity: number;
  expectedRate: number;
  gstRate: number;
}

const DEFAULT_SUPPLIERS = [
  { name: 'Bosch Automotive Aftermarket India Ltd', gstin: '29AAACB2021A1Z8', phone: '9845012345' },
  { name: 'Castrol Lubricants Distribution Ltd', gstin: '32AABCC3344P1ZV', phone: '9845054321' },
  { name: 'Exide Industries India Ltd', gstin: '32AAACE4455Q1ZT', phone: '9845098765' },
  { name: 'Mann & Hummel Filters India Pvt Ltd', gstin: '27AABCM8899P1ZA', phone: '9845024680' },
];

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Products catalog for fast selection
  const [products, setProducts] = useState<any[]>([]);

  // Create PO Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // New PO Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrderItemInput[]>([
    { productName: '', unit: 'PCS', orderedQuantity: 1, expectedRate: 0, gstRate: 18 },
  ]);

  // View / Print PO Modal
  const [selectedOrderForView, setSelectedOrderForView] = useState<any | null>(null);

  // Inward Confirmation Modal
  const [orderToInward, setOrderToInward] = useState<any | null>(null);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [inwarding, setInwarding] = useState(false);
  const [inwardSuccessInfo, setInwardSuccessInfo] = useState<any | null>(null);

  // Load orders
  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchase/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error('Error loading purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load products catalog
  useEffect(() => {
    loadOrders();
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.products) {
          setProducts(data.products);
        }
      })
      .catch((err) => console.error('Error loading products:', err));
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ORDERED' && (order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED')) ||
        order.status === statusFilter;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        order.poNumber.toLowerCase().includes(q) ||
        order.supplierName.toLowerCase().includes(q) ||
        (order.supplierGstin && order.supplierGstin.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Handle line item change
  const handleItemChange = (index: number, field: keyof PurchaseOrderItemInput, value: any) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };
    setPoItems(updated);
  };

  const handleSelectProduct = (index: number, prod: any) => {
    const updated = [...poItems];
    updated[index] = {
      ...updated[index],
      productId: prod.id,
      productName: prod.name,
      hsnCode: prod.hsnCode || '',
      unit: prod.baseUnit || 'PCS',
      expectedRate: Number(prod.purchasePrice || 0),
      gstRate: Number(prod.gstRate || 18),
    };
    setPoItems(updated);
  };

  const addItemRow = () => {
    setPoItems((prev) => [
      ...prev,
      { productName: '', unit: 'PCS', orderedQuantity: 1, expectedRate: 0, gstRate: 18 },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (poItems.length === 1) return;
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Computed PO Total
  const computedTotals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    poItems.forEach((it) => {
      const lineTaxable = Number(it.orderedQuantity || 0) * Number(it.expectedRate || 0);
      const lineTax = (lineTaxable * Number(it.gstRate || 0)) / 100;
      sub += lineTaxable;
      tax += lineTax;
    });
    return { subtotal: sub, tax, total: sub + tax };
  }, [poItems]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      setCreateError('Please select or specify a supplier name.');
      return;
    }
    const validItems = poItems.filter((it) => it.productName.trim() && it.orderedQuantity > 0);
    if (validItems.length === 0) {
      setCreateError('Please add at least one valid line item with quantity > 0.');
      return;
    }

    setSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/purchase/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName,
          supplierGstin: supplierGstin || undefined,
          supplierPhone: supplierPhone || undefined,
          supplierAddress: supplierAddress || undefined,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          notes: notes || undefined,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create Purchase Order');
      }

      setIsCreateOpen(false);
      resetForm();
      loadOrders();
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSupplierName('');
    setSupplierGstin('');
    setSupplierPhone('');
    setSupplierAddress('');
    setExpectedDeliveryDate('');
    setNotes('');
    setPoItems([{ productName: '', unit: 'PCS', orderedQuantity: 1, expectedRate: 0, gstRate: 18 }]);
    setCreateError(null);
  };

  // Convert PO to Inward Bill & GRN
  const handleConfirmInward = async () => {
    if (!orderToInward) return;
    setInwarding(true);
    try {
      const res = await fetch(`/api/purchase/orders/${orderToInward.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierInvoiceNumber: supplierInvoiceNo.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inward Purchase Order');
      }

      setInwardSuccessInfo({
        poNumber: orderToInward.poNumber,
        grnNumber: data.data.grnNumber,
        billNumber: data.data.purchaseBill.billNumber,
        totalAmount: data.data.purchaseBill.totalAmount,
      });
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to receive order');
    } finally {
      setInwarding(false);
    }
  };

  // Generate WhatsApp order text
  const generateWhatsAppUrl = (order: any) => {
    const lines = [
      `*PURCHASE ORDER: ${order.poNumber}*`,
      `Supplier: ${order.supplierName}`,
      `Date: ${new Date(order.orderDate).toLocaleDateString('en-IN')}`,
      order.expectedDeliveryDate ? `Expected Delivery: ${new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN')}` : '',
      `----------------------------`,
      `*ITEMS ORDERED:*`,
    ];

    order.items?.forEach((it: any, i: number) => {
      lines.push(`${i + 1}. ${it.productName} - ${it.orderedQuantity} ${it.unit} @ ₹${Number(it.expectedRate).toFixed(2)}`);
    });

    lines.push(`----------------------------`);
    lines.push(`*ESTIMATED TOTAL:* ₹${Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    if (order.notes) lines.push(`Notes: ${order.notes}`);
    lines.push(`\nPlease confirm delivery and receipt of this order. Thank you!`);

    const phone = order.supplierPhone ? order.supplierPhone.replace(/[^0-9]/g, '') : '';
    const encoded = encodeURIComponent(lines.filter(Boolean).join('\n'));
    return phone ? `https://wa.me/91${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/inventory" className="hover:text-slate-800">Inventory</Link>
            <span>/</span>
            <Link href="/inventory/purchase" className="hover:text-slate-800">Purchases</Link>
            <span>/</span>
            <span className="text-slate-800">Purchase Orders</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            Purchase Orders (PO)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Place procurement orders to distributors, share via WhatsApp, and 1-click inward into stock when delivered.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <Link
            href="/inventory/purchase"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Inward Register (GRN)
          </Link>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Purchase Order
          </button>
        </div>
      </div>

      {/* 4 Core Procurement KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{summary.totalOrders || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Recorded purchase orders</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Delivery</span>
            <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2 font-mono">{summary.orderedCount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting dispatch &amp; arrival</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inwarded (GRN)</span>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">{summary.completedCount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Fully received in warehouse</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Order Value</span>
            <span className="rounded-xl bg-blue-50 p-2 text-blue-600 font-bold font-mono text-sm">
              ₹
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            ₹{Number(summary.totalOrderedValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cumulative procurement commitment</div>
        </div>
      </div>

      {/* Search & Status Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'ORDERED', label: 'In Transit / Pending' },
            { id: 'COMPLETED', label: 'Inwarded / Completed' },
            { id: 'DRAFT', label: 'Drafts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search PO #, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Expected Delivery</th>
                <th className="py-3 px-4 text-right">Order Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isCompleted = order.status === 'COMPLETED';
                  const isPending = order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                        {order.poNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(order.orderDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div>{order.supplierName}</div>
                        {order.supplierGstin && (
                          <div className="text-[10px] font-mono text-slate-400">{order.supplierGstin}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {order.items?.length || 0} Parts
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {order.expectedDeliveryDate ? (
                          new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        ₹{Number(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View / Print Slip */}
                          <button
                            onClick={() => setSelectedOrderForView(order)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="View / Print PO Slip"
                          >
                            <Printer className="w-3 h-3 text-slate-600" /> View
                          </button>

                          {/* Share via WhatsApp */}
                          <a
                            href={generateWhatsAppUrl(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Send PO to Supplier via WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
                          </a>

                          {/* 1-Click Inward */}
                          {!isCompleted && (
                            <button
                              onClick={() => {
                                setOrderToInward(order);
                                setSupplierInvoiceNo(`INV-${order.poNumber.replace('PO-', '')}`);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Goods Arrived: Inward into stock"
                            >
                              <Truck className="w-3 h-3 text-indigo-600" /> Inward (GRN)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <div className="font-semibold text-slate-600">No purchase orders found</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Click &quot;+ New Purchase Order&quot; above to create and dispatch your first supplier order.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW PURCHASE ORDER */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Supplier Purchase Order</h3>
                  <p className="text-xs text-slate-500">
                    Generate an official PO to send to distributors before goods are dispatched.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  resetForm();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {createError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleCreatePO} className="p-6 space-y-5">
              {/* Supplier & Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier / Vendor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bosch Automotive Aftermarket"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    list="suppliers-list"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                  />
                  <datalist id="suppliers-list">
                    {DEFAULT_SUPPLIERS.map((s, idx) => (
                      <option key={idx} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="29AAACB2021A1Z8"
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier WhatsApp / Phone
                  </label>
                  <input
                    type="text"
                    placeholder="9845012345"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Address / Warehouse Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Central Warehouse, Dock #2"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Order Items &amp; Parts ({poItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Part
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Item / Part Description</th>
                        <th className="p-2.5 w-24">HSN</th>
                        <th className="p-2.5 w-28 text-center">Order Qty</th>
                        <th className="p-2.5 w-20">Unit</th>
                        <th className="p-2.5 w-28 text-right">Exp Rate (₹)</th>
                        <th className="p-2.5 w-20 text-right">GST %</th>
                        <th className="p-2.5 w-28 text-right">Line Total</th>
                        <th className="p-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poItems.map((item, idx) => {
                        const lineTaxable = Number(item.orderedQuantity || 0) * Number(item.expectedRate || 0);
                        const lineTotal = lineTaxable * (1 + Number(item.gstRate || 0) / 100);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5">
                              <input
                                type="text"
                                required
                                placeholder="Type item name or search catalog..."
                                value={item.productName}
                                onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                                list={`products-list-${idx}`}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden font-medium"
                              />
                              <datalist id={`products-list-${idx}`}>
                                {products.map((p) => (
                                  <option key={p.id} value={p.name}>
                                    {p.name} (Stock: {p.currentStock})
                                  </option>
                                ))}
                              </datalist>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                placeholder="HSN"
                                value={item.hsnCode || ''}
                                onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="1"
                                step="any"
                                required
                                value={item.orderedQuantity}
                                onChange={(e) => handleItemChange(idx, 'orderedQuantity', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 text-xs font-mono font-bold text-center bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                              />
                            </td>
                            <td className="p-2.5">
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                className="w-full px-1.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                              >
                                <option value="PCS">PCS</option>
                                <option value="BOX">BOX</option>
                                <option value="SET">SET</option>
                                <option value="KG">KG</option>
                                <option value="LTR">LTR</option>
                              </select>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.expectedRate}
                                onChange={(e) => handleItemChange(idx, 'expectedRate', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 text-xs font-mono text-right bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                              />
                            </td>
                            <td className="p-2.5">
                              <select
                                value={item.gstRate}
                                onChange={(e) => handleItemChange(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                                className="w-full px-1 py-1.5 text-xs text-right bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                              ₹{lineTotal.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              {poItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItemRow(idx)}
                                  className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Notes & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order Remarks / Instructions to Vendor
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Please deliver by Thursday noon. Ensure batch validity > 12 months."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span>₹{computedTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated GST:</span>
                    <span>₹{computedTotals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Estimated Total PO Value:</span>
                    <span className="text-indigo-700">₹{computedTotals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Generating PO...' : 'Create & Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW & PRINT STATUTORY PURCHASE ORDER SLIP */}
      {/* ========================================================================= */}
      {selectedOrderForView && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">
                  Procurement Order
                </span>
                <h2 className="text-xl font-bold text-slate-900">Purchase Order</h2>
                <div className="font-mono text-xs font-bold text-indigo-700">{selectedOrderForView.poNumber}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={generateWhatsAppUrl(selectedOrderForView)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setSelectedOrderForView(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Slip Content */}
            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">To (Vendor):</span>
                  <strong className="text-slate-900 text-xs block">{selectedOrderForView.supplierName}</strong>
                  {selectedOrderForView.supplierGstin && <div>GSTIN: {selectedOrderForView.supplierGstin}</div>}
                  {selectedOrderForView.supplierPhone && <div>Phone: {selectedOrderForView.supplierPhone}</div>}
                  {selectedOrderForView.supplierAddress && <div>Address: {selectedOrderForView.supplierAddress}</div>}
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Order Details:</span>
                  <div>Date: {new Date(selectedOrderForView.orderDate).toLocaleDateString('en-IN')}</div>
                  {selectedOrderForView.expectedDeliveryDate && (
                    <div>Expected Delivery: {new Date(selectedOrderForView.expectedDeliveryDate).toLocaleDateString('en-IN')}</div>
                  )}
                  <div>Status: <strong className="text-indigo-700">{selectedOrderForView.status}</strong></div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2">Part Description</th>
                    <th className="p-2">HSN</th>
                    <th className="p-2 text-right">Order Qty</th>
                    <th className="p-2 text-right">Unit Rate (₹)</th>
                    <th className="p-2 text-right">GST %</th>
                    <th className="p-2 text-right">Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {selectedOrderForView.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="p-2 font-sans font-medium text-slate-900">{it.productName}</td>
                      <td className="p-2 text-slate-500">{it.hsnCode || '—'}</td>
                      <td className="p-2 text-right font-bold">{it.orderedQuantity} {it.unit}</td>
                      <td className="p-2 text-right">₹{Number(it.expectedRate).toFixed(2)}</td>
                      <td className="p-2 text-right">{it.gstRate}%</td>
                      <td className="p-2 text-right font-bold">₹{Number(it.lineTotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable:</span>
                    <span>₹{Number(selectedOrderForView.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span>₹{Number(selectedOrderForView.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-sm">
                    <span>Total Amount:</span>
                    <span className="text-indigo-700">₹{Number(selectedOrderForView.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs font-mono border-t border-slate-200 mt-6">
                <div>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-semibold text-slate-700">
                    Prepared By (Store Manager)
                  </div>
                </div>
                <div>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-semibold text-slate-700">
                    Authorized Signatory (Procurement Dept)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: 1-CLICK CONVERT PO TO GOODS RECEIPT NOTE (GRN) & INWARD BILL */}
      {/* ========================================================================= */}
      {orderToInward && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            {inwardSuccessInfo ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Goods Successfully Inwarded!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Inventory has been increased, and Accounts Payable has been posted.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">GRN Number:</span>
                    <strong className="text-indigo-700">{inwardSuccessInfo.grnNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supplier Bill:</span>
                    <strong className="text-slate-800">{inwardSuccessInfo.billNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Inward Value:</span>
                    <strong className="text-slate-900">₹{Number(inwardSuccessInfo.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div className="flex justify-center gap-2 pt-2">
                  <Link
                    href="/inventory/purchase"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                  >
                    View Inward Register
                  </Link>
                  <button
                    onClick={() => {
                      setOrderToInward(null);
                      setInwardSuccessInfo(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Inward Consignment (GRN)</h4>
                    <p className="text-xs text-slate-500">Convert PO #{orderToInward.poNumber} into stock</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div><strong>Supplier:</strong> {orderToInward.supplierName}</div>
                  <div><strong>Items to receive:</strong> {orderToInward.items?.length} line item(s)</div>
                  <div><strong>Total value:</strong> ₹{Number(orderToInward.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier Invoice / Challan Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-98421"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    The supplier&apos;s printed bill number on the physical package.
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setOrderToInward(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={inwarding || !supplierInvoiceNo.trim()}
                    onClick={handleConfirmInward}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {inwarding ? 'Inwarding...' : 'Confirm Inward & Post Stock'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
