'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FlaskConical,
  User,
  X,
  Loader2, 
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

  // Split-Screen Lab Accession Form & Cart State
  const [patientMode, setPatientMode] = useState<'WALK_IN' | 'REGISTERED'>('WALK_IN');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  const handleSearchPatients = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(query.trim())}&limit=5`);
      const data = await res.json();
      if (data.success) {
        setCustomerSearchResults(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to search customers:', err);
    }
  };

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      testSearchQuery === '' ||
      t.name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(testSearchQuery.toLowerCase()));

    const matchesDept =
      selectedDepartment === 'ALL' ||
      (t.department && t.department.toUpperCase() === selectedDepartment.toUpperCase());

    return matchesSearch && matchesDept;
  });

  const selectedTestObjects = tests.filter((t) => selectedTestIds.includes(t.id));
  const estimatedTotal = selectedTestObjects.reduce((sum, t) => sum + Number(t.price || 0), 0);

  const toggleTestSelection = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

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
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setTestSearchQuery('');
        setSelectedDepartment('ALL');
        loadData();
        if (data.order) {
          setBarcodeModalOrder(data.order);
        }
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

      {/* Advanced Split-Screen Lab Accession Modal */}
      {newOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-black text-slate-900">New Diagnostic Lab Accession</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      LIMS Requisition
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Search registered patients or register walk-in patient with live requisition cart
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewOrderModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Split Screen Columns */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              
              {/* LEFT COLUMN: Patient Info & Test Catalog (7 Cols / ~58%) */}
              <div className="lg:col-span-7 p-6 space-y-4 overflow-y-auto">
                
                {/* Mode Selector Tabs (Registered Patient vs Walk-In) */}
                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setPatientMode('WALK_IN')}
                    className={`flex items-center justify-center space-x-1.5 rounded-lg py-1.5 transition ${
                      patientMode === 'WALK_IN'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Walk-in / Outside Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientMode('REGISTERED')}
                    className={`flex items-center justify-center space-x-1.5 rounded-lg py-1.5 transition ${
                      patientMode === 'REGISTERED'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search Registered Patient</span>
                  </button>
                </div>

                {/* Autocomplete Patient Search (when in Registered Mode) */}
                {patientMode === 'REGISTERED' && (
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Search Patient by Name, Phone, or ID
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          handleSearchPatients(e.target.value);
                        }}
                        placeholder="Type patient name or mobile number (e.g. Ramesh, 98765...)..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                      />
                    </div>

                    {customerSearchResults.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1 space-y-1">
                        {customerSearchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setNewPatientName(c.name);
                              setNewPatientPhone(c.phone || '');
                              setCustomerSearchResults([]);
                              setCustomerSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-xs flex items-center justify-between transition"
                          >
                            <span className="font-bold text-slate-800">{c.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Demographics Grid */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        placeholder="e.g. Ramesh Nair"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
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

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years) *</label>
                      <input
                        type="number"
                        required
                        value={newPatientAge}
                        onChange={(e) => setNewPatientAge(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                      <select
                        value={newPatientGender}
                        onChange={(e) => setNewPatientGender(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-bold"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-semibold truncate"
                      >
                        <option value="">Self / Walk-in</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fast Test Catalog Search & Filter */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Search & Add Lab Tests / Panels
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {filteredTests.length} investigations available
                    </span>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      placeholder="Type test name to search (e.g. CBC, Lipid, Blood Sugar, LFT)..."
                      className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    {testSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTestSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Department Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
                    {['ALL', 'HEMATOLOGY', 'BIOCHEMISTRY', 'LIPID', 'IMMUNOLOGY'].map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDepartment(dept)}
                        className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                          selectedDepartment === dept
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {dept === 'ALL' ? 'All Departments' : dept}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable Test Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 border border-slate-200 rounded-2xl bg-slate-50/50">
                    {filteredTests.map((t) => {
                      const isSelected = selectedTestIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTestSelection(t.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between select-none ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold truncate">{t.name}</div>
                            <div className={`text-[10px] flex items-center space-x-1.5 mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                              <span className="font-mono">{t.code}</span>
                              <span>•</span>
                              <span>{t.department}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-xs">₹{Number(t.price).toFixed(2)}</div>
                            <div className={`text-[9px] font-semibold ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`}>
                              {isSelected ? '✓ Added' : '+ Add'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredTests.length === 0 && (
                      <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                        No diagnostic tests match &quot;{testSearchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Live Selected Tests Cart & Bill Estimator (5 Cols / ~42%) */}
              <div className="lg:col-span-5 p-6 bg-slate-50/60 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Selected Tests ({selectedTestObjects.length})
                      </h4>
                    </div>
                    {selectedTestIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTestIds([])}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Empty State */}
                  {selectedTestObjects.length === 0 ? (
                    <div className="py-12 px-4 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl bg-white/70">
                      <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400">
                        <FlaskConical className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No tests added yet</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Type in the search box to find and add tests. They will appear here in real time with live bill calculation.
                      </p>
                    </div>
                  ) : (
                    /* Selected Test Items */
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedTestObjects.map((t, idx) => (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                              <span className="font-bold text-slate-800 truncate">{t.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1">
                              <span>{t.department}</span>
                              <span>•</span>
                              <span className="text-indigo-600 font-medium">{t.specimenType || 'Venous Blood'}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="font-bold text-slate-900">₹{Number(t.price).toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => toggleTestSelection(t.id)}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Remove test"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Pricing Summary & Actions */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Investigations</span>
                      <span className="font-bold text-slate-800">{selectedTestObjects.length} items</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Specimen Tubes Required</span>
                      <span className="font-medium text-slate-700">
                        {selectedTestObjects.length > 0 ? `${selectedTestObjects.length} Vacutainer(s)` : '0'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">Estimated Total</span>
                      <span className="text-lg font-black text-indigo-600">
                        ₹{estimatedTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setNewOrderModal(false)}
                      className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingOrder || !newPatientName.trim() || selectedTestIds.length === 0}
                      onClick={handleCreateOrder}
                      className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center space-x-1.5"
                    >
                      {submittingOrder ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Accessioning...</span>
                        </>
                      ) : (
                        <>
                          <Barcode className="h-4 w-4" />
                          <span>Register Accession & Barcode</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
