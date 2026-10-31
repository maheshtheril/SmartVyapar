'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Search,
  ShieldCheck,
  Barcode,
  ArrowLeftRight,
  Laptop,
  Headphones,
  Tablet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Printer,
  Copy,
  PlusCircle,
  Sparkles,
  Clock,
  IndianRupee,
  Receipt,
  Check,
  ChevronRight,
  Filter,
  RefreshCw,
  Tag,
  CreditCard,
  Building2,
  Calendar,
  X
} from 'lucide-react';

export default function ElectronicsCommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalUnits: 0,
    inStockCount: 0,
    soldCount: 0,
    defectiveCount: 0,
    todaySales: 0,
    recentInvoiceCount: 0,
  });
  const [devices, setDevices] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'inventory' | 'lookup' | 'tradein' | 'invoices'>('inventory');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Instant IMEI Lookup State
  const [lookupImei, setLookupImei] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [barcodeModalDevice, setBarcodeModalDevice] = useState<any>(null);
  const [warrantySlipDevice, setWarrantySlipDevice] = useState<any>(null);

  // Inward Form State
  const [inwardForm, setInwardForm] = useState({
    productId: '',
    imei1: '',
    imei2: '',
    serialNumber: '',
    color: 'Natural Titanium',
    warrantyMonths: 12,
  });
  const [inwardSubmitting, setInwardSubmitting] = useState(false);
  const [inwardSuccessMsg, setInwardSuccessMsg] = useState<string | null>(null);

  // Trade-in State
  const [tradeInBrand, setTradeInBrand] = useState('Apple');
  const [tradeInModel, setTradeInModel] = useState('iPhone 14 Pro');
  const [tradeInStorage, setTradeInStorage] = useState('128GB');
  const [tradeInCustomer, setTradeInCustomer] = useState('');
  const [tradeInPhone, setTradeInPhone] = useState('');
  const [tradeInScreen, setTradeInScreen] = useState<'flawless' | 'minor' | 'cracked'>('flawless');
  const [tradeInBodyDents, setTradeInBodyDents] = useState(false);
  const [tradeInBatteryHealth, setTradeInBatteryHealth] = useState(true);
  const [tradeInBoxBill, setTradeInBoxBill] = useState(true);
  const [tradeInBiometrics, setTradeInBiometrics] = useState(true);
  const [tradeInVoucher, setTradeInVoucher] = useState<any>(null);
  const [tradeInCalculating, setTradeInCalculating] = useState(false);

  // Load Devices and Stats
  const loadData = async () => {
    setLoading(true);
    try {
      let url = `/api/electronics/devices?status=${statusFilter}`;
      if (searchQuery.trim()) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setDevices(data.devices || []);
        setRecentInvoices(data.recentInvoices || []);
        if (data.devices?.length && !inwardForm.productId) {
          setInwardForm(prev => ({ ...prev, productId: data.devices[0].product.id }));
        }
      }
    } catch (err) {
      console.error('Failed to load electronics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Handle Instant IMEI Lookup
  const handleLookup = async (imeiToSearch?: string) => {
    const target = (imeiToSearch || lookupImei).trim();
    if (!target) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await fetch(`/api/electronics/lookup?imei=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (data.found) {
        setLookupResult(data.device);
      } else {
        setLookupError(data.message || `No device found with IMEI / Serial '${target}'`);
      }
    } catch (err) {
      setLookupError('Network error while searching IMEI.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Calculate Trade-in
  const calculateTradeIn = async () => {
    setTradeInCalculating(true);
    try {
      const res = await fetch('/api/electronics/trade-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: tradeInBrand,
          modelName: tradeInModel,
          storage: tradeInStorage,
          customerName: tradeInCustomer,
          customerPhone: tradeInPhone,
          hasDisplayScratch: tradeInScreen === 'minor',
          hasDisplayCracks: tradeInScreen === 'cracked',
          hasBodyDents: tradeInBodyDents,
          isBatteryHealthy: tradeInBatteryHealth,
          hasBoxAndBill: tradeInBoxBill,
          hasWorkingBiometrics: tradeInBiometrics,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTradeInVoucher(data.voucher);
      }
    } catch (err) {
      console.error('Trade-in calculation failed:', err);
    } finally {
      setTradeInCalculating(false);
    }
  };

  // Submit Inward Form
  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardForm.productId || !inwardForm.imei1.trim()) return;

    setInwardSubmitting(true);
    setInwardSuccessMsg(null);

    try {
      const res = await fetch('/api/electronics/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inwardForm),
      });
      const data = await res.json();
      if (data.success) {
        setInwardSuccessMsg(`Successfully inwarded IMEI ${inwardForm.imei1}`);
        setInwardForm({
          productId: inwardForm.productId,
          imei1: '',
          imei2: '',
          serialNumber: '',
          color: 'Natural Titanium',
          warrantyMonths: 12,
        });
        loadData();
        setTimeout(() => {
          setShowInwardModal(false);
          setInwardSuccessMsg(null);
        }, 1200);
      } else {
        alert(data.error || 'Failed to inward device');
      }
    } catch (err) {
      alert('Error saving device');
    } finally {
      setInwardSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Smartphone className="w-3.5 h-3.5" />
              Dual-IMEI & Serial Number Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Mobile & Electronics Command Center
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Real-time 15-digit IMEI tracking, manufacturer warranty verification, device trade-in valuation, and fast serial POS dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowInwardModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Inward Device (IMEI)
            </button>
            <Link
              href="/pos"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Receipt className="w-4 h-4" />
              Fast POS Dispatch
            </Link>
            <button
              onClick={() => loadData()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-Time KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* In-Stock Units */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In-Stock Units</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.inStockCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Ready for Sale</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Out of {stats.totalUnits} total serialized devices
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              ₹{Number(stats.todaySales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {stats.recentInvoiceCount} customer invoices generated
          </div>
        </div>

        {/* Sold / Invoiced Units */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sold Devices</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.soldCount}</span>
            <span className="text-xs text-indigo-600 font-medium">With Active Warranty</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            IMEIs attached to tax invoices
          </div>
        </div>

        {/* Under RMA / Repair */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Under Service / RMA</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.defectiveCount}</span>
            <span className="text-xs text-amber-600 font-medium">Service Center</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Defective unit / Warranty claim
          </div>
        </div>
      </div>

      {/* 3. Instant 15-Digit IMEI & Serial Quick-Scanner Bar */}
      <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Instant 15-Digit IMEI & Warranty Scanner</h2>
              <p className="text-xs text-slate-500">Scan box barcode or enter IMEI / Serial to view sale history, invoice, and manufacturer warranty.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Quick Test:</span>
            <button
              onClick={() => {
                setLookupImei('356938114920180');
                handleLookup('356938114920180');
              }}
              className="text-[11px] font-mono px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium cursor-pointer"
            >
              iPhone (Sold)
            </button>
            <button
              onClick={() => {
                setLookupImei('356938114920194');
                handleLookup('356938114920194');
              }}
              className="text-[11px] font-mono px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium cursor-pointer"
            >
              iPhone (In-Stock)
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={lookupImei}
              onChange={(e) => setLookupImei(e.target.value)}
              placeholder="Point barcode scanner here or type 15-digit IMEI / Serial number..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            {lookupImei && (
              <button
                type="button"
                onClick={() => {
                  setLookupImei('');
                  setLookupResult(null);
                  setLookupError(null);
                }}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !lookupImei.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {lookupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Lookup Warranty
          </button>
        </form>

        {/* Lookup Result Box */}
        {lookupResult && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">{lookupResult.product.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    lookupResult.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-800' :
                    lookupResult.status === 'SOLD' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {lookupResult.status === 'IN_STOCK' ? '● In Stock' : lookupResult.status === 'SOLD' ? '● Sold / Invoiced' : '● In Service (RMA)'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono">
                  <span>IMEI 1: <strong className="text-slate-900">{lookupResult.imei1}</strong></span>
                  {lookupResult.imei2 && <span>IMEI 2: <strong className="text-slate-900">{lookupResult.imei2}</strong></span>}
                  {lookupResult.serialNumber && <span>S/N: <strong className="text-slate-900">{lookupResult.serialNumber}</strong></span>}
                  {lookupResult.color && <span className="font-sans px-2 py-0.5 bg-white rounded border border-slate-200">{lookupResult.color}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBarcodeModalDevice(lookupResult)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  Print 2x1 Barcode Label
                </button>
                {lookupResult.warranty && (
                  <button
                    onClick={() => setWarrantySlipDevice(lookupResult)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Print Warranty Slip
                  </button>
                )}
              </div>
            </div>

            {/* Warranty Status Banner */}
            {lookupResult.warranty ? (
              <div className="mt-3 pt-3 border-t border-blue-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-blue-100">
                  <span className="text-slate-500 block text-[11px]">Customer & Invoice</span>
                  <strong className="text-slate-900 text-xs block">{lookupResult.warranty.customerName}</strong>
                  <span className="text-slate-500 font-mono text-[11px]">{lookupResult.warranty.customerPhone} • {lookupResult.warranty.invoiceNumber}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-blue-100">
                  <span className="text-slate-500 block text-[11px]">Warranty Expiration</span>
                  <strong className="text-slate-900 text-xs block">
                    {new Date(lookupResult.warranty.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </strong>
                  <span className="text-slate-500 text-[11px]">({lookupResult.warranty.warrantyMonths} Months Brand Warranty)</span>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 block text-[11px]">Warranty Validity</span>
                  <strong className="text-emerald-800 text-xs block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {lookupResult.warranty.daysRemaining} Days Active
                  </strong>
                  <span className="text-emerald-600 text-[11px]">Eligible for Brand Service Center claim</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Device is currently <strong>in stock</strong> and ready for retail sale. 12-Month manufacturer warranty activates upon customer invoice creation.</span>
              </div>
            )}
          </div>
        )}

        {lookupError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}
      </div>

      {/* 4. Tab Switcher Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Device Inventory & IMEIs ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab('tradein')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'tradein'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Old Device Trade-In / Buyback
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Recent Invoices with Scanned IMEIs ({recentInvoices.length})
        </button>
      </div>

      {/* TAB 1: DEVICE INVENTORY & IMEIs */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'IN_STOCK', 'SOLD', 'DEFECTIVE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' && 'All Devices'}
                  {st === 'IN_STOCK' && '● In Stock'}
                  {st === 'SOLD' && '● Sold / Invoiced'}
                  {st === 'DEFECTIVE' && '● Under Service (RMA)'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                placeholder="Search model, brand, IMEI..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Device & Specifications</th>
                    <th className="py-3 px-4">Primary IMEI 1</th>
                    <th className="py-3 px-4">Dual-SIM IMEI 2 / Serial</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Warranty</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {devices.map((device) => {
                    const isSold = device.status === 'SOLD';
                    return (
                      <tr key={device.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{device.product.name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-blue-600">{device.product.brand}</span>
                            <span>•</span>
                            <span>SKU: {device.product.sku}</span>
                            {device.color && (
                              <>
                                <span>•</span>
                                <span className="inline-block px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">{device.color}</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">
                              {device.imei1}
                            </span>
                            <button
                              onClick={() => copyToClipboard(device.imei1, device.imei1)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                              title="Copy IMEI"
                            >
                              {copiedCode === device.imei1 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5 font-mono text-[11px] text-slate-600">
                            {device.imei2 ? (
                              <div>SIM 2: {device.imei2}</div>
                            ) : (
                              <div className="text-slate-400 italic">No SIM 2</div>
                            )}
                            {device.serialNumber && (
                              <div className="text-slate-500">S/N: {device.serialNumber}</div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            device.status === 'IN_STOCK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            device.status === 'SOLD' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {device.status === 'IN_STOCK' && '● In Stock'}
                            {device.status === 'SOLD' && '● Sold'}
                            {device.status === 'DEFECTIVE' && '● RMA Service'}
                          </span>
                          {isSold && device.invoiceItem?.invoice && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              Inv: {device.invoiceItem.invoice.invoiceNumber}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-900">
                          ₹{Number(device.product.sellingPrice || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-slate-700 text-xs font-medium">
                            {device.warrantyMonths || 12} Mo Brand
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setBarcodeModalDevice(device)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                              title="Print 2x1 Barcode Label"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setLookupImei(device.imei1);
                                handleLookup(device.imei1);
                                window.scrollTo({ top: 180, behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEVICE TRADE-IN / BUYBACK ESTIMATOR */}
      {activeTab === 'tradein' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Store Buyback Valuation
            </div>
            <h2 className="text-xl font-bold text-slate-900">Old Smartphone & Gadget Exchange Estimator</h2>
            <p className="text-xs text-slate-500 mt-1">
              Evaluate walk-in customer old devices and generate instant exchange discount vouchers applied directly at POS checkout.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Brand */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Device Brand</label>
                <select
                  value={tradeInBrand}
                  onChange={(e) => setTradeInBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Apple">Apple</option>
                  <option value="Samsung">Samsung</option>
                  <option value="OnePlus">OnePlus</option>
                  <option value="Google Pixel">Google Pixel</option>
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model Name</label>
                <select
                  value={tradeInModel}
                  onChange={(e) => setTradeInModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="iPhone 15 Pro">iPhone 15 Pro</option>
                  <option value="iPhone 15">iPhone 15</option>
                  <option value="iPhone 14 Pro">iPhone 14 Pro</option>
                  <option value="iPhone 14">iPhone 14</option>
                  <option value="iPhone 13 Pro">iPhone 13 Pro</option>
                  <option value="iPhone 13">iPhone 13</option>
                  <option value="Galaxy S23 Ultra">Galaxy S23 Ultra</option>
                  <option value="Galaxy S23">Galaxy S23</option>
                  <option value="Galaxy S22 Ultra">Galaxy S22 Ultra</option>
                  <option value="OnePlus 12">OnePlus 12</option>
                  <option value="Pixel 8 Pro">Pixel 8 Pro</option>
                </select>
              </div>

              {/* Storage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Capacity</label>
                <select
                  value={tradeInStorage}
                  onChange={(e) => setTradeInStorage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="128GB">128GB</option>
                  <option value="256GB">256GB</option>
                  <option value="512GB">512GB</option>
                  <option value="1TB">1TB</option>
                </select>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  value={tradeInCustomer}
                  onChange={(e) => setTradeInCustomer(e.target.value)}
                  placeholder="e.g. Ramesh Nair"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Condition Checklist */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Device Physical & Functional Condition</h3>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">Screen Condition:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'flawless', label: 'Flawless (No Scratch)' },
                      { id: 'minor', label: 'Minor Scratches (-10%)' },
                      { id: 'cracked', label: 'Cracked Glass (-35%)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTradeInScreen(opt.id as any)}
                        className={`p-2 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                          tradeInScreen === opt.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tradeInBatteryHealth}
                      onChange={(e) => setTradeInBatteryHealth(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Battery Health Healthy (&gt;= 80%)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tradeInBiometrics}
                      onChange={(e) => setTradeInBiometrics(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>FaceID / TouchID Fully Working</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tradeInBoxBill}
                      onChange={(e) => setTradeInBoxBill(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Original Box & Bill Present (+₹1,500 Bonus)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tradeInBodyDents}
                      onChange={(e) => setTradeInBodyDents(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Body Frame Dents or Major Scuffs (-8%)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={calculateTradeIn}
                disabled={tradeInCalculating}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {tradeInCalculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Calculate Buyback & Generate Voucher
              </button>
            </div>

            {/* Generated Voucher Slip */}
            {tradeInVoucher && (
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 shadow-sm animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Exchange Voucher Generated</span>
                    <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">
                      {tradeInVoucher.brand} {tradeInVoucher.modelName} ({tradeInVoucher.storage})
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Instant Store Credit</span>
                    <span className="text-2xl font-black text-emerald-700">
                      ₹{tradeInVoucher.estimatedCredit.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Voucher Code:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-emerald-200">
                      {tradeInVoucher.code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(tradeInVoucher.code, 'voucher')}
                      className="p-1 hover:bg-emerald-100 rounded text-emerald-700 cursor-pointer"
                    >
                      {copiedCode === 'voucher' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <span className="text-slate-500 text-[11px]">Valid for 7 days at POS checkout</span>
                </div>

                {tradeInVoucher.breakdown?.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-emerald-200/60 text-[11px] text-slate-600 space-y-0.5">
                    {tradeInVoucher.breakdown.map((b: string, idx: number) => (
                      <div key={idx}>• {b}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RECENT ELECTRONICS INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Electronics Invoices with Printed IMEIs</h3>
            <span className="text-xs text-slate-500">{recentInvoices.length} invoices found</span>
          </div>

          <div className="divide-y divide-slate-100">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600 text-sm">{inv.invoiceNumber}</span>
                      <span className="text-xs font-semibold text-slate-900">{inv.customerName}</span>
                      <span className="text-xs text-slate-500 font-mono">({inv.customerPhone})</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>{new Date(inv.invoiceDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">{inv.paymentMode}</span>
                      {inv.notes && <span className="text-blue-700 font-medium">({inv.notes})</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">Paid in Full</span>
                  </div>
                </div>

                {/* Inward Items with IMEI */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                  {inv.items?.map((it: any, iIdx: number) => (
                    <div key={iIdx} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                      <div className="font-medium text-slate-800">{it.productName}</div>
                      <div className="flex items-center gap-3">
                        {it.imeiNumber && (
                          <span className="font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            IMEI: {it.imeiNumber}
                          </span>
                        )}
                        <span className="font-semibold text-slate-900">₹{Number(it.lineTotal).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Inward New Device (IMEI) */}
      {showInwardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Inward Serialized Device</h3>
              </div>
              <button
                onClick={() => setShowInwardModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
                <select
                  value={inwardForm.productId}
                  onChange={(e) => setInwardForm(prev => ({ ...prev, productId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                >
                  {devices.map((d) => (
                    <option key={d.product.id} value={d.product.id}>
                      {d.product.name} (₹{Number(d.product.sellingPrice).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary 15-Digit IMEI 1 *</label>
                <input
                  type="text"
                  value={inwardForm.imei1}
                  onChange={(e) => setInwardForm(prev => ({ ...prev, imei1: e.target.value }))}
                  placeholder="e.g. 356938114920299"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dual-SIM IMEI 2 (Optional)</label>
                  <input
                    type="text"
                    value={inwardForm.imei2}
                    onChange={(e) => setInwardForm(prev => ({ ...prev, imei2: e.target.value }))}
                    placeholder="e.g. 356938114920300"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hardware Serial (S/N)</label>
                  <input
                    type="text"
                    value={inwardForm.serialNumber}
                    onChange={(e) => setInwardForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="e.g. F2LX9039MD6R"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Color / Finish</label>
                  <input
                    type="text"
                    value={inwardForm.color}
                    onChange={(e) => setInwardForm(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="e.g. Natural Titanium"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty (Months)</label>
                  <input
                    type="number"
                    value={inwardForm.warrantyMonths}
                    onChange={(e) => setInwardForm(prev => ({ ...prev, warrantyMonths: parseInt(e.target.value) || 12 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {inwardSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{inwardSuccessMsg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inwardSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {inwardSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Register & Inward Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 50mm x 25mm (2" x 1") Thermal Barcode Label Preview */}
      {barcodeModalDevice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">2" x 1" Thermal Box Label</h3>
              </div>
              <button
                onClick={() => setBarcodeModalDevice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated 2x1 Thermal Label */}
            <div className="my-5 p-4 border-2 border-dashed border-slate-400 rounded-lg bg-white shadow-inner font-mono text-center">
              <div className="text-[11px] font-extrabold uppercase tracking-tight text-slate-900 truncate">
                {barcodeModalDevice.product.name}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                MRP: ₹{Number(barcodeModalDevice.product.mrp || barcodeModalDevice.product.sellingPrice).toLocaleString('en-IN')}
                {barcodeModalDevice.color && ` • ${barcodeModalDevice.color}`}
              </div>

              {/* Code 128 Simulated Barcode */}
              <div className="my-2 py-1 bg-slate-950 flex justify-center items-center h-10 px-4 rounded">
                <div className="w-full flex justify-between h-8 items-center bg-white px-2">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${i % 3 === 0 ? 'w-1 bg-black' : i % 2 === 0 ? 'w-0.5 bg-black' : 'w-1 bg-white'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="text-xs font-black tracking-widest text-slate-900">
                {barcodeModalDevice.imei1}
              </div>
              {barcodeModalDevice.serialNumber && (
                <div className="text-[9px] text-slate-500 mt-0.5">
                  S/N: {barcodeModalDevice.serialNumber}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">TSC / Zebra / TVS 50x25mm</span>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Official Brand Warranty Certificate */}
      {warrantySlipDevice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Warranty Certificate</h3>
              </div>
              <button
                onClick={() => setWarrantySlipDevice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-800">ElectroPulse Digital Mart</span>
                <span className="text-[10px] text-slate-500">Authorized Retail Partner</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">DEVICE MODEL</span>
                <span className="font-bold text-slate-900 text-sm">{warrantySlipDevice.product.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">PRIMARY IMEI</span>
                  <span className="font-semibold text-slate-800">{warrantySlipDevice.imei1}</span>
                </div>
                {warrantySlipDevice.serialNumber && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">SERIAL NUMBER</span>
                    <span className="font-semibold text-slate-800">{warrantySlipDevice.serialNumber}</span>
                  </div>
                )}
              </div>

              {warrantySlipDevice.warranty && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 font-bold">
                    <span>Warranty Status:</span>
                    <span>Active ({warrantySlipDevice.warranty.daysRemaining} Days Left)</span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Expiry Date: {new Date(warrantySlipDevice.warranty.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-emerald-600">
                    Invoice: {warrantySlipDevice.warranty.invoiceNumber} • Buyer: {warrantySlipDevice.warranty.customerName}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setWarrantySlipDevice(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
