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
import { QRCodeSVG } from 'qrcode.react';

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

  // Split-bill selection, table transfer, and floor-plan editor
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [userRole, setUserRole] = useState<string>('STAFF');
  const [billCustomerName, setBillCustomerName] = useState('');
  const [billCustomerPhone, setBillCustomerPhone] = useState('');

  // QR Self-Order modal state
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTable, setQrTable] = useState<any>(null);
  const [tenantSlug, setTenantSlug] = useState('');
  const [tableForm, setTableForm] = useState<{
    id?: string;
    name: string;
    section: string;
    capacity: number;
  }>({ name: '', section: 'Main Hall', capacity: 4 });

  // Load Tables & Menu from Neon DB
  const loadData = async () => {
    setLoading(true);
    try {
      const [tablesRes, prodsRes] = await Promise.all([
        fetch('/api/restaurant/tables').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
      ]);

      if (tablesRes.success) {
        const loaded: any[] = tablesRes.tables || [];
        setTables(loaded);
        // Auto-seed a Takeaway counter if the tenant hasn't set one up yet
        if (!loaded.some((t: any) => t.section === 'Takeaway')) {
          fetch('/api/restaurant/tables', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Takeaway / Parcel', section: 'Takeaway', capacity: 99 }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.success) setTables((prev) => [...prev, res.table]);
            })
            .catch(() => {});
        }
      }
      if (prodsRes.success) {
        setMenuItems(prodsRes.products || []);
        if (prodsRes.tenant) {
          setBusinessProfile({
            name: prodsRes.tenant.businessName,
            logoUrl: prodsRes.tenant.logoUrl || "",
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
    fetch('/api/tenant')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role) setUserRole(d.user.role);
        if (d?.tenant?.slug) setTenantSlug(d.tenant.slug);
      })
      .catch(() => {});
  }, []);

  // Web Audio Kitchen Bell Synthesizer (880Hz crystal chime)
  const playKitchenChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  };

  // Real-Time KDS & Floor synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/restaurant/stream');

      es.addEventListener('kot.created', () => {
        playKitchenChime();
        loadData();
      });

      es.addEventListener('qr.order_received', () => {
        playKitchenChime();
        loadData();
      });

      es.addEventListener('kot.status_changed', () => {
        loadData();
      });

      es.addEventListener('table.updated', () => {
        loadData();
      });
    } catch (e) {
      console.warn('Real-time SSE event stream unavailable:', e);
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  // After any reload, refresh the open table and drop selections for items no longer live
  useEffect(() => {
    if (!activeTable) return;
    const fresh = tables.find((t) => t.id === activeTable.id);
    if (!fresh) return;
    setActiveTable(fresh);
    const liveIds = new Set(
      (fresh.kots || []).flatMap((k: any) => (k.items || []).map((i: any) => i.id))
    );
    setSelectedLineIds((prev) => prev.filter((id) => liveIds.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables]);

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

  // Kitchen status: PREPARING -> READY -> SERVED
  const handleAdvanceKot = async (kotId: string, status: 'READY' | 'SERVED') => {
    try {
      const res = await fetch('/api/restaurant/kot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kotId, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update status');
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Reprint any KOT without re-fetching — data is already in table.kots
  const handleReprintKot = (k: any, tableName: string) => {
    setKotPrintData({
      kotNumber: k.kotNumber,
      tableName,
      waiterName: k.waiterName || '',
      guestCount: k.guestCount || 1,
      createdAt: k.createdAt,
      items: (k.items || [])
        .filter((i: any) => !i.isVoided)
        .map((i: any) => ({
          productName: i.productName,
          quantity: Number(i.quantity),
          notes: i.notes || '',
        })),
    });
    setShowKotModal(true);
  };

  // Open the bill modal with every live item pre-selected
  const openSettle = (table: TableData) => {
    setActiveTable(table);
    setSelectedLineIds(
      (table.kots || []).flatMap((k: any) => (k.items || []).map((i: any) => i.id))
    );
    setBillCustomerName('');
    setBillCustomerPhone('');
    setShowSettleModal(true);
  };

  // Move the running party to a vacant table
  const handleTransfer = async (toTableId: string) => {
    if (!activeTable) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/restaurant/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTableId: activeTable.id, toTableId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Transfer failed');
      setShowTransferModal(false);
      setActiveTable(null);
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create or edit a table
  const handleSaveTable = async () => {
    if (!tableForm.name.trim()) {
      alert('Please enter a table name');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/restaurant/tables', {
        method: tableForm.id ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: tableForm.id,
          name: tableForm.name,
          section: tableForm.section,
          capacity: tableForm.capacity,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save table');
      setTableForm({ name: '', section: tableForm.section, capacity: 4 });
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTable = async (t: TableData) => {
    if (!window.confirm(`Delete table ${t.name}?`)) return;
    try {
      const res = await fetch(`/api/restaurant/tables?id=${t.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete table');
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Settle Table & Generate Bill with Backflushing (full bill, or split by selected items)
  const handleSettleTable = async (paymentMode: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER') => {
    if (!activeTable) return;

    const allIds = (activeTable.kots || []).flatMap((k: any) =>
      (k.items || []).map((i: any) => i.id)
    );
    const isPartial = selectedLineIds.length > 0 && selectedLineIds.length < allIds.length;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/restaurant/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: activeTable.id,
          customerName: billCustomerName.trim() || 'Dine-in Guest',
          customerPhone: billCustomerPhone.replace(/\D/g, '').slice(-10),
          paymentMode,
          ...(isPartial ? { itemIds: selectedLineIds } : {}),
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

        if (data.tableFreed !== false) setShowSettleModal(false);
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
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Mesh Active</span>
          </div>

          <button
            type="button"
            onClick={() => setShowManageModal(true)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4 text-indigo-600" />
            <span>Manage Tables</span>
          </button>
          {(userRole === 'OWNER' || userRole === 'MANAGER') && (
            <Link
              href="/restaurant/report"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5 shadow-sm"
            >
              <Receipt className="h-4 w-4 text-indigo-600" />
              <span>Daily Report</span>
            </Link>
          )}
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

          const isTakeaway = table.section === 'Takeaway';

          return (
            <div
              key={table.id}
              className={`rounded-3xl border p-5 transition flex flex-col justify-between shadow-sm relative overflow-hidden ${
                isTakeaway
                  ? 'border-sky-300 bg-sky-50/40 hover:border-sky-400 hover:shadow-md'
                  : isOccupied
                  ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-200'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-black text-slate-900 tracking-tight">
                      {isTakeaway ? '🛵 ' : ''}{table.name}
                    </span>
                    {!isTakeaway && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {table.capacity}p
                      </span>
                    )}
                    {isTakeaway && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                        Counter
                      </span>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      isOccupied
                        ? 'bg-amber-100 text-amber-800'
                        : isTakeaway
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isTakeaway ? (isOccupied ? 'BUSY' : 'OPEN') : table.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-medium">
                  {table.section}
                  {(table as any).assignedWaiter ? ` • ${(table as any).assignedWaiter}` : ''}
                </div>

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
                    {isTakeaway ? 'Ready for Next Parcel Order' : 'Table Vacant • Ready for Guest'}
                  </div>
                )}
              </div>

              {isOccupied && (table.kots || []).length > 0 && (
                <div className="mt-3 space-y-1">
                  {(table.kots || []).map((k: any) => (
                    <div key={k.id} className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-600">{k.kotNumber}</span>
                      <span className="flex items-center gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 font-bold ${
                            k.status === 'PREPARING'
                              ? 'bg-amber-100 text-amber-800'
                              : k.status === 'READY'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {k.status}
                        </span>
                        {k.status === 'PREPARING' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceKot(k.id, 'READY')}
                            className="rounded-md border border-sky-200 px-1.5 py-0.5 font-bold text-sky-700 hover:bg-sky-50"
                          >
                            Ready
                          </button>
                        )}
                        {k.status !== 'SERVED' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceKot(k.id, 'SERVED')}
                            className="rounded-md border border-emerald-200 px-1.5 py-0.5 font-bold text-emerald-700 hover:bg-emerald-50"
                          >
                            Served
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleReprintKot(k, table.name)}
                          className="rounded-md border border-slate-200 px-1.5 py-0.5 font-bold text-slate-500 hover:bg-slate-50"
                          title="Reprint this KOT"
                        >
                          🖨
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

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
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTable(table);
                        setShowTransferModal(true);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                      title="Move party to another table"
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      onClick={() => openSettle(table)}
                      className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition flex items-center space-x-1"
                      title="View bill, split, discount and settle"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Bill</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQrTable(table);
                    setShowQrModal(true);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition flex items-center justify-center"
                  title="Show QR for self-ordering"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </button>
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
                  <span>Captain:</span>
                  <input
                    type="text"
                    value={waiterName}
                    onChange={(e) => setWaiterName(e.target.value)}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-center font-bold"
                  />
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


                            {/* Cooking Note — quick chips + free text */}
                            <div className="flex-1 space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {(['Extra Spicy','Less Spicy','No Onion','No Garlic','Extra Cheese','Half Portion','No Ice','Extra Sauce'] as const).map((mod) => (
                                  <button
                                    key={mod}
                                    type="button"
                                    onClick={() => {
                                      const cur = item.notes || '';
                                      const active = cur.split(', ').includes(mod);
                                      const next = active
                                        ? cur.split(', ').filter((x) => x !== mod).join(', ')
                                        : cur ? `${cur}, ${mod}` : mod;
                                      handleUpdateItemNotes(item.productId, next);
                                    }}
                                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold border transition ${
                                      (item.notes || '').split(', ').includes(mod)
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'
                                    }`}
                                  >
                                    {mod}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                placeholder="Custom note..."
                                value={item.notes}
                                onChange={(e) => handleUpdateItemNotes(item.productId, e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[10px] focus:outline-none focus:border-indigo-500"
                              />
                            </div>
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

      {/* SETTLE / BILL DETAILS MODAL — split bill, void, complimentary, discount */}
      {showSettleModal && activeTable && (() => {
        const liveLines: any[] = (activeTable.kots || []).flatMap((k: any) =>
          (k.items || []).map((i: any) => ({ ...i, kotNumber: k.kotNumber }))
        );
        const net = (i: any) =>
          i.isComplimentary
            ? 0
            : Math.max(0, Number(i.quantity) * Number(i.unitPrice) - Number(i.discountAmount || 0));
        const selected = liveLines.filter((i) => selectedLineIds.includes(i.id));
        const selectedTotal = selected.reduce((a, i) => a + net(i), 0);
        const isPartial = selected.length > 0 && selected.length < liveLines.length;
        const canAdjust = userRole === 'OWNER' || userRole === 'MANAGER';

        const callItem = async (itemId: string, action: string, extra: any = {}) => {
          try {
            const res = await fetch('/api/restaurant/kot-item', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itemId, action, ...extra }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
            if (data.tableFreed) setShowSettleModal(false);
            loadData();
          } catch (err: any) {
            alert('Error: ' + err.message);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
                <div className="flex items-center space-x-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm md:text-base">
                    Bill • Table {activeTable.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tick the items being paid now (tick a subset to split the bill)</span>
                  <button
                    type="button"
                    className="font-bold text-indigo-600"
                    onClick={() =>
                      setSelectedLineIds(
                        selected.length === liveLines.length ? [] : liveLines.map((i) => i.id)
                      )
                    }
                  >
                    {selected.length === liveLines.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>

                {liveLines.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">No billable items on this table.</div>
                )}

                {liveLines.map((i) => (
                  <div
                    key={i.id}
                    className={`rounded-2xl border p-3 flex items-start gap-3 ${
                      selectedLineIds.includes(i.id) ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedLineIds.includes(i.id)}
                      onChange={(e) =>
                        setSelectedLineIds(
                          e.target.checked
                            ? [...selectedLineIds, i.id]
                            : selectedLineIds.filter((x) => x !== i.id)
                        )
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {Number(i.quantity)} × {i.productName}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {i.isComplimentary ? (
                            <span className="text-emerald-600">FREE</span>
                          ) : (
                            <>
                              {Number(i.discountAmount) > 0 && (
                                <span className="mr-1 text-[10px] text-slate-400 line-through">
                                  ₹{(Number(i.quantity) * Number(i.unitPrice)).toFixed(0)}
                                </span>
                              )}
                              ₹{net(i).toFixed(2)}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {i.kotNumber}
                        {i.notes ? ` • ${i.notes}` : ''}
                        {Number(i.discountAmount) > 0 ? ` • Discount ₹${Number(i.discountAmount)}` : ''}
                      </div>
                      <div className={`mt-1.5 flex flex-wrap gap-1.5 ${canAdjust ? '' : 'hidden'}`}>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                          onClick={() => {
                            const v = window.prompt(
                              `Discount in ₹ for "${i.productName}" (max ₹${(Number(i.quantity) * Number(i.unitPrice)).toFixed(2)}):`,
                              String(Number(i.discountAmount) || 0)
                            );
                            if (v !== null) callItem(i.id, 'DISCOUNT', { discountAmount: Number(v) });
                          }}
                        >
                          Discount
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
                          onClick={() => callItem(i.id, i.isComplimentary ? 'UNDO_COMPLIMENTARY' : 'COMPLIMENTARY')}
                        >
                          {i.isComplimentary ? 'Undo free' : 'Complimentary'}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50"
                          onClick={() => {
                            const reason = window.prompt(`Void "${i.productName}"? Enter a reason:`, 'Customer cancelled');
                            if (reason !== null) callItem(i.id, 'VOID', { reason });
                          }}
                        >
                          Void
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 p-5 space-y-3 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {isPartial ? 'Split payment (selected items)' : 'Amount before GST'}
                    </div>
                    <div className="text-2xl font-black text-slate-900">₹{selectedTotal.toFixed(2)}</div>
                  </div>
                  <div className="text-[11px] text-emerald-700 text-right font-medium">
                    GST added on the invoice
                    <br />
                    Auto-depletes recipe stock
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Customer name (optional)"
                    value={billCustomerName}
                    onChange={(e) => setBillCustomerName(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    placeholder="WhatsApp number (optional)"
                    inputMode="numeric"
                    value={billCustomerPhone}
                    onChange={(e) => setBillCustomerPhone(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {liveLines.length > 0 && selected.length > 0 && (
                  <div className="text-[11px] text-slate-500">
                    Equal split calculator:{' '}
                    {[2, 3, 4].map((n) => (
                      <span key={n} className="mr-2 font-semibold">
                        ÷{n} = ₹{(selectedTotal / n).toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSettleTable('UPI')}
                    disabled={isSubmitting || selected.length === 0}
                    className="p-3 rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs flex flex-col items-center space-y-1 transition disabled:opacity-40"
                  >
                    <QrCode className="h-5 w-5 text-indigo-600" />
                    <span>Pay via UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettleTable('CASH')}
                    disabled={isSubmitting || selected.length === 0}
                    className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex flex-col items-center space-y-1 transition disabled:opacity-40"
                  >
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettleTable('CARD')}
                    disabled={isSubmitting || selected.length === 0}
                    className="p-3 rounded-2xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-xs flex flex-col items-center space-y-1 transition disabled:opacity-40"
                  >
                    <CreditCard className="h-5 w-5 text-sky-600" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettleTable('BANK_TRANSFER')}
                    disabled={isSubmitting || selected.length === 0}
                    className="p-3 rounded-2xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-900 font-bold text-xs flex flex-col items-center space-y-1 transition disabled:opacity-40"
                  >
                    <Receipt className="h-5 w-5 text-violet-600" />
                    <span>NEFT / Bank</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TABLE TRANSFER MODAL */}
      {showTransferModal && activeTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Move {activeTable.name} to another table</h3>
              <button onClick={() => setShowTransferModal(false)} className="rounded-xl p-1 text-slate-400 hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {tables.filter((t) => t.status === 'VACANT').length === 0 && (
                <div className="col-span-3 py-6 text-center text-xs text-slate-400">No vacant tables available.</div>
              )}
              {tables
                .filter((t) => t.status === 'VACANT')
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleTransfer(t.id)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <div className="text-xs font-black text-slate-900">{t.name}</div>
                    <div className="text-[10px] text-slate-500">{t.section} • {t.capacity}p</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE TABLES MODAL — add / edit / delete without a developer */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Manage Tables &amp; Floor Sections</h3>
              <button onClick={() => setShowManageModal(false)} className="rounded-xl p-1 text-slate-400 hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 border-b border-slate-100 space-y-3">
              <div className="text-xs font-bold text-slate-700">
                {tableForm.id ? 'Edit table' : 'Add a new table'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="Name (e.g. T-11)"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <input
                  placeholder="Section (e.g. Rooftop)"
                  list="section-list"
                  value={tableForm.section}
                  onChange={(e) => setTableForm({ ...tableForm, section: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Seats"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <datalist id="section-list">
                  {sections.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveTable}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {tableForm.id ? 'Save changes' : 'Add table'}
                </button>
                {tableForm.id && (
                  <button
                    type="button"
                    onClick={() => setTableForm({ name: '', section: 'Main Hall', capacity: 4 })}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-1.5">
              {tables.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div>
                    <span className="text-xs font-black text-slate-900">{t.name}</span>
                    <span className="ml-2 text-[10px] text-slate-500">{t.section} • {t.capacity} seats</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      onClick={() => setTableForm({ id: t.id, name: t.name, section: t.section, capacity: t.capacity })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={t.status !== 'VACANT'}
                      title={t.status !== 'VACANT' ? 'Table is in use' : 'Delete table'}
                      className="rounded-lg border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
                      onClick={() => handleDeleteTable(t)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
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

      {/* QR Self-Order Modal */}
      {showQrModal && qrTable && (() => {
        const orderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/order/${tenantSlug || 'restaurant'}/${qrTable.id}`;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Scan to Order</h3>
                <p className="text-xs text-slate-500 font-semibold">{qrTable.name} • {qrTable.section}</p>
              </div>

              <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <QRCodeSVG value={orderUrl} size={180} />
              </div>

              <div className="p-2 bg-slate-100 rounded-xl">
                <p className="text-[10px] text-slate-500 font-mono break-all select-all">{orderUrl}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(orderUrl);
                    alert('Order URL copied to clipboard!');
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
