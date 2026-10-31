'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FlaskConical, 
  Clock, 
  FileCheck, 
  Printer, 
  Tag, 
  Users, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Barcode, 
  RefreshCw, 
  ChevronRight, 
  ShieldCheck, 
  Stethoscope,
  Sparkles,
  ArrowRight,
  Activity,
  FileText
} from 'lucide-react';
import LabNav from '@/components/lab/LabNav';
import PrintCatalogModal from '@/components/lab/PrintCatalogModal';

export default function LabDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [doctors, setAvailableDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printCatalogOpen, setPrintCatalogOpen] = useState(false);
  const [newOrderModal, setNewOrderModal] = useState(false);

  // New Order Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('MALE');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Barcode Print Modal
  const [barcodeModalOrder, setBarcodeModalOrder] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, testsRes, docsRes] = await Promise.all([
        fetch('/api/lab/orders?status=ALL'),
        fetch('/api/lab/tests'),
        fetch('/api/lab/doctors')
      ]);

      const ordersData = await ordersRes.json();
      const testsData = await testsRes.json();
      const docsData = await docsRes.json();

      if (ordersData.success) setOrders(ordersData.orders || []);
      if (testsData.success) setTests(testsData.tests || []);
      if (docsData.success) setAvailableDoctors(docsData.doctors || []);
    } catch (err) {
      console.error('Failed to load lab command center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = orders.filter(o => o.status === 'SAMPLE_PENDING').length;
  const inTestingCount = orders.filter(o => o.status === 'IN_TESTING' || o.status === 'SAMPLE_COLLECTED').length;
  const awaitingSignoffCount = orders.filter(o => o.status === 'RESULTS_ENTERED').length;
  const verifiedCount = orders.filter(o => o.status === 'VERIFIED').length;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !selectedTestIds.length) {
      alert('Please enter patient name and select at least one test.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const doctor = doctors.find(d => d.id === newDoctorId);
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
        setSelectedTestIds([]);
        loadData();
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Error creating order:', err);
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Universal Lab Navigation */}
      <LabNav 
        onNewAccession={() => setNewOrderModal(true)} 
        onPrintCatalog={() => setPrintCatalogOpen(true)} 
      />

      {/* Hero Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <FlaskConical className="h-3.5 w-3.5 text-indigo-400" />
              <span>NABL ISO 15189:2022 Certified Molecular &amp; Clinical Pathology</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Apex Diagnostics &amp; Pathology LIMS Command Center
            </h1>
            <p className="text-xs md:text-sm text-indigo-200/80 max-w-2xl leading-relaxed">
              Complete diagnostic workflow automation: Walk-in phlebotomy accession, vacutainer tube barcodes, age/gender biological reference ranges, auto-calculated clinical profiles, and tamper-proof QR verified reports.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              onClick={() => setNewOrderModal(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-500/25"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Patient Accession</span>
            </button>
            <button
              onClick={() => setPrintCatalogOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 backdrop-blur-sm"
            >
              <Printer className="h-4 w-4 text-emerald-400" />
              <span>Print Test Catalog (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Real-Time Diagnostic KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Phlebotomy</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded">Samples Due</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Testing</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600">{inTestingCount}</span>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Worklist</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Need Review</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <FileCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-600">{awaitingSignoffCount}</span>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Pathologist</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verified</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{verifiedCount}</span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Delivered</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Test Catalog</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Tag className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-600">{tests.length}</span>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">Active Panels</span>
          </div>
        </div>
      </div>

      {/* 3 Prominent Focus Banners for the Core Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Banner 1: Result Enter */}
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-indigo-900">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">1. Result Entry &amp; Worklist</h3>
              <p className="text-[11px] text-slate-500">Live clinical parameter data entry</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Record investigation values with automated age/gender normal range alerts and automatic clinical formula calculation (Lipid, LFT, CBC).
          </p>
          <Link
            href="/lab/results"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs transition"
          >
            <span>Open Result Entry Worklist</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Banner 2: Report Printout */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-emerald-950">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">2. Official Report Printout</h3>
              <p className="text-[11px] text-slate-500">A4 NABL accredited format with QR code</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Instant A4 patient report preview with scanned pathologist signature, critical panic badges, and tamper-proof verification QR code.
          </p>
          <Link
            href="/lab/report/15570a27-e4e0-4fb8-a348-d0be023bec50"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>View Verified Report (George Varghese)</span>
          </Link>
        </div>

        {/* Banner 3: Test Catalog */}
        <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-purple-950">
            <div className="p-2 bg-purple-600 text-white rounded-xl">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">3. Diagnostic Test Catalog</h3>
              <p className="text-[11px] text-slate-500">32 investigations across all departments</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Configure test packages (CBC, LFT, RFT, Lipid, Thyroid, Glucose), specimen vacutainers, pricing (₹), and print physical test brochures.
          </p>
          <div className="flex items-center space-x-2">
            <Link
              href="/lab/tests"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs transition"
            >
              <span>Manage Catalog</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setPrintCatalogOpen(true)}
              className="px-3.5 py-2 border border-purple-200 bg-white hover:bg-purple-50 text-purple-900 font-bold text-xs rounded-xl transition"
            >
              Print Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Active Laboratory Worklist & Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Active Diagnostic Accessions &amp; Patient Worklist</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                {orders.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click &quot;Enter Results&quot; to input values or &quot;Print Report&quot; to generate official patient sheets.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/lab/queue"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
            >
              View Full Phlebotomy Queue →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading Accessions...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No lab orders found. Click &quot;+ New Patient Accession&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order / Barcode</th>
                  <th className="py-3 px-4">Patient Information</th>
                  <th className="py-3 px-4">Tests Ordered</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Instant Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-indigo-600">{o.sampleBarcode}</div>
                      <div className="font-mono text-[10px] text-slate-400">{o.orderNumber}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{o.patientName}</div>
                      <div className="text-[11px] text-slate-500">
                        {o.patientAge}y • {o.patientGender}
                        {o.referringDoctorName && (
                          <span className="text-emerald-700 ml-1 font-semibold">
                            (Ref: {o.referringDoctorName})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {o.items?.map((it: any) => (
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
                      {o.status === 'SAMPLE_PENDING' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ Phlebotomy Pending
                        </span>
                      )}
                      {o.status === 'SAMPLE_COLLECTED' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          🩸 Sample Drawn
                        </span>
                      )}
                      {o.status === 'IN_TESTING' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          🔬 Testing in Progress
                        </span>
                      )}
                      {o.status === 'RESULTS_ENTERED' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          📝 Need Doctor Sign-off
                        </span>
                      )}
                      {o.status === 'VERIFIED' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✅ Verified &amp; Signed
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Barcode Sticker button */}
                        <button
                          onClick={() => setBarcodeModalOrder(o)}
                          className="p-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                          title="Print 2x1 Thermal Barcode Label"
                        >
                          <Barcode className="h-4 w-4" />
                        </button>

                        {/* Result Entry Button */}
                        <Link
                          href={`/lab/results/${o.id}`}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center space-x-1 shadow-2xs"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          <span>{o.status === 'VERIFIED' ? 'Edit Findings' : 'Enter Results'}</span>
                        </Link>

                        {/* Print Report Button */}
                        <Link
                          href={`/lab/report/${o.id}`}
                          className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 ${
                            o.status === 'VERIFIED'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Print Patient Diagnostic Report"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Report</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Catalog Modal */}
      <PrintCatalogModal
        isOpen={printCatalogOpen}
        onClose={() => setPrintCatalogOpen(false)}
        tests={tests}
      />

      {/* New Lab Accession Walk-In Modal */}
      {newOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FlaskConical className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">New Diagnostic Lab Accession</h3>
                  <p className="text-xs text-slate-500 font-medium">Walk-in patient registration and test requisition</p>
                </div>
              </div>
              <button
                onClick={() => setNewOrderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Nair"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-semibold"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Referring Clinician</label>
                  <select
                    value={newDoctorId}
                    onChange={(e) => setNewDoctorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-semibold"
                  >
                    <option value="">Self / Walk-in</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.hospitalName || 'Clinic'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Diagnostic Tests / Panels * ({selectedTestIds.length} Selected)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50/50">
                  {tests.map(t => {
                    const isSelected = selectedTestIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTestIds(prev => 
                          prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                        )}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <div>
                          <div>{t.name}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                            {t.code} • {t.department}
                          </div>
                        </div>
                        <span className="font-bold shrink-0 ml-2">₹{Number(t.price).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setNewOrderModal(false)}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50"
                >
                  {submittingOrder ? 'Registering...' : 'Register Accession & Generate Barcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tube Barcode Sticker Modal */}
      {barcodeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <h3 className="text-sm font-black text-slate-900">Thermal Vacutainer Tube Label (2&quot;x1&quot;)</h3>
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl font-mono text-left space-y-1">
              <div className="text-[11px] font-bold text-slate-900">{barcodeModalOrder.patientName}</div>
              <div className="text-[10px] text-slate-600">{barcodeModalOrder.patientAge}y / {barcodeModalOrder.patientGender}</div>
              <div className="text-base font-black tracking-widest text-indigo-900 py-1">{barcodeModalOrder.sampleBarcode}</div>
              <div className="text-[10px] text-slate-500">
                {barcodeModalOrder.items?.map((it: any) => it.testName).join(', ')}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setBarcodeModalOrder(null)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
