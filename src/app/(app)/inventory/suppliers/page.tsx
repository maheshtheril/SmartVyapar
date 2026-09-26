'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Search, MapPin, Phone, Mail, Edit2, Trash2 } from 'lucide-react';

export default function SupplierMasterPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [addOpeningBalance, setAddOpeningBalance] = useState('');
  const [addOpeningBalanceDate, setAddOpeningBalanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.suppliers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gstin, phone, email, address, openingBalance: addOpeningBalance ? parseFloat(addOpeningBalance) : 0, openingBalanceDate: addOpeningBalanceDate || undefined })
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setIsModalOpen(false);
        setName('');
        setGstin('');
        setPhone('');
        setEmail('');
        setAddress('');
        loadSuppliers();
      } else {
        setFormError(data?.error || "Server returned an invalid response.");
      }
    } catch (err: any) {
      setFormError(err.message || "Network error. Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supplier Master</h1>
          <p className="text-slate-500 text-sm">Manage your vendors and accounts payable</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setFormError(''); }}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 animate-pulse">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No suppliers found. Click the button above to add one manually, or they will be auto-created when you make a purchase.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Supplier Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">GSTIN</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Address</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
    <div className="font-semibold text-slate-800">{s.name}</div>
    {s.isActive === false && <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-rose-100 text-rose-700 rounded border border-rose-200">Inactive</span>}
  </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.gstin ? (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">{s.gstin}</span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        {s.phone && <span className="text-xs text-slate-600 flex items-center gap-1"><Phone className="w-3 h-3"/> {s.phone}</span>}
                        {s.email && <span className="text-xs text-slate-500">{s.email}</span>}
                        {!s.phone && !s.email && <span className="text-slate-400 text-sm">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.address || <span className="text-slate-400 text-sm">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditSupplier(s); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={async () => {
    if(window.confirm('Delete supplier?')) {
      const res = await fetch('/api/suppliers?id='+s.id, {method:'DELETE'});
      const data = await res.json().catch(()=>null);
      if(!res.ok || (data && !data.success)) {
        alert(data?.error || "Failed to delete supplier.");
      } else {
        loadSuppliers();
      }
    }
  }} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        )}
      </div>

      
      {/* Modal */}
      {isEditModalOpen && editSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Edit Supplier</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setFormError('');
              try {
                const res = await fetch('/api/suppliers', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editSupplier)
                });
                
                const data = await res.json().catch(()=>null);
                
                if (res.ok && data?.success) {
                  setIsEditModalOpen(false);
                  loadSuppliers();
                } else {
                  setFormError(data?.error || "Failed to update supplier.");
                }
              } catch (err: any) { 
                setFormError(err.message || "Network error. Failed to update supplier."); 
              } finally {
                setSubmitting(false);
              }
            }} className="p-6 space-y-4">
              {formError && <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input required type="text" value={editSupplier.name || ''} onChange={(e) => setEditSupplier({...editSupplier, name: e.target.value})} placeholder="e.g. Acme Corp" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                <input type="text" value={editSupplier.gstin || ''} onChange={(e) => setEditSupplier({...editSupplier, gstin: e.target.value.toUpperCase()})} placeholder="e.g. 29AAACB2021A1Z8" className="w-full font-mono text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input type="text" value={editSupplier.phone || ''} onChange={(e) => setEditSupplier({...editSupplier, phone: e.target.value})} placeholder="Phone number" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" value={editSupplier.email || ''} onChange={(e) => setEditSupplier({...editSupplier, email: e.target.value})} placeholder="Email address" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
                <textarea rows={3} value={editSupplier.address || ''} onChange={(e) => setEditSupplier({...editSupplier, address: e.target.value})} placeholder="Full street address..." className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"></textarea>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editSupplier?.isActive !== false} onChange={(e) => setEditSupplier({...editSupplier, isActive: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span className="text-xs font-semibold text-slate-700">Supplier Account is Active</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1 pl-6">Uncheck this to archive the vendor and hide them from active dropdowns.</p>
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Add New Supplier</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                <input type="text" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="e.g. 29AAACB2021A1Z8" className="w-full font-mono text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
                <textarea rows={3} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full street address..." className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"></textarea>
              </div>
              <div>
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={editSupplier?.isActive !== false} onChange={(e) => setEditSupplier({...editSupplier, isActive: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
      <span className="text-xs font-semibold text-slate-700">Supplier is Active</span>
    </label>
  </div>
  <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
