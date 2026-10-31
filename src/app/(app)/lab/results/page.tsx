'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileCheck, 
  Search, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  Printer, 
  ShieldCheck, 
  RefreshCw,
  User,
  Stethoscope,
  Barcode
} from 'lucide-react';

import LabNav from '@/components/lab/LabNav';

export default function LabResultsWorklistPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadWorklist = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/orders?status=ALL&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load worklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorklist();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadWorklist();
  };

  return (
    <div className="space-y-6">
      <LabNav />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <FileCheck className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Diagnostic Testing & Verification Worklist
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Batch result entry, automated normal ranges, and pathologist digital signature authorization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/lab/queue"
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Phlebotomy Queue
          </Link>
          <button
            onClick={loadWorklist}
            className="p-2 border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, Barcode, or Order Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
          >
            Search
          </button>
        </form>
      </div>

      {/* Worklist Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading Worklist...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">No active laboratory orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Sample / Accession</th>
                <th className="py-3 px-4">Patient Information</th>
                <th className="py-3 px-4">Tests Ordered</th>
                <th className="py-3 px-4">Status & Alerts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-indigo-600">{order.sampleBarcode}</div>
                    <span className="font-mono text-[10px] text-slate-400">{order.orderNumber}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{order.patientName}</div>
                    <div className="text-[11px] text-slate-500">
                      {order.patientAge} yrs • {order.patientGender}
                      {order.referringDoctorName && (
                        <span className="text-emerald-700 ml-1.5 font-semibold">
                          (Ref: {order.referringDoctorName})
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {order.items?.map((it: any) => (
                        <span
                          key={it.id}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {it.testName}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      {order.status === 'SAMPLE_PENDING' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ Phlebotomy Pending
                        </span>
                      )}
                      {order.status === 'SAMPLE_COLLECTED' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          🩸 Sample Collected
                        </span>
                      )}
                      {order.status === 'IN_TESTING' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          🔬 In Testing
                        </span>
                      )}
                      {order.status === 'RESULTS_ENTERED' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          📝 Awaiting Sign-off
                        </span>
                      )}
                      {order.status === 'VERIFIED' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✅ Verified & Signed
                        </span>
                      )}

                      {order.hasCriticalAlert && (
                        <div className="text-[10px] font-black text-rose-600 flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>PANIC VALUES RECORDED</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/lab/results/${order.id}`}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-2xs flex items-center space-x-1"
                      >
                        <span>{order.status === 'VERIFIED' ? 'Review Values' : 'Enter Results'}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>

                      {order.status === 'VERIFIED' && (
                        <Link
                          href={`/lab/report/${order.id}`}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-2xs flex items-center space-x-1"
                          title="Print Patient Diagnostic Report"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Report</span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
