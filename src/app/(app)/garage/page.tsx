'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wrench, 
  Plus, 
  Search, 
  CarFront,
  Clock,
  CheckCircle2,
  RefreshCw,
  Banknote,
  AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GarageDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobCards, setJobCards] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchJobCards();
  }, []);

  const fetchJobCards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/job-cards');
      const data = await res.json();
      if (res.ok) {
        setJobCards(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200">IN PROGRESS</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200">COMPLETED</span>;
      case 'INVOICED':
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200">INVOICED</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-200">CANCELLED</span>;
      default:
        return null;
    }
  };

  const filteredCards = jobCards.filter(jc => {
    const matchesSearch = 
      jc.jobCardNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
      jc.vehicle?.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jc.vehicle?.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || jc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-indigo-600" />
            Garage & Service
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer vehicles, open work orders, and track parts & labour.
          </p>
        </div>
        <Link
          href="/garage/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Job Card
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Job Card #, License Plate, or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="INVOICED">Invoiced</option>
        </select>
      </div>

      {/* Kanban / List Grid */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CarFront className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Job Cards Found</h3>
          <p className="text-slate-500 mt-1 mb-6">There are currently no active work orders matching your criteria.</p>
          <Link
            href="/garage/new"
            className="inline-flex bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold text-sm transition"
          >
            Create New Job Card
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((jc) => (
            <Link 
              key={jc.id} 
              href={`/garage/${jc.id}`}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition">
                    {jc.jobCardNumber}
                  </h3>
                  <div className="flex items-center text-xs text-slate-500 mt-1 gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(jc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {getStatusBadge(jc.status)}
              </div>

              <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Vehicle</span>
                  <span className="font-bold text-slate-900 font-mono tracking-wide">{jc.vehicle?.licensePlate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Make/Model</span>
                  <span className="font-semibold text-slate-700 text-sm">{jc.vehicle?.make || 'Unknown'} {jc.vehicle?.model}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Customer</span>
                  <span className="font-semibold text-slate-800 text-sm truncate max-w-[140px]">{jc.vehicle?.customer?.name}</span>
                </div>
              </div>

              <div className="flex justify-between items-end mt-auto">
                <div className="text-sm">
                  <span className="text-slate-500 text-xs font-semibold uppercase block">Est. Total</span>
                  <span className="font-black text-slate-900">₹{Number(jc.estimatedTotal).toFixed(2)}</span>
                </div>
                {jc.status === 'INVOICED' ? (
                  <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    <Banknote className="h-3.5 w-3.5 mr-1" />
                    Billed
                  </div>
                ) : (
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">
                    Open Details &rarr;
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
