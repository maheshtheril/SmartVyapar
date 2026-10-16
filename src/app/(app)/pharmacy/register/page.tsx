'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Printer, 
  FileCheck, 
  AlertCircle, 
  RefreshCw,
  Filter,
  User,
  Stethoscope
} from 'lucide-react';

export default function ScheduleHRegisterPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacy/register?schedule=${scheduleFilter}&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.registerEntries || []);
      }
    } catch (err) {
      console.error('Failed to load drug register:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegister();
  }, [scheduleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRegister();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Compliance Declaration */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Schedule H & H1 Drug Dispensing Register
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Mandatory Statutory Register under Drugs & Cosmetics Rules, 1945 (Form 20B/21B). Ready for Drug Inspector audit.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5 shadow-2xs"
          >
            <Printer className="h-4 w-4 text-indigo-600" />
            <span>Print Register</span>
          </button>
          <button
            onClick={loadRegister}
            className="rounded-xl p-2 border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-2xs"
            title="Refresh register"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Schedule Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Controlled Drugs' },
            { id: 'H1', label: 'Schedule H1 (Antibiotics / Habit)' },
            { id: 'H', label: 'Schedule H (Prescription)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setScheduleFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                scheduleFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine, doctor, patient..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </form>
      </div>

      {/* Register Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-4">Date / Bill #</th>
                <th className="py-3 px-4">Patient Details</th>
                <th className="py-3 px-4">Prescribing Doctor</th>
                <th className="py-3 px-4">Medicine & Generic Name</th>
                <th className="py-3 px-4">Batch / Expiry</th>
                <th className="py-3 px-4 text-right">Qty Dispensed</th>
                <th className="py-3 px-4 text-center">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    Loading statutory drug dispensing register...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-600 font-bold text-sm">No Schedule H/H1 drugs recorded yet</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Controlled drugs billed with Doctor prescriptions will automatically log here.
                    </p>
                  </td>
                </tr>
              ) : (
                entries.map((item) => {
                  const inv = item.invoice || {};
                  const prod = item.product || {};
                  const batch = item.batch || {};
                  const isH1 = prod.isScheduleH1;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{inv.patientName || 'Walk-in Patient'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {inv.patientAge ? `${inv.patientAge} Yrs` : ''} 
                          {inv.patientGender ? ` • ${inv.patientGender}` : ''}
                          {inv.customerPhone ? ` • ${inv.customerPhone}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                          <Stethoscope className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span>{inv.doctorName ? `Dr. ${inv.doctorName}` : 'Self / Registered'}</span>
                        </div>
                        {inv.doctorRegNo && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            Reg: {inv.doctorRegNo}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        {prod.drugGenericName && (
                          <div className="text-[11px] text-slate-500 italic max-w-xs truncate">
                            {prod.drugGenericName}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-700">
                          {item.batchNumber || batch.batchNumber || 'N/A'}
                        </div>
                        {batch.expiryDate && (
                          <div className="text-[11px] text-slate-400">
                            Exp: {new Date(batch.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {Number(item.quantity)} {item.unitSold || 'PCS'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                            isH1
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isH1 ? 'Schedule H1' : 'Schedule H'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
