'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UtensilsCrossed, 
  ChefHat, 
  Users, 
  Clock, 
  Plus, 
  CheckCircle2, 
  RefreshCw, 
  ArrowLeft, 
  Printer, 
  Receipt, 
  Sparkles,
  Search,
  X,
  CreditCard,
  Banknote,
  QrCode
} from 'lucide-react';
import KotPrintModal, { KotPrintData } from '@/components/KotPrintModal';
import ThermalReceiptModal, { ThermalReceiptData } from '@/components/ThermalReceiptModal';

interface TableData {
  id: string;
  name: string;
  section: string;
  capacity: number;
  status: 'VACANT' | 'OCCUPIED' | 'BILLED';
  currentTotal: string | number;
  occupiedAt: string | null;
  kots: any[];
}

export default function RestaurantPosPage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  // Active Selected Table for Ordering or Settling
  const [activeTable, setActiveTable] = useState<TableData | null>(null);
  const [orderItems, setOrderItems] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    notes: string;
  }[]>([]);
  const [waiterName, setWaiterName] = useState('Captain 1');
  const [guestCount, setGuestCount] = useState(2);
  const [menuSearch, setMenuSearch] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);

  // KOT & Receipt Print Modals
  const [kotPrintData, setKotPrintData] = useState<KotPrintData | null>(null);
  const [showKotModal, setShowKotModal] = useState(false);

  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>({
    name: 'Ziona Biryani & Restaurant',
    gstin: '32AAAAA0000A1Z5',
    phone: '9876543210',
    upiId: 'zionabusiness@icici',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Tables & Menu from Neon DB
  const loadData = async () => {
    setLoading(true);
    try {
      const [tablesRes, prodsRes] = await Promise.all([
        fetch('/api/restaurant/tables').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
      ]);

      if (tablesRes.success) {
        setTables(tablesRes.tables || []);
      }
      if (prodsRes.success) {
        setMenuItems(prodsRes.products || []);
        if (prodsRes.tenant) {
          setBusinessProfile({
            name: prodsRes.tenant.businessName,
            gstin: prodsRes.tenant.gstin,
            phone: prodsRes.tenant.phone,
            address: prodsRes.tenant.address,
            upiId: prodsRes.tenant.upiId,
          });
        }
      }
    } catch (err) {
      console.error('Error loading restaurant data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Order Modal for Table
  const handleOpenOrder = (table: TableData) => {
    setActiveTable(table);
    setOrderItems([]);
    setShowOrderModal(true);
  };

  // Add Item to Current KOT Ticket
  const handleAddItemToOrder = (item: any) => {
    const existing = orderItems.find((x) => x.productId === item.id);
    if (existing) {
      setOrderItems(
        orderItems.map((x) =>
          x.productId === item.id ? { ...x, quantity: x.quantity + 1 } : x
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: item.id,
          productName: item.name,
          quantity: 1,
          unitPrice: Number(item.sellingPrice),
          notes: '',
        },
      ]);
    }
  };

  const handleUpdateItemQty = (prodId: string, delta: number) => {
    setOrderItems(
      orderItems
        .map((x) => (x.productId === prodId ? { ...x, quantity: x.quantity + delta } : x))
        .filter((x) => x.quantity > 0)
    );
  };

  const handleUpdateItemNotes = (prodId: string, notes: string) => {
    setOrderItems(
      orderItems.map((x) => (x.productId === prodId ? { ...x, notes } : x))
    );
  };

  // Fire KOT to Kitchen
  const handleFireKot = async () => {
    if (!activeTable || orderItems.length === 0) {
      alert('Please add at least one dish to fire KOT');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/restaurant/kot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: activeTable.id,
          waiterName,
          guestCount,
          items: orderItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fire KOT');
      }

      // Show KOT Print Preview
      setKotPrintData({
        kotNumber: data.kot.kotNumber,
        tableName: activeTable.name,
        waiterName,
        guestCount,
        createdAt: data.kot.createdAt,
        items: data.kot.items.map((i: any) => ({
          productName: i.productName,
          quantity: Number(i.quantity),
          notes: i.notes,
        })),
      });

      setShowOrderModal(false);
      setShowKotModal(true);
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Settle Table & Generate Bill with Backflushing
  const handleSettleTable = async (paymentMode: 'CASH' | 'UPI') => {
    if (!activeTable) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/restaurant/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: activeTable.id,
          customerName: `Dine-in Guest`,
          customerPhone: '9876543210',
          paymentMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to settle table');
      }

      if (data.invoice) {
        const inv = data.invoice;
        setReceiptData({
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          cashierName: 'Counter Cashier',
          items: inv.items.map((i: any) => ({
            name: i.productName,
            hsn: i.hsnCode,
            quantity: Number(i.quantity),
            unit: i.unitSold || 'Portion',
            price: Number(i.unitPrice),
            total: Number(i.lineTotal),
          })),
          subTotal: Number(inv.subtotal),
          cgstAmount: Number(inv.cgstAmount),
          sgstAmount: Number(inv.sgstAmount),
          totalAmount: Number(inv.totalAmount),
          paymentMode: inv.paymentMode,
          upiUri: inv.upiUri,
        });

        setShowSettleModal(false);
        setShowReceiptModal(true);
      } else {
        setShowSettleModal(false);
      }

      loadData();
    } catch (err: any) {
      alert('Error settling table: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tables by section
  const filteredTables = tables.filter((t) =>
    selectedSection === 'ALL' ? true : t.section === selectedSection
  );

  const sections = Array.from(new Set(tables.map((t) => t.section)));
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const vacantCount = tables.filter((t) => t.status === 'VACANT').length;
  const liveDiningTotal = tables.reduce(
    (acc, t) => acc + (t.status === 'OCCUPIED' ? Number(t.currentTotal) : 0),
    0
  );

  // Filter menu items for modal search
  const filteredMenu = menuItems.filter((item) =>
    menuSearch
      ? item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(menuSearch.toLowerCase()))
      : true
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/inventory/recipes"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <UtensilsCrossed className="h-6 w-6 text-indigo-600" />
              <span>Restaurant Dine-In & KOT Terminal</span>
            </h1>
            <p className="text-xs text-slate-500">
              Live Table Floor Plan, Kitchen Order Tickets (KOT), Recipe Auto-Backflushing, and Settle
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/inventory/recipes"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5 shadow-sm"
          >
            <ChefHat className="h-4 w-4 text-indigo-600" />
            <span>Recipe BOM</span>
          </Link>
          <button
            onClick={loadData}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Refresh tables"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Tables</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{tables.length} Tables</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all floor sections</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-amber-800">Occupied (Dining)</div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{occupiedCount} Tables</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Kitchen orders in progress</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-800">Vacant / Available</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{vacantCount} Tables</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Ready for seating</div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-indigo-800">Live Dine-in Total</div>
          <div className="mt-1 text-2xl font-bold text-indigo-900">
            ₹{liveDiningTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-indigo-700 mt-0.5">Active dining tickets</div>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSection('ALL')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
            selectedSection === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Floor Sections ({tables.length})
        </button>
        {sections.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              selectedSection === sec
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Table Floor Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'OCCUPIED';
          const activeKotCount = table.kots?.length || 0;

          return (
            <div
              key={table.id}
              className={`rounded-3xl border p-5 transition flex flex-col justify-between shadow-sm relative overflow-hidden ${
                isOccupied
                  ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-200'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-black text-slate-900 tracking-tight">
                      {table.name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {table.capacity}p
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      isOccupied
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {table.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-medium">{table.section}</div>

                {/* Running Total & Status Detail */}
                {isOccupied ? (
                  <div className="mt-4 rounded-2xl bg-white/90 p-3 border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Live Bill:</span>
                      <span className="text-base font-black text-slate-900">
                        ₹{Number(table.currentTotal).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-amber-700 font-medium">
                      <span className="flex items-center space-x-1">
                        <ChefHat className="h-3 w-3" />
                        <span>{activeKotCount} Active KOT{activeKotCount > 1 ? 's' : ''}</span>
                      </span>
                      {table.occupiedAt && (
                        <span className="flex items-center space-x-1 text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(table.occupiedAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 py-3 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Table Vacant • Ready for Guest
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleOpenOrder(table)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition flex items-center justify-center space-x-1 ${
                    isOccupied
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isOccupied ? '+ Add Item / KOT' : 'Seat & Order'}</span>
                </button>

                {isOccupied && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTable(table);
                      setShowSettleModal(true);
                    }}
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition flex items-center space-x-1"
                    title="Settle Bill and release table"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Settle</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW ORDER / PUNCH KOT MODAL */}
      {showOrderModal && activeTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
                  {activeTable.name}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base">
                    Punch KOT • Table {activeTable.name} ({activeTable.section})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add dishes, assign chef notes, and fire ticket to the kitchen
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                  <span>Guests:</span>
                  <input
                    type="number"
                    min="1"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center font-bold"
                  />
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Left Menu, Right Active Ticket */}
            <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
              {/* Left Column: Menu Selector */}
              <div className="md:col-span-7 p-5 border-r border-slate-100 flex flex-col overflow-hidden">
                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search menu dishes (e.g. Biryani, 65, Soda)..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Dish Cards Grid */}
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 gap-2.5">
                  {filteredMenu.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAddItemToOrder(item)}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-300 text-left transition flex flex-col justify-between group"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.category || 'Kitchen Dish'}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900">
                          ₹{Number(item.sellingPrice).toFixed(0)}
                        </span>
                        <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                          + Add
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Active KOT Ticket */}
              <div className="md:col-span-5 p-5 flex flex-col justify-between bg-slate-50/50 overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Active KOT Items ({orderItems.length})</span>
                    <span className="text-[11px] text-slate-400">Click + / - to adjust</span>
                  </div>

                  {orderItems.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No items selected yet. Click dishes on the left to add.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {orderItems.map((item) => (
                        <div
                          key={item.productId}
                          className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">
                              {item.productName}
                            </span>
                            <span className="font-bold text-xs text-slate-900">
                              ₹{(item.unitPrice * item.quantity).toFixed(0)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-2 rounded-xl bg-slate-100 p-1 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, -1)}
                                className="h-5 w-5 rounded-lg bg-white text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-200"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold px-1">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, 1)}
                                className="h-5 w-5 rounded-lg bg-white text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-200"
                              >
                                +
                              </button>
                            </div>

                            {/* Cooking Note Input */}
                            <input
                              type="text"
                              placeholder="Chef note (e.g. less spicy)..."
                              value={item.notes}
                              onChange={(e) =>
                                handleUpdateItemNotes(item.productId, e.target.value)
                              }
                              className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-[10px] focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ticket Footer */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-sm font-black text-slate-900">
                    <span>Estimated KOT Total:</span>
                    <span>
                      ₹
                      {orderItems
                        .reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
                        .toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting || orderItems.length === 0}
                    onClick={handleFireKot}
                    className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-amber-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-50 transition"
                  >
                    <ChefHat className="h-4 w-4" />
                    <span>Fire KOT to Kitchen (Thermal Print)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTLE TABLE BILL MODAL */}
      {showSettleModal && activeTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  Settle Bill • Table {activeTable.name}
                </h3>
              </div>
              <button
                onClick={() => setShowSettleModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Net Amount Payable
                </div>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  ₹{Number(activeTable.currentTotal).toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                  Includes Food Cost & Dual GST • Auto-depletes recipe stock
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Choose Settlement Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSettleTable('UPI')}
                    disabled={isSubmitting}
                    className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs flex flex-col items-center space-y-1 transition"
                  >
                    <QrCode className="h-5 w-5 text-indigo-600" />
                    <span>Pay via UPI (GPay/PhonePe)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSettleTable('CASH')}
                    disabled={isSubmitting}
                    className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex flex-col items-center space-y-1 transition"
                  >
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    <span>Cash Settlement</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KOT Print Thermal Ticket Modal */}
      <KotPrintModal
        isOpen={showKotModal}
        onClose={() => setShowKotModal(false)}
        kot={kotPrintData}
      />

      {/* Final ESC/POS Customer Tax Receipt Modal */}
      <ThermalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        data={receiptData}
        business={businessProfile}
      />
    </div>
  );
}
