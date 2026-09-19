'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Warehouse as WarehouseIcon,
  Plus,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Printer,
  Ban,
  Building2,
  Package,
  Calendar,
  Search,
  Check,
  FileText,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export default function StockTransfersPage() {
  const [activeTab, setActiveTab] = useState<'TRANSFERS' | 'WAREHOUSES'>('TRANSFERS');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Warehouse Modal State
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whCity, setWhCity] = useState('Kochi');
  const [whIsDefault, setWhIsDefault] = useState(false);
  const [savingWh, setSavingWh] = useState(false);

  // New Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWhId, setFromWhId] = useState('');
  const [toWhId, setToWhId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferItems, setTransferItems] = useState<
    Array<{ productId: string; productName: string; quantity: number; unit: string }>
  >([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [dispatching, setDispatching] = useState(false);

  // Challan Print Modal State
  const [selectedChallan, setSelectedChallan] = useState<any | null>(null);
  const [showChallanModal, setShowChallanModal] = useState(false);

  // Feedback Messages
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [whRes, trRes, prodRes] = await Promise.all([
        fetch('/api/warehouses'),
        fetch(`/api/inventory/transfers${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`),
        fetch('/api/products'),
      ]);

      const [whData, trData, prodData] = await Promise.all([
        whRes.json(),
        trRes.json(),
        prodRes.json(),
      ]);

      if (whData.success) {
        setWarehouses(whData.warehouses || []);
        if (whData.warehouses?.length >= 2 && !fromWhId) {
          setFromWhId(whData.warehouses[0].id);
          setToWhId(whData.warehouses[1].id);
        }
      }
      if (trData.success) setTransfers(trData.transfers || []);
      if (prodData.success) setProducts(prodData.products || []);
    } catch (err: any) {
      console.error('Error loading transfer data:', err);
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Handle Create Warehouse
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWh(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: whName,
          code: whCode.trim().toUpperCase(),
          address: whAddress,
          city: whCity,
          isDefault: whIsDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create warehouse');

      showMsg('Warehouse created successfully!');
      setShowWarehouseModal(false);
      setWhName('');
      setWhCode('');
      setWhAddress('');
      loadData();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setSavingWh(false);
    }
  };

  // Add Item to Transfer List
  const handleAddItemToTransfer = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = Number(itemQty);
    if (isNaN(qty) || qty <= 0) {
      showMsg('Please enter a valid transfer quantity', 'error');
      return;
    }

    // Check if already in list
    const existingIdx = transferItems.findIndex((it) => it.productId === prod.id);
    if (existingIdx >= 0) {
      const updated = [...transferItems];
      updated[existingIdx].quantity += qty;
      setTransferItems(updated);
    } else {
      setTransferItems([
        ...transferItems,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unit: prod.unit || 'PCS',
        },
      ]);
    }

    setItemQty('1');
  };

  const handleRemoveTransferItem = (idx: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== idx));
  };

  // Handle Dispatch Transfer
  const handleDispatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferItems.length === 0) {
      showMsg('Please add at least one product to transfer', 'error');
      return;
    }

    if (fromWhId === toWhId) {
      showMsg('Source and destination warehouse must be different', 'error');
      return;
    }

    setDispatching(true);
    try {
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: fromWhId,
          toWarehouseId: toWhId,
          vehicleNo: vehicleNo.trim() || undefined,
          driverName: driverName.trim() || undefined,
          notes: transferNotes.trim() || undefined,
          items: transferItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch stock transfer');

      showMsg(`Transfer ${data.transfer?.transferNumber || ''} dispatched successfully!`);
      setShowTransferModal(false);
      setTransferItems([]);
      setVehicleNo('');
      setDriverName('');
      setTransferNotes('');
      loadData();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setDispatching(false);
    }
  };

  // Mark Received
  const handleReceiveTransfer = async (transferId: string) => {
    if (!confirm('Confirm receiving all goods at the destination warehouse? This will increment local stock.')) {
      return;
    }
    try {
      const res = await fetch(`/api/inventory/transfers/${transferId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECEIVE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to receive transfer');

      showMsg('Stock received and inventory updated!');
      loadData();
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  };

  // Cancel Transfer
  const handleCancelTransfer = async (transferId: string) => {
    const reason = prompt('Please enter reason for cancellation:', 'Shipment returned / order cancelled');
    if (!reason) return;

    try {
      const res = await fetch(`/api/inventory/transfers/${transferId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel transfer');

      showMsg('Transfer cancelled and stock restored to source warehouse.');
      loadData();
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  };

  const inTransitCount = transfers.filter((t) => t.status === 'DISPATCHED').length;
  const receivedCount = transfers.filter((t) => t.status === 'RECEIVED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link href="/inventory" className="hover:text-indigo-600 transition">
              Inventory
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Multi-Warehouse & Transfers</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <ArrowLeftRight className="h-6 w-6 text-indigo-600" />
            <span>Multi-Warehouse & Rack Transfers</span>
          </h1>
          <p className="text-xs text-slate-500">
            Internal stock movements, transit tracking, and statutory dispatch challans
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWarehouseModal(true)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-indigo-600 flex items-center space-x-1.5 transition"
          >
            <WarehouseIcon className="h-4 w-4 text-indigo-600" />
            <span>Add Warehouse / Godown</span>
          </button>

          <button
            onClick={() => setShowTransferModal(true)}
            disabled={warehouses.length < 2}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 flex items-center space-x-1.5 transition disabled:opacity-50"
            title={warehouses.length < 2 ? 'Create at least 2 warehouses to dispatch transfers' : ''}
          >
            <Plus className="h-4 w-4" />
            <span>New Stock Transfer</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Warehouses / Godowns
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <WarehouseIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{warehouses.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active storage locations</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              In-Transit Transfers
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{inTransitCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Dispatched, awaiting destination receipt</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Completed Transfers
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Check className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{receivedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Successfully received into inventory</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'TRANSFERS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Stock Transfers & Dispatch Challans</span>
        </button>

        <button
          onClick={() => setActiveTab('WAREHOUSES')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'WAREHOUSES'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Warehouse Locations ({warehouses.length})</span>
        </button>
      </div>

      {/* TAB 1: Transfers List */}
      {activeTab === 'TRANSFERS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-semibold">Filter Status:</span>
            {['ALL', 'DISPATCHED', 'RECEIVED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Transfers Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Challan / Transfer #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">From (Source)</th>
                    <th className="py-3 px-4">To (Destination)</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No stock transfers recorded. Click "New Stock Transfer" to dispatch goods.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((tr) => (
                      <tr key={tr.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                          {tr.transferNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(tr.dispatchDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {tr.fromWarehouse?.name}
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-700">
                          {tr.toWarehouse?.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {tr.items?.length || 0} items
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {tr.vehicleNo || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              tr.status === 'DISPATCHED'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : tr.status === 'RECEIVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {tr.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedChallan(tr);
                                setShowChallanModal(true);
                              }}
                              className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] flex items-center space-x-1"
                              title="Print Dispatch Challan"
                            >
                              <Printer className="h-3 w-3 text-slate-500" />
                              <span>Challan</span>
                            </button>

                            {tr.status === 'DISPATCHED' && (
                              <>
                                <button
                                  onClick={() => handleReceiveTransfer(tr.id)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center space-x-1 shadow-xs"
                                  title="Confirm Goods Received at Destination"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Receive</span>
                                </button>
                                <button
                                  onClick={() => handleCancelTransfer(tr.id)}
                                  className="px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 font-semibold text-[11px]"
                                  title="Cancel and restore stock to source"
                                >
                                  <Ban className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Warehouses List */}
      {activeTab === 'WAREHOUSES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span>{wh.name}</span>
                    {wh.isDefault && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700">
                        Default
                      </span>
                    )}
                  </h3>
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                    {wh.code}
                  </span>
                </div>
                <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{wh.address || 'Address not specified'} ({wh.city || 'Kochi'})</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between text-xs text-slate-500">
                <span>Dispatches: {wh._count?.transfersSent || 0}</span>
                <span>Inward: {wh._count?.transfersReceived || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Add Warehouse */}
      {showWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <WarehouseIcon className="h-5 w-5 text-indigo-600" />
                <span>Add Storage Location / Godown</span>
              </h3>
              <button
                onClick={() => setShowWarehouseModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Godown, Counter Rack A"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Warehouse Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-NORTH, RACK-A"
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono uppercase focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street / Industrial Area"
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={whCity}
                    onChange={(e) => setWhCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-5 space-x-2">
                  <input
                    type="checkbox"
                    id="whDefault"
                    checked={whIsDefault}
                    onChange={(e) => setWhIsDefault(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor="whDefault" className="font-semibold text-slate-700 text-xs">
                    Set as Default Store
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWarehouseModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWh}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {savingWh ? 'Saving...' : 'Save Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: New Stock Transfer (Dispatch Challan) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-2.5">
                <Truck className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-base">New Stock Transfer (Dispatch Note)</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchTransfer} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From (Source Godown) *</label>
                  <select
                    value={fromWhId}
                    onChange={(e) => setFromWhId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white font-semibold text-slate-800"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">To (Destination) *</label>
                  <select
                    value={toWhId}
                    onChange={(e) => setToWhId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white font-semibold text-indigo-700"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id} disabled={wh.id === fromWhId}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. KL07AB1234"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Name / Carrier</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              {/* Item Adder Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800">Add Items to Transfer</h4>
                <div className="flex flex-col sm:flex-row items-end gap-2">
                  <div className="flex-1 w-full">
                    <label className="block font-medium text-slate-600 mb-1">Select Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                    >
                      <option value="">-- Choose item from catalog --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock} {p.unit || 'PCS'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="block font-medium text-slate-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-center"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToTransfer}
                    disabled={!selectedProductId}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Items Table */}
              {transferItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-[11px]">
                      <tr>
                        <th className="p-2.5">Product Name</th>
                        <th className="p-2.5 text-center">Quantity</th>
                        <th className="p-2.5 text-center">Unit</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transferItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-800">{item.productName}</td>
                          <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="p-2.5 text-center text-slate-500">{item.unit}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveTransferItem(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent stock transfer for tomorrow morning rush"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching || transferItems.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {dispatching ? 'Dispatching...' : 'Dispatch Stock Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Printable Delivery Challan */}
      {showChallanModal && selectedChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base uppercase tracking-wider">
                  Goods Delivery Challan
                </h3>
                <p className="text-[11px] text-slate-500">Internal Warehouse Transfer Note</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Challan</span>
                </button>
                <button
                  onClick={() => setShowChallanModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div id="challan-printable" className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Challan Number
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedChallan.transferNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Dispatch Date
                  </span>
                  <span className="font-bold text-slate-800">
                    {new Date(selectedChallan.dispatchDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Source (From)
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedChallan.fromWarehouse?.name}
                  </span>
                  <p className="text-[11px] text-slate-500">{selectedChallan.fromWarehouse?.address}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Destination (To)
                  </span>
                  <span className="font-bold text-indigo-700">
                    {selectedChallan.toWarehouse?.name}
                  </span>
                  <p className="text-[11px] text-slate-500">{selectedChallan.toWarehouse?.address}</p>
                </div>
              </div>

              {selectedChallan.vehicleNo && (
                <div className="flex gap-4 text-xs font-semibold text-slate-700">
                  <span>Vehicle No: {selectedChallan.vehicleNo}</span>
                  {selectedChallan.driverName && <span>Driver: {selectedChallan.driverName}</span>}
                </div>
              )}

              <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 font-bold text-[10px] uppercase text-slate-600">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 text-center">Qty Dispatched</th>
                    <th className="p-2.5 text-center">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedChallan.items?.map((it: any, idx: number) => (
                    <tr key={it.id || idx}>
                      <td className="p-2.5 text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{it.productName}</td>
                      <td className="p-2.5 text-center font-bold text-indigo-700">
                        {it.quantity}
                      </td>
                      <td className="p-2.5 text-center text-slate-500">{it.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-[10px] font-bold text-slate-500">
                <div className="border-t border-dashed border-slate-300 pt-2">
                  Authorized Dispatcher Signature
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2">
                  Destination Receiver Signature & Seal
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
