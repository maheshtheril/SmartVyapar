'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Plus,
  Scissors,
  Sparkles,
  CheckCircle2,
  XCircle,
  Play,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  AlertCircle,
  ArrowRight,
  X,
  RefreshCw,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';

type AppointmentStatus = 'BOOKED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  stylistName: string | null;
  chairNumber: string | null;
  serviceName: string;
  servicePrice: number | string;
  durationMinutes: number;
  scheduledDate: string;
  scheduledTime: string;
  status: AppointmentStatus;
  notes: string | null;
  invoiceId: string | null;
  createdAt: string;
}

interface ServiceOption {
  id: string;
  name: string;
  sellingPrice: number;
  category: string | null;
}

const CHAIR_STATIONS = [
  'Chair 1 - Hair & Styling',
  'Chair 2 - Hair & Beard',
  'Chair 3 - Coloring & Highlights',
  'Spa Suite A - Facial & Glow',
  'Spa Suite B - Body Massage',
  'Nail Bar & Pedicure Station',
];

const STYLIST_PRESETS = [
  'Senior Stylist Rahul',
  'Master Colorist Priya',
  'Therapist Ananya',
  'Skin Specialist Dr. Neha',
  'Hair Artist Imran',
  'Staff Stylist',
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
];

const STATUS_BADGES: Record<AppointmentStatus, { label: string; bg: string; text: string; border: string }> = {
  BOOKED: { label: 'Booked / Scheduled', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CHECKED_IN: { label: 'Client Arrived', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  IN_SERVICE: { label: 'In Service (Chair)', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  COMPLETED: { label: 'Completed & Billed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  NO_SHOW: { label: 'No Show', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

function formatToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SalonAppointmentsPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(formatToday());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Book Appointment Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [servicePrice, setServicePrice] = useState<number | string>(650);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [stylistName, setStylistName] = useState<string>(STYLIST_PRESETS[0]);
  const [chairNumber, setChairNumber] = useState<string>(CHAIR_STATIONS[0]);
  const [scheduledTime, setScheduledTime] = useState<string>('10:30');
  const [notes, setNotes] = useState<string>('');

  // Fetch appointments for selected date
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salon/appointments?date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments || []);
        if (Array.isArray(data.services) && data.services.length > 0) {
          setServices(data.services);
        }
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Handle Date Navigation
  const shiftDate = (days: number) => {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Status transition handler
  const updateStatus = async (id: string, newStatus: AppointmentStatus) => {
    try {
      const res = await fetch(`/api/salon/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        loadAppointments();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  // Convert Appointment to POS Bill
  const convertToPosBill = (appt: Appointment) => {
    // Navigate to /billing/new with query params prefilled
    const params = new URLSearchParams();
    params.set('customerName', appt.clientName);
    params.set('customerPhone', appt.clientPhone);
    params.set('serviceName', appt.serviceName);
    params.set('servicePrice', String(appt.servicePrice));
    params.set('stylist', appt.stylistName || '');
    params.set('chair', appt.chairNumber || '');
    params.set('notes', `Salon Booking #${appt.id.slice(0, 8)} (${appt.scheduledTime})`);

    router.push(`/billing/new?${params.toString()}`);
  };

  // Save new appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim()) {
      setFormError('Client name is required');
      return;
    }
    if (!clientPhone.trim() || clientPhone.replace(/\D/g, '').length < 10) {
      setFormError('Valid 10-digit mobile phone number is required');
      return;
    }
    if (!serviceName.trim()) {
      setFormError('Please select or specify a service');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/salon/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientPhone,
          serviceName,
          servicePrice: Number(servicePrice || 0),
          durationMinutes,
          stylistName,
          chairNumber,
          scheduledDate: selectedDate,
          scheduledTime,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      setIsBookModalOpen(false);
      resetForm();
      loadAppointments();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setServiceName('');
    setServicePrice(650);
    setDurationMinutes(45);
    setNotes('');
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const matchesSearch =
        appt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.clientPhone.includes(searchQuery) ||
        appt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (appt.stylistName && appt.stylistName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let booked = 0;
    let inService = 0;
    let completed = 0;
    let revenue = 0;

    appointments.forEach((a) => {
      if (a.status === 'BOOKED' || a.status === 'CHECKED_IN') booked++;
      if (a.status === 'IN_SERVICE') inService++;
      if (a.status === 'COMPLETED') completed++;
      if (a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') {
        revenue += Number(a.servicePrice || 0);
      }
    });

    return { total: appointments.length, booked, inService, completed, revenue };
  }, [appointments]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-6 space-y-6">
      {/* 1. Header Bar with Industry Badge & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-200">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Salon &amp; Spa Appointments
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200 uppercase tracking-wider">
                  Live Chair Slots
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage stylist schedules, client chair allocations, and 1-tap POS tax invoicing
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & New Booking Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Date Shift */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 px-2 py-1 outline-none cursor-pointer"
            />
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(formatToday())}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ml-1 cursor-pointer ${
                selectedDate === formatToday()
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Today
            </button>
          </div>

          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment Slot</span>
          </button>
        </div>
      </div>

      {/* 2. Live Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scheduled Today</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{metrics.booked}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center gap-3.5 bg-gradient-to-br from-amber-50/50 to-white">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 animate-pulse">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Active In-Chair</p>
            <p className="text-xl font-black text-amber-900 mt-0.5">{metrics.inService}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Billed &amp; Completed</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{metrics.completed}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Projected Service Value</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">₹{metrics.revenue.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* 3. Toolbar Filters & View Switcher */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search client, mobile number, stylist, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-pink-500 font-medium"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {['ALL', 'BOOKED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Slots' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('GRID')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Chair Grid</span>
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>List Register</span>
          </button>
        </div>
      </div>

      {/* 4. Main Body: Timeline Chair Matrix View vs Register Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Loading Salon &amp; Chair Schedules...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 mx-auto mb-4">
            <Scissors className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">No Appointments for {selectedDate}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No booking slots scheduled for this date. Click below to add an appointment for a client.
          </p>
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="mt-5 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-md shadow-pink-200 transition cursor-pointer"
          >
            + Book First Appointment
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        /* MULTI-CHAIR TIMELINE CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAppointments.map((appt) => {
            const badge = STATUS_BADGES[appt.status] || STATUS_BADGES.BOOKED;

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between hover:shadow-md transition group"
              >
                <div>
                  {/* Card Header: Time & Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-900 font-mono font-black text-sm">
                      <Clock className="w-4 h-4 text-pink-600" />
                      <span>{appt.scheduledTime}</span>
                      <span className="text-[11px] font-normal text-slate-400">({appt.durationMinutes}m)</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Client & Service Info */}
                  <div className="py-3 space-y-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center justify-between">
                        <span>{appt.clientName}</span>
                        <span className="text-pink-600 font-bold font-mono">₹{Number(appt.servicePrice).toFixed(0)}</span>
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{appt.clientPhone}</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                        <span>{appt.serviceName}</span>
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span>Station: <strong className="text-slate-700">{appt.chairNumber || 'General Chair'}</strong></span>
                        <span>Stylist: <strong className="text-slate-700">{appt.stylistName || 'Any Available'}</strong></span>
                      </div>
                    </div>

                    {appt.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-1.5 rounded border border-amber-100">
                        &quot;{appt.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {appt.status === 'BOOKED' && (
                      <button
                        onClick={() => updateStatus(appt.id, 'CHECKED_IN')}
                        className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition border border-purple-200 cursor-pointer"
                      >
                        Check-In
                      </button>
                    )}

                    {(appt.status === 'BOOKED' || appt.status === 'CHECKED_IN') && (
                      <button
                        onClick={() => updateStatus(appt.id, 'IN_SERVICE')}
                        className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition border border-amber-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-amber-700" />
                        <span>In Chair</span>
                      </button>
                    )}

                    {appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && (
                      <button
                        onClick={() => updateStatus(appt.id, 'CANCELLED')}
                        className="px-2 py-1 text-[11px] text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Cancel Booking"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* 1-Click Convert to POS Bill */}
                  <button
                    onClick={() => convertToPosBill(appt)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Transfer details into Billing (POS) to collect payment and generate tax invoice"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-pink-400" />
                    <span>Bill (POS)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* REGISTER TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Mobile</th>
                  <th className="py-3 px-3">Service</th>
                  <th className="py-3 px-3">Stylist / Therapist</th>
                  <th className="py-3 px-3">Chair / Suite</th>
                  <th className="py-3 px-3 text-right">Fee (₹)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((appt) => {
                  const badge = STATUS_BADGES[appt.status] || STATUS_BADGES.BOOKED;

                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {appt.scheduledTime} ({appt.durationMinutes}m)
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{appt.clientName}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{appt.clientPhone}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{appt.serviceName}</td>
                      <td className="py-3 px-3 text-slate-600">{appt.stylistName || '—'}</td>
                      <td className="py-3 px-3 text-slate-600">{appt.chairNumber || '—'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-slate-900">
                        ₹{Number(appt.servicePrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {appt.status !== 'COMPLETED' && (
                            <button
                              onClick={() => updateStatus(appt.id, 'IN_SERVICE')}
                              className="px-2 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded transition"
                            >
                              In Chair
                            </button>
                          )}
                          <button
                            onClick={() => convertToPosBill(appt)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded flex items-center gap-1 transition"
                          >
                            <CreditCard className="w-3 h-3 text-pink-400" />
                            <span>Bill Now</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Book New Appointment Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Book Appointment Slot</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Date: {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAppointment} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Client Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client / Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shalini Sharma"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Requested Service <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="salon-services-list"
                  placeholder="e.g. Signature Haircut & Beard, Hydra-Facial, Keratin Spa..."
                  value={serviceName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setServiceName(val);
                    const matched = services.find((s) => s.name.toLowerCase() === val.toLowerCase());
                    if (matched) {
                      setServicePrice(matched.sellingPrice);
                    }
                  }}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                />
                <datalist id="salon-services-list">
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      ₹{s.sellingPrice} {s.category ? `(${s.category})` : ''}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Price & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes (1 hr)</option>
                    <option value={90}>90 Minutes (1.5 hrs)</option>
                    <option value={120}>120 Minutes (2 hrs)</option>
                  </select>
                </div>
              </div>

              {/* Stylist & Chair Station */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stylist / Specialist</label>
                  <select
                    value={stylistName}
                    onChange={(e) => setStylistName(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                  >
                    {STYLIST_PRESETS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chair / Station</label>
                  <select
                    value={chairNumber}
                    onChange={(e) => setChairNumber(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                  >
                    {CHAIR_STATIONS.map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Slot Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Time Slot ({scheduledTime})
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setScheduledTime(t)}
                      className={`py-1 text-xs font-mono font-bold rounded-lg transition cursor-pointer ${
                        scheduledTime === t
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Notes / Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. Sensitive scalp, bridal consultation, organic hair dye"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-pink-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Booking Slot...' : 'Confirm Appointment Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
