'use client';

import React, { useState, useEffect } from 'react';

export default function SupplierMasterPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd fetch from a /api/suppliers route.
    // For now, this is a placeholder UI that we'll build out.
    setLoading(false);
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supplier Master</h1>
          <p className="text-slate-500 text-sm">Manage your vendors and accounts payable</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition">
          + Add New Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No suppliers found. They will be auto-created when you make a purchase, or you can add one manually.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Supplier Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">GSTIN</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Phone</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Address</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{s.gstin || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
