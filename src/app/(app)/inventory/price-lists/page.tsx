'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit, Save, Tag } from 'lucide-react';

export default function PriceListsPage() {
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("PERCENTAGE_DISCOUNT");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/price-lists");
      const data = await res.json();
      if (data.success) {
        setPriceLists(data.priceLists);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/price-lists/${editingId}` : "/api/price-lists";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, type, value: Number(value) }),
      });
      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setName("");
        setDescription("");
        setValue("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this price list?")) return;
    try {
      await fetch(`/api/price-lists/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Price Lists</h1>
          <p className="text-sm text-slate-500 font-medium">Create custom pricing rules and tiers for your customers.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setName("");
            setDescription("");
            setValue("");
            setShowModal(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Price List</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-4 py-3">Tier Name</th>
              <th className="px-4 py-3">Rule Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Customers Assigned</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {priceLists.map((list) => (
              <tr key={list.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-bold text-slate-900">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-indigo-500" />
                    <span>{list.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">{list.description}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold text-[10px]">
                    {list.type === "PERCENTAGE_DISCOUNT" ? "Discount on Retail MRP" : "Markup on Purchase Cost"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                  {list.type === "PERCENTAGE_DISCOUNT" ? `${list.value}% OFF` : `+${list.value}%`}
                </td>
                <td className="px-4 py-3">
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-bold">
                    {list._count?.customers || 0} Customers
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => {
                    setEditingId(list.id);
                    setName(list.name);
                    setDescription(list.description || "");
                    setType(list.type);
                    setValue(String(list.value));
                    setShowModal(true);
                  }} className="text-indigo-600 hover:text-indigo-800 p-1">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(list.id)} className="text-rose-600 hover:text-rose-800 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {priceLists.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500 font-medium text-xs">
                  No Price Lists found. Create one to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editingId ? 'Edit' : 'Create'} Price List</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price List Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm focus:border-indigo-500" placeholder="e.g. Tier 1 Distributors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rule Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm focus:border-indigo-500">
                  <option value="PERCENTAGE_DISCOUNT">Discount on Retail Price (Recommended)</option>
                  <option value="MARKUP_ON_COST">Markup on Purchase Cost</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Percentage Value (%)</label>
                <input required type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm focus:border-indigo-500" placeholder="e.g. 15 for 15% OFF" />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">Save Price List</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

