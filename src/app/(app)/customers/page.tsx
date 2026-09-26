'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Phone,
  ArrowUpRight,
  RefreshCw,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Plus,
  X,
  Banknote,
  CreditCard,
  QrCode,
  TrendingDown,
  Star,
  UserPlus,
  ChevronRight,
  Edit2,
  Trash2,
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  gstin?: string;
  stateCode?: string;
  territory?: { name: string; zone?: string | null };
  outstandingBalance: number;
  loyaltyPoints: number;
  totalBills: number;
  isActive?: boolean;
}

interface Summary {
  total: number;
  totalOutstanding: number;
  overdueCount: number;
  clearedCount: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
    const [territoryEnabled, setTerritoryEnabled] = useState(false);
    const [regions, setRegions] = useState<any[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add customer modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
    const [openingBalance, setOpeningBalance] = useState('');
  const [addGstin, setAddGstin] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addPincode, setAddPincode] = useState('');
  const [addStateCode, setAddStateCode] = useState('');
    const [addRegionId, setAddRegionId] = useState('');
    const [addZoneId, setAddZoneId] = useState('');
    const [addTerritoryId, setAddTerritoryId] = useState('');
    const [addBeatId, setAddBeatId] = useState('');
    const [rememberHierarchy, setRememberHierarchy] = useState(true);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // Record Payment modal
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState('');
  const [payError, setPayError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = search ? `/api/customers?q=${encodeURIComponent(search)}` : '/api/customers';
      const res = await fetch(url);
        const tRes = await fetch('/api/territories/hierarchy');
        const tData = await tRes.json();
        if (tData.success) {
          setTerritoryEnabled(tData.enabled);
          setRegions(tData.regions || []);
        }
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  
  // Flattened lists for smart auto-fill
  const allZones = regions.flatMap(r => r.zones?.map((z: any) => ({ ...z, parentRegion: r.id })) || []);
  const allTerritories = allZones.flatMap((z: any) => z.territories?.map((t: any) => ({ ...t, parentZone: z.id, parentRegion: z.parentRegion })) || []);
  const allBeats = allTerritories.flatMap((t: any) => t.beats?.map((b: any) => ({ ...b, parentTerritory: t.id, parentZone: t.parentZone, parentRegion: t.parentRegion })) || []);

  const handleBeatChange = (beatId: string) => {
    setAddBeatId(beatId);
    if (!beatId) return;
    const beat = allBeats.find((b: any) => b.id === beatId);
    if (beat) {
      setAddTerritoryId(beat.parentTerritory);
      setAddZoneId(beat.parentZone);
      setAddRegionId(beat.parentRegion);
    }
  };

  const handleTerritoryChange = (territoryId: string) => {
    setAddTerritoryId(territoryId);
    setAddBeatId('');
    if (!territoryId) return;
    const territory = allTerritories.find((t: any) => t.id === territoryId);
    if (territory) {
      setAddZoneId(territory.parentZone);
      setAddRegionId(territory.parentRegion);
    }
  };

  const handleZoneChange = (zoneId: string) => {
    setAddZoneId(zoneId);
    setAddTerritoryId('');
    setAddBeatId('');
    if (!zoneId) return;
    const zone = allZones.find((z: any) => z.id === zoneId);
    if (zone) {
      setAddRegionId(zone.parentRegion);
    }
  };


  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    setAddError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          phone: addPhone,
            openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
          gstin: addGstin || undefined,
          email: addEmail || undefined,
          address: addAddress || undefined,
          pincode: addPincode || undefined,
          stateCode: addStateCode || undefined,
            regionId: addRegionId || undefined,
            zoneId: addZoneId || undefined,
            territoryId: addTerritoryId || undefined,
            beatId: addBeatId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      setShowAddModal(false);
      setAddName(''); setAddPhone(''); setAddGstin(''); setAddEmail(''); setAddAddress(''); setAddPincode(''); setAddStateCode(''); if (!rememberHierarchy) {
              setAddRegionId(''); setAddZoneId(''); setAddTerritoryId(''); setAddBeatId('');
            }
      load();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddSaving(false);
    }
  };

  const openPayModal = (c: Customer) => {
    setPayCustomer(c);
    setPayAmount(c.outstandingBalance.toFixed(2));
    setPayMode('CASH');
    setPayNotes('');
    setPaySuccess('');
    setPayError('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer) return;
    setPayLoading(true);
    setPayError('');
    setPaySuccess('');
    try {
      const res = await fetch(`/api/customers/${payCustomer.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(payAmount), mode: payMode, notes: payNotes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to record payment');
      setPaySuccess(data.message);
      load();
      setTimeout(() => { setPayCustomer(null); setPaySuccess(''); }, 2200);
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const buildWhatsApp = (c: Customer) => {
    const phone = (c.phone || '').replace(/\D/g, '');
    const msg = `Hello *${c.name}*,\n\nThis is a gentle reminder from our store.\n\nYour current outstanding *Receivables balance is ₹${c.outstandingBalance.toFixed(2)}*.\n\nKindly clear at your earliest convenience.\n\nThank you! 🙏`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <span>Customer Accounts & Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Track customer profiles, credit balances, and loyalty points</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/customers/aging"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            Aging Report
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Customers</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{summary.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{summary.clearedCount} Cleared</p>
          </div>
          <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Total Receivables</p>
            <p className="text-2xl font-black text-rose-600 mt-1">
              ₹{summary.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-rose-500 mt-0.5">{summary.overdueCount} with pending balance</p>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Cleared Accounts</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{summary.clearedCount}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Zero outstanding balance</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Overdue Accounts</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{summary.overdueCount}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Need follow-up</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by name, phone or GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-14 text-slate-400 flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-xs">Loading customer records...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-25" />
            <p className="text-sm font-semibold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400 mt-1">Customers auto-save when you create bills, or add them manually above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Bills</th>
                  <th className="px-4 py-3 text-right">Loyalty Pts</th>
                  <th className="px-4 py-3 text-right">Outstanding Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const bal = c.outstandingBalance;
                  const isOverdue = bal > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
    <div className="font-bold text-slate-900">{c.name}</div>
    {c.isActive === false && <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-rose-100 text-rose-700 rounded border border-rose-200">Inactive</span>}
  </div>
                          {c.territory && <div className="text-[10px] text-indigo-500 font-bold">{c.territory.name}</div>}
                        {c.gstin && (
                          <div className="text-[10px] text-slate-400 font-mono">{c.gstin}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {c.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 font-semibold">{c.totalBills}</td>
                      <td className="px-4 py-3 text-right">
                        {c.loyaltyPoints > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-700 font-bold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {c.loyaltyPoints}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-black text-sm ${isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            <Clock className="h-3 w-3" />
                            Due Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Clear
                          </span>
                        )}
                      </td>
                      
<td className="px-4 py-3">
  <div className="flex items-center justify-center gap-2">
    <button onClick={() => { setEditCustomer(c); setEditError(''); setIsEditModalOpen(true); }} className="p-1 text-slate-400 hover:text-indigo-600 transition" title="Edit Customer"><Edit2 className="h-4 w-4" /></button>
    <button onClick={async () => {
      if(window.confirm('Delete customer?')) {
        const res = await fetch('/api/customers?id='+c.id, {method:'DELETE'});
        const data = await res.json().catch(()=>null);
        if(!res.ok || (data && !data.success)) {
          alert(data?.error || "Failed to delete customer.");
        } else {
          load();
        }
      }
    }} className="p-1 text-slate-400 hover:text-rose-600 transition" title="Delete Customer"><Trash2 className="h-4 w-4" /></button>

                          {/* Record Payment */}
                          {isOverdue && (
                            <button
                              onClick={() => openPayModal(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                              title="Record Receivables Payment"
                            >
                              <IndianRupee className="h-3 w-3" />
                              Collect
                            </button>
                          )}
                          {/* WhatsApp Reminder */}
                          {isOverdue && (
                            <a
                              href={buildWhatsApp(c)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold transition"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Remind
                            </a>
                          )}
                          {/* Edit / Delete Buttons */}
<button onClick={() => { setEditCustomer(c); setEditError(''); setIsEditModalOpen(true); }} className="p-1 text-slate-400 hover:text-indigo-600 transition" title="Edit Customer"><Edit2 className="h-4 w-4" /></button>
<button onClick={async () => {
  if(window.confirm('Delete customer?')) {
    const res = await fetch('/api/customers?id='+c.id, {method:'DELETE'});
    const data = await res.json().catch(()=>null);
    if(!res.ok || (data && !data.success)) {
      alert(data?.error || "Failed to delete customer.");
    } else {
      load();
    }
  }
}} className="p-1 text-slate-400 hover:text-rose-600 transition mr-2" title="Delete Customer"><Trash2 className="h-4 w-4" /></button>

                            {/* View Invoices */}
                          <Link
                            href={`/invoices?q=${encodeURIComponent(c.phone)}`}
                            className="inline-flex items-center gap-0.5 text-slate-400 hover:text-indigo-600 text-[11px] font-bold transition"
                            title="View All Invoices"
                          >
                            Bills
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      
      {/* EDIT CUSTOMER MODAL */}
      {isEditModalOpen && editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-black text-slate-800">Edit Customer</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setEditSubmitting(true);
              setEditError('');
              try {
                const res = await fetch('/api/customers', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editCustomer)
                });
                const data = await res.json().catch(()=>null);
                if (res.ok && data?.success) {
                  setIsEditModalOpen(false);
                  load();
                } else {
                  setEditError(data?.error || "Failed to update customer.");
                }
              } catch (e: any) { setEditError(e.message || "Failed to update customer."); }
              finally { setEditSubmitting(false); }
            }} className="p-4 overflow-y-auto space-y-4">
              
              {editError && <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{editError}</div>}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Full Name *</label>
                  <input required type="text" value={editCustomer.name || ''} onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Mobile Number</label>
                    <input type="text" value={editCustomer.phone || ''} onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">GSTIN</label>
                    <input type="text" value={editCustomer.gstin || ''} onChange={(e) => setEditCustomer({...editCustomer, gstin: e.target.value.toUpperCase()})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Email</label>
                  <input type="email" value={editCustomer.email || ''} onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Address</label>
                  <input type="text" value={editCustomer.address || ''} onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editCustomer?.isActive !== false} onChange={(e) => setEditCustomer({...editCustomer, isActive: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span className="text-xs font-semibold text-slate-700">Customer Account is Active</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1 pl-6">Uncheck this to archive the customer and hide them from selection dropdowns.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold transition">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50">
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Add New Customer
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Rajan Enterprises"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Mobile Number (WhatsApp) *</label>
                <input
                  required
                  type="tel"
                  maxLength={10}
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">GSTIN (optional)</label>
                <input
                  type="text"
                  value={addGstin}
                  onChange={(e) => setAddGstin(e.target.value.toUpperCase())}
                  placeholder="29AAAAA0000A1Z5"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      placeholder="e.g. 1500.00"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Amount the customer already owes you.</p>
                  </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">EMAIL (optional)</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="e.g. raj@example.com"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">STATE CODE (optional)</label>
                  <input
                    type="text"
                    value={addStateCode}
                    onChange={(e) => setAddStateCode(e.target.value)}
                    placeholder="e.g. 32"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">ADDRESS (optional)</label>
                  <textarea
                    rows={2}
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="Full physical address"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs resize-none focus:border-indigo-500 focus:outline-none"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">PINCODE (optional)</label>
                  <input
                    type="text"
                    value={addPincode}
                    onChange={(e) => setAddPincode(e.target.value)}
                    placeholder="e.g. 682001"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              
              
              {territoryEnabled && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mt-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-800 flex items-center gap-1.5">
                      Distribution Hierarchy
                    </h3>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rememberHierarchy} 
                        onChange={e => setRememberHierarchy(e.target.checked)} 
                        className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                      />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Remember selection</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Region</label>
                      <select
                        value={addRegionId}
                        onChange={(e) => { setAddRegionId(e.target.value); setAddZoneId(''); setAddTerritoryId(''); setAddBeatId(''); }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Any Region --</option>
                        {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Zone</label>
                      <select
                        value={addZoneId}
                        onChange={(e) => handleZoneChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Any Zone --</option>
                        {(addRegionId ? regions.find((r: any) => r.id === addRegionId)?.zones : allZones)?.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Territory</label>
                      <select
                        value={addTerritoryId}
                        onChange={(e) => handleTerritoryChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Any Territory --</option>
                        {(addZoneId ? allZones.find((z: any) => z.id === addZoneId)?.territories : allTerritories)?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Route / Beat (Fast Select)</label>
                      <select
                        value={addBeatId}
                        onChange={(e) => handleBeatChange(e.target.value)}
                        className="w-full rounded-lg border-2 border-indigo-400 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none bg-white font-semibold text-indigo-900 shadow-sm"
                      >
                        <option value="">-- Select Route to Auto-Fill --</option>
                        {(addTerritoryId ? allTerritories.find((t: any) => t.id === addTerritoryId)?.beats : allBeats)?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}



              {addError && (

                <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-2 rounded-lg">{addError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-60"
                >
                  {addSaving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Collect Receivables Payment</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{payCustomer.name} • {payCustomer.phone}</p>
              </div>
              <button onClick={() => setPayCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Outstanding summary */}
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Outstanding Balance</p>
              <p className="text-2xl font-black text-rose-600 mt-0.5">
                ₹{payCustomer.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {paySuccess ? (
              <div className="flex flex-col items-center py-6 space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="text-sm font-black text-emerald-700 text-center">{paySuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRecordPayment} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Amount Received (₹)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    max={payCustomer.outstandingBalance}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none text-right"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Payment Mode</label>
                  <div className="flex gap-2">
                    {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayMode(m)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-[11px] font-bold transition ${
                          payMode === m
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        {m === 'CASH' && <Banknote className="h-4 w-4" />}
                        {m === 'UPI' && <QrCode className="h-4 w-4" />}
                        {m === 'CARD' && <CreditCard className="h-4 w-4" />}
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Partial payment via Paytm"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {payError && (
                  <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-2 rounded-lg">
                    <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />{payError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPayCustomer(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition disabled:opacity-60 shadow-sm"
                  >
                    {payLoading ? 'Recording...' : '✓ Record Payment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
