'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FlaskConical, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Barcode, 
  Printer, 
  RefreshCw, 
  Filter, 
  FileText, 
  User, 
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  X
} from 'lucide-react';

import LabNav from '@/components/lab/LabNav';

export default function LabQueuePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Accession Modal state
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('MALE');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [newClinicalHistory, setNewClinicalHistory] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  // Tube Barcode Thermal Print Modal
  const [barcodeModalOrder, setBarcodeModalOrder] = useState<any | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/orders?status=${statusFilter}&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load lab queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMasters = async () => {
    try {
      const [testsRes, docsRes] = await Promise.all([
        fetch('/api/lab/tests'),
        fetch('/api/lab/doctors')
      ]);
      const testsData = await testsRes.json();
      const docsData = await docsRes.json();
      if (testsData.success) setAvailableTests(testsData.tests || []);
      if (docsData.success) setAvailableDoctors(docsData.doctors || []);
    } catch (err) {
      console.error('Failed to load lab masters:', err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  useEffect(() => {
    loadMasters();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleCollectSample = async (orderId: string) => {
    try {
      const res = await fetch(`/api/lab/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'COLLECT_SAMPLE' })
      });
      const data = await res.json();
      if (data.success) {
        loadOrders();
      }
    } catch (err) {
      console.error('Failed to collect sample:', err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !selectedTestIds.length) {
      alert('Please enter patient name and select at least one diagnostic test.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const doctor = availableDoctors.find(d => d.id === newDoctorId);
      const res = await fetch('/api/lab/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: newPatientName,
          patientAge: newPatientAge ? parseInt(newPatientAge) : null,
          patientGender: newPatientGender,
          patientPhone: newPatientPhone,
          referringDoctorId: newDoctorId || null,
          referringDoctorName: doctor ? doctor.name : null,
          clinicalHistory: newClinicalHistory,
          testIds: selectedTestIds
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewOrderModal(false);
        setNewPatientName('');
        setNewPatientAge('');
        setNewPatientPhone('');
        setNewDoctorId('');
        setNewClinicalHistory('');
        setSelectedTestIds([]);
        loadOrders();
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Error creating order:', err);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const toggleTestSelection = (testId: string) => {
    setSelectedTestIds(prev => 
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SAMPLE_PENDING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ Phlebotomy Pending</span>;
      case 'SAMPLE_COLLECTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">🩸 Sample Drawn</span>;
      case 'IN_TESTING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">🔬 Testing in Progress</span>;
      case 'RESULTS_ENTERED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">📝 Awaiting Doctor Sign-off</span>;
      case 'VERIFIED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✅ Authorized & Released</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <LabNav onNewAccession={() => setNewOrderModal(true)} />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <FlaskConical className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Phlebotomy & Sample Accession Queue
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time specimen lifecycle tracking from blood draw to pathologist sign-off.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setNewOrderModal(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Lab Accession</span>
          </button>
          <button
            onClick={loadOrders}
            className="rounded-xl p-2 border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-2xs"
            title="Refresh queue"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'SAMPLE_PENDING', label: '⏳ Phlebotomy Pending' },
            { id: 'SAMPLE_COLLECTED', label: '🩸 Sample Drawn' },
            { id: 'IN_TESTING', label: '🔬 In Testing' },
            { id: 'RESULTS_ENTERED', label: '📝 Need Verification' },
            { id: 'VERIFIED', label: '✅ Released' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, Phone, Order No (e.g. LAB-2610-0001), or Tube Barcode (SMP-...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 transition font-medium"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders List / Cards */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading Accession Queue...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <FlaskConical className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No lab accessions match the current filter</p>
          <p className="text-xs text-slate-400">Click &quot;New Lab Accession&quot; to register a walk-in patient or check your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
                order.hasCriticalAlert ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left: Patient & Barcode */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-slate-900">{order.patientName}</span>
                    <span className="text-xs font-bold text-slate-500">
                      ({order.patientAge}y / {order.patientGender})
                    </span>
                    {getStatusBadge(order.status)}
                    {order.hasCriticalAlert && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        <span>CRITICAL ALERT</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center space-x-1">
                      <Barcode className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-mono font-bold text-indigo-950">{order.sampleBarcode}</span>
                    </span>
                    <span>Order: <strong className="text-slate-700">{order.orderNumber}</strong></span>
                    {order.patientPhone && <span>Phone: {order.patientPhone}</span>}
                    {order.referringDoctorName && (
                      <span className="flex items-center space-x-1 text-slate-600">
                        <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Ref: {order.referringDoctorName}</span>
                      </span>
                    )}
                  </div>

                  {order.sampleType && (
                    <p className="text-[11px] text-slate-500 italic">
                      Specimen: <span className="font-semibold text-slate-700">{order.sampleType}</span>
                    </p>
                  )}
                </div>

                {/* Middle: Tests Badges */}
                <div className="flex flex-wrap gap-1.5 max-w-md">
                  {order.items?.map((item: any) => (
                    <span
                      key={item.id}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {item.testName}
                    </span>
                  ))}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  {/* Tube Barcode Sticker Button */}
                  <button
                    onClick={() => setBarcodeModalOrder(order)}
                    className="p-2 border border-slate-200 hover:border-slate-300 bg-white rounded-xl text-slate-600 hover:text-indigo-600 transition"
                    title="Print Tube Barcode Thermal Sticker"
                  >
                    <Barcode className="h-4 w-4" />
                  </button>

                  {/* Draw Blood button if pending */}
                  {order.status === 'SAMPLE_PENDING' && (
                    <button
                      onClick={() => handleCollectSample(order.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-2xs flex items-center space-x-1"
                    >
                      <span>Collect Blood</span>
                    </button>
                  )}

                  {/* Enter results or verify */}
                  {order.status !== 'VERIFIED' ? (
                    <Link
                      href={`/lab/results/${order.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-2xs flex items-center space-x-1"
                    >
                      <span>{order.status === 'SAMPLE_PENDING' ? 'Enter Values' : 'Test Worklist'}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href={`/lab/report/${order.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs flex items-center space-x-1"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Report</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Lab Accession Modal */}
      {newOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FlaskConical className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">New Diagnostic Lab Accession</h3>
              </div>
              <button
                onClick={() => setNewOrderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Menon"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+91 98470 12345"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Referring Doctor</label>
                  <select
                    value={newDoctorId}
                    onChange={(e) => setNewDoctorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Self / Walk-in</option>
                    {availableDoctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.clinicName || 'Clinic'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">Clinical History / Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Fever for 3 days, fasting checkup, diabetic follow-up"
                  value={newClinicalHistory}
                  onChange={(e) => setNewClinicalHistory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 text-xs mb-2">
                  Select Diagnostic Tests to Order *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {availableTests.map(test => {
                    const isSelected = selectedTestIds.includes(test.id);
                    return (
                      <button
                        key={test.id}
                        type="button"
                        onClick={() => toggleTestSelection(test.id)}
                        className={`text-left p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[11px] font-black text-indigo-600">{test.code}</span>
                            <span className="font-medium text-slate-800 truncate max-w-[180px]">{test.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">{test.specimenType}</span>
                        </div>
                        <span className="font-bold text-slate-900">₹{Number(test.price).toFixed(0)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewOrderModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {submittingOrder ? 'Registering Accession...' : 'Generate Accession & Tube Barcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vacutainer Tube Barcode Label Modal */}
      {barcodeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="text-sm font-black text-slate-900">Vacutainer Tube Barcode Label</h3>
            
            {/* Thermal Label Simulation (38mm x 25mm / 2" x 1") */}
            <div className="p-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/80 text-left font-mono text-[11px] leading-tight space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span className="truncate max-w-[180px]">{barcodeModalOrder.patientName}</span>
                <span>{barcodeModalOrder.patientAge}y/{barcodeModalOrder.patientGender?.[0]}</span>
              </div>
              <div className="text-[9px] text-slate-500 font-sans">
                {barcodeModalOrder.orderNumber} | {new Date(barcodeModalOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              
              {/* Simulated Code128 Barcode Lines */}
              <div className="bg-white p-2 rounded border border-slate-200 text-center my-1">
                <div className="h-8 flex items-center justify-center gap-[2px] mx-auto overflow-hidden">
                  {[3,1,2,1,4,1,2,3,1,2,4,2,1,3,1,2,3,1,4,2,1,3,2,1,4,1,2,3,1,2].map((w, i) => (
                    <div key={i} className="bg-black h-full" style={{ width: `${w * 1.5}px` }} />
                  ))}
                </div>
                <div className="font-mono text-xs font-black tracking-widest text-slate-900 mt-1">
                  *{barcodeModalOrder.sampleBarcode}*
                </div>
              </div>

              <div className="text-[9px] font-bold text-slate-600 truncate">
                {barcodeModalOrder.sampleType || 'EDTA Whole Blood'}
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setBarcodeModalOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center space-x-1"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
