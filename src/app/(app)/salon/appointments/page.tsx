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
  Users,
  Award,
  DollarSign,
  FileText,
  Armchair,
  TrendingUp,
  Check,
  Trash2,
  ExternalLink,
  MessageCircle,
  HeartHandshake,
} from 'lucide-react';

export type AppointmentStatus =
  | 'BOOKED'
  | 'WAITING'
  | 'CHECKED_IN'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface SalonServiceCartItem {
  name: string;
  price: number;
  durationMinutes: number;
  stylistName?: string;
  commissionPercent?: number;
  commissionAmount?: number;
}

export interface ClientConsultationCard {
  hairType?: string;
  skinType?: string;
  colorFormula?: string;
  allergies?: string;
  patchTestStatus?: 'VERIFIED' | 'PENDING' | 'NOT_REQUIRED';
  preferences?: string;
}

export interface Appointment {
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
  tokenNumber: string | null;
  isWalkIn: boolean;
  servicesJson: SalonServiceCartItem[] | null;
  clientHistory: ClientConsultationCard | null;
  tipAmount: number | string;
  totalCommission: number | string;
  createdAt: string;
}

export interface StylistStats {
  stylistName: string;
  servicesCount: number;
  revenueGenerated: number;
  commissionEarned: number;
  tipsEarned: number;
}

export interface ServiceOption {
  id: string;
  name: string;
  sellingPrice: number;
  category: string | null;
}

const CHAIR_STATIONS = [
  'Chair 1 - Hair & Styling',
  'Chair 2 - Hair & Beard',
  'Chair 3 - Coloring & Highlights',
  'Chair 4 - Blowdry & Wash',
  'Spa Suite A - Facial & Glow',
  'Spa Suite B - Body Massage & Scrub',
  'Nail Bar & Pedicure Station',
  'VIP Bridal / Groom Suite',
];

const STYLIST_PRESETS = [
  'Senior Stylist Rahul',
  'Master Colorist Priya',
  'Therapist Ananya',
  'Skin Specialist Dr. Neha',
  'Hair Artist Imran',
  'Beard Stylist Vikram',
  'Staff Stylist',
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
];

const PRESET_QUICK_SERVICES: SalonServiceCartItem[] = [
  { name: 'Signature Haircut & Wash', price: 450, durationMinutes: 45 },
  { name: 'Beard Sculpting & Hot Towel', price: 250, durationMinutes: 20 },
  { name: 'L’Oréal Hair Color & Touch-up', price: 1800, durationMinutes: 60 },
  { name: 'Keratin Smoothing Therapy', price: 3200, durationMinutes: 90 },
  { name: 'Hydra Facial & Vitamin C Glow', price: 1500, durationMinutes: 60 },
  { name: 'Deep Tissue Full Body Massage', price: 2000, durationMinutes: 60 },
  { name: 'Express Manicure & Pedicure', price: 950, durationMinutes: 45 },
  { name: 'Bridal Make-up & Hair Styling', price: 7500, durationMinutes: 120 },
];

const STATUS_BADGES: Record<AppointmentStatus, { label: string; bg: string; text: string; border: string }> = {
  BOOKED: { label: 'Booked', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  WAITING: { label: 'Waiting Lounge', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  CHECKED_IN: { label: 'Arrived / Seated', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  IN_SERVICE: { label: 'In Service', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-700' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  NO_SHOW: { label: 'No Show', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
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
  const [walkInQueue, setWalkInQueue] = useState<Appointment[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<ServiceOption[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [stylistStats, setStylistStats] = useState<StylistStats[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    booked: 0,
    waiting: 0,
    inService: 0,
    completed: 0,
    cancelled: 0,
    projectedRevenue: 0,
    totalTips: 0,
    totalCommissions: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'GRID' | 'TIMELINE' | 'LOUNGE' | 'COMMISSIONS' | 'LIST'>('GRID');

  // Multi-Service Booking Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [stylistName, setStylistName] = useState<string>(STYLIST_PRESETS[0]);
  const [chairNumber, setChairNumber] = useState<string>(CHAIR_STATIONS[0]);
  const [scheduledTime, setScheduledTime] = useState<string>('10:30');
  const [notes, setNotes] = useState<string>('');
  const [commissionPercent, setCommissionPercent] = useState<number>(10);
  const [tipAmount, setTipAmount] = useState<number>(0);

  // Multi-service cart list
  const [serviceCart, setServiceCart] = useState<SalonServiceCartItem[]>([
    { name: 'Signature Haircut & Wash', price: 450, durationMinutes: 45, commissionPercent: 10 },
  ]);

  // Consultation Card Fields
  const [showConsultationCard, setShowConsultationCard] = useState<boolean>(false);
  const [hairType, setHairType] = useState<string>('Normal');
  const [skinType, setSkinType] = useState<string>('Normal');
  const [colorFormula, setColorFormula] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('None');
  const [patchTestStatus, setPatchTestStatus] = useState<'VERIFIED' | 'PENDING' | 'NOT_REQUIRED'>('NOT_REQUIRED');

  // Quick Walk-In Modal
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState<boolean>(false);
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInService, setWalkInService] = useState<string>('Signature Haircut & Wash');
  const [walkInPrice, setWalkInPrice] = useState<number>(450);
  const [walkInStylist, setWalkInStylist] = useState<string>(STYLIST_PRESETS[0]);
  const [walkInChair, setWalkInChair] = useState<string>(CHAIR_STATIONS[0]);
  const [walkInAssignImmediately, setWalkInAssignImmediately] = useState<boolean>(true);

  // Active Consultation Modal for inspection
  const [viewConsultationAppt, setViewConsultationAppt] = useState<Appointment | null>(null);

  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');

  // Fetch appointments for selected date
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salon/appointments?date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments || []);
        setWalkInQueue(data.walkInQueue || []);
        if (data.tenantSlug) setTenantSlug(data.tenantSlug);
        if (data.tenantName) setTenantName(data.tenantName);
        if (data.metrics) setMetrics(data.metrics);
        if (Array.isArray(data.stylistLeaderboard)) setStylistStats(data.stylistLeaderboard);
        if (Array.isArray(data.staffMembers)) setStaffMembers(data.staffMembers);
        if (Array.isArray(data.services)) setServicesCatalog(data.services);
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

  // Date Navigation
  const shiftDate = (days: number) => {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Autocomplete past customer consultation card on phone entry
  const lookupCustomerHistory = async (phone: string) => {
    if (phone.length < 10) return;
    try {
      const res = await fetch(`/api/salon/appointments?clientPhone=${phone.trim()}`);
      const data = await res.json();
      if (data.success && data.latestConsultation) {
        const c = data.latestConsultation;
        if (c.hairType) setHairType(c.hairType);
        if (c.skinType) setSkinType(c.skinType);
        if (c.colorFormula) setColorFormula(c.colorFormula);
        if (c.allergies) setAllergies(c.allergies);
        if (c.patchTestStatus) setPatchTestStatus(c.patchTestStatus);
        setShowConsultationCard(true);
      }
    } catch (e) {
      console.warn('Customer history lookup error:', e);
    }
  };

  // Add service row to modal cart
  const addServiceRow = () => {
    setServiceCart((prev) => [
      ...prev,
      { name: 'Beard Sculpting & Hot Towel', price: 250, durationMinutes: 20, commissionPercent: 10 },
    ]);
  };

  const removeServiceRow = (index: number) => {
    setServiceCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateServiceRow = (index: number, field: keyof SalonServiceCartItem, value: any) => {
    setServiceCart((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Compute Cart Totals
  const cartTotalAmount = useMemo(
    () => serviceCart.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [serviceCart]
  );
  const cartTotalDuration = useMemo(
    () => serviceCart.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0),
    [serviceCart]
  );

  // Status Updater
  const updateAppointmentStatus = async (id: string, newStatus: AppointmentStatus) => {
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

  // Seat a Walk-In client at a chair
  const seatWalkInAtChair = async (id: string, chair: string) => {
    try {
      const res = await fetch(`/api/salon/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chairNumber: chair,
          status: 'IN_SERVICE',
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadAppointments();
      }
    } catch (err) {
      console.error('Failed to seat walk in:', err);
    }
  };

  // Open WhatsApp with pre-composed reminder / confirmation
  const sendWhatsAppReminder = (appt: Appointment) => {
    const servicesList = appt.servicesJson && appt.servicesJson.length > 0
      ? appt.servicesJson.map((s) => s.name).join(', ')
      : appt.serviceName;

    const message = `✨ *Appointment Confirmation - Ziona Salon & Spa* ✨\n\nDear *${appt.clientName}*,\nYour appointment is confirmed!\n\n📅 Date: *${appt.scheduledDate.slice(0, 10)}*\n⏰ Time: *${appt.scheduledTime}*\n✂️ Services: *${servicesList}*\n💇 Stylist: *${appt.stylistName || 'Expert Stylist'}*\n💺 Station: *${appt.chairNumber || 'Main Floor'}*\n\nWe look forward to pampering you! Please arrive 5 minutes prior.\nFor directions or rescheduling, reply directly to this message.`;

    const cleanPhone = appt.clientPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // 1-Click Bridge to POS Billing with multi-services
  const proceedToPOSBilling = (appt: Appointment) => {
    const params = new URLSearchParams();
    params.set('customerName', appt.clientName);
    params.set('customerPhone', appt.clientPhone);

    if (appt.servicesJson && appt.servicesJson.length > 0) {
      params.set('servicesJson', encodeURIComponent(JSON.stringify(appt.servicesJson)));
    } else {
      params.set('serviceName', appt.serviceName);
      params.set('servicePrice', String(appt.servicePrice || 0));
    }

    if (appt.notes || appt.stylistName) {
      params.set('notes', `Salon Stylist: ${appt.stylistName || 'Main'} | ${appt.notes || ''}`);
    }

    router.push(`/billing/new?${params.toString()}`);
  };

  // Submit Multi-Service Appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim()) {
      setFormError('Please enter client name');
      return;
    }
    if (!clientPhone.trim()) {
      setFormError('Please enter phone number');
      return;
    }
    if (serviceCart.length === 0) {
      setFormError('Please add at least one service');
      return;
    }

    setSubmitting(true);
    try {
      const consultationCard: ClientConsultationCard = {
        hairType,
        skinType,
        colorFormula: colorFormula.trim() || undefined,
        allergies: allergies.trim() || undefined,
        patchTestStatus,
      };

      const res = await fetch('/api/salon/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          stylistName,
          chairNumber,
          scheduledDate: selectedDate,
          scheduledTime,
          notes,
          services: serviceCart,
          clientHistory: consultationCard,
          tipAmount,
          commissionPercent,
          isWalkIn: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      setIsBookModalOpen(false);
      resetBookingForm();
      loadAppointments();
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Quick Walk-In
  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !walkInPhone.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/salon/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: walkInName.trim(),
          clientPhone: walkInPhone.trim(),
          stylistName: walkInAssignImmediately ? walkInStylist : null,
          chairNumber: walkInAssignImmediately ? walkInChair : null,
          scheduledDate: selectedDate,
          scheduledTime: new Date().toTimeString().slice(0, 5),
          serviceName: walkInService,
          servicePrice: walkInPrice,
          durationMinutes: 30,
          isWalkIn: true,
          status: walkInAssignImmediately ? 'IN_SERVICE' : 'WAITING',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsWalkInModalOpen(false);
        setWalkInName('');
        setWalkInPhone('');
        loadAppointments();
      } else {
        alert(data.error || 'Failed to register walk-in');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const resetBookingForm = () => {
    setClientName('');
    setClientPhone('');
    setNotes('');
    setTipAmount(0);
    setServiceCart([{ name: 'Signature Haircut & Wash', price: 450, durationMinutes: 45, commissionPercent: 10 }]);
    setColorFormula('');
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const matchesSearch =
        appt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.clientPhone.includes(searchQuery) ||
        appt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (appt.stylistName && appt.stylistName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (appt.tokenNumber && appt.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  // Group appointments by chair station
  const chairOccupancy = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const station of CHAIR_STATIONS) {
      map[station] = [];
    }
    for (const appt of appointments) {
      if (appt.chairNumber && map[appt.chairNumber]) {
        map[appt.chairNumber].push(appt);
      } else if (appt.chairNumber) {
        if (!map[appt.chairNumber]) map[appt.chairNumber] = [];
        map[appt.chairNumber].push(appt);
      }
    }
    return map;
  }, [appointments]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                Salon & Wellness Station
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full">
                Enterprise Suite
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Chair management, stylist commissions, digital consultation cards & live walk-in lounge
            </p>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 font-medium text-xs md:text-sm text-slate-800 dark:text-slate-200">
              <Calendar className="w-4 h-4 text-pink-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-xs md:text-sm font-semibold focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(formatToday())}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Today
          </button>

          <button
            onClick={() => loadAppointments()}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pink-500' : ''}`} />
          </button>

          {/* Public Zero-Wait Customer Booking Link */}
          <button
            onClick={() => {
              const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.zionapos.store';
              const targetSlug = tenantSlug || 'demo-salon';
              const url = `${origin}/book/${targetSlug}`;
              navigator.clipboard?.writeText(url);
              alert(
                `✨ ${tenantName || 'Your Salon'} Self-Booking Link Copied! ✨\n\nDirect Link for your Customers:\n${url}\n\nWhen your customers open this link, they see ONLY your stylists, your services, and book directly into your chair schedule!`
              );
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            title="Copy your salon's dedicated self-booking link for clients"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Customer Booking Link</span>
          </button>

          {/* Quick Walk-In Button */}
          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all"
          >
            <Users className="w-4 h-4" />
            <span>+ Walk-In</span>
          </button>

          {/* Book Appointment Modal Button */}
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-md shadow-pink-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Book Slot</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Bookings</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.total}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
            {metrics.booked} Scheduled
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Walk-In Queue</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.waiting}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
            Waiting Lounge
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>In Service</span>
            <Scissors className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.inService}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
            Occupied Chairs
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.completed}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            Served & Billed
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Projected Revenue</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ₹{metrics.projectedRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
            ₹{Number(metrics.totalTips || 0).toLocaleString('en-IN')} Tips Included
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Staff Commissions</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ₹{Number(metrics.totalCommissions || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
            Daily Staff Incentive
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search/Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('GRID')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'GRID'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Armchair className="w-4 h-4" />
            <span>Chair Floor Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'TIMELINE'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Time Slots Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('LOUNGE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap relative ${
              activeTab === 'LOUNGE'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Walk-In Lounge</span>
            {walkInQueue.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {walkInQueue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('COMMISSIONS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'COMMISSIONS'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Stylist Commissions</span>
          </button>

          <button
            onClick={() => setActiveTab('LIST')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'LIST'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>All Bookings ({filteredAppointments.length})</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search client, phone, token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20"
          >
            <option value="ALL">All Status</option>
            <option value="BOOKED">Booked</option>
            <option value="WAITING">Waiting Lounge</option>
            <option value="IN_SERVICE">In Service</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* TAB 1: CHAIR FLOOR GRID */}
      {activeTab === 'GRID' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CHAIR_STATIONS.map((stationName) => {
              const stationAppts = chairOccupancy[stationName] || [];
              const activeNow = stationAppts.find((a) => a.status === 'IN_SERVICE');
              const nextUpcoming = stationAppts.find(
                (a) => a.status === 'BOOKED' || a.status === 'CHECKED_IN' || a.status === 'WAITING'
              );

              return (
                <div
                  key={stationName}
                  className={`rounded-2xl border p-4.5 bg-white dark:bg-slate-900 transition-all ${
                    activeNow
                      ? 'border-indigo-400 dark:border-indigo-700 shadow-md ring-1 ring-indigo-400/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          activeNow ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {stationName}
                      </h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeNow
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {activeNow ? 'IN USE' : 'VACANT'}
                    </span>
                  </div>

                  {/* Active Client on Chair */}
                  {activeNow ? (
                    <div className="mt-3.5 space-y-3">
                      <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                            {activeNow.clientName}
                          </span>
                          {activeNow.tokenNumber && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-500 text-white rounded">
                              {activeNow.tokenNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5 line-clamp-1">
                          {activeNow.serviceName}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-800/50 text-[11px] text-indigo-800 dark:text-indigo-300">
                          <span>Stylist: {activeNow.stylistName || 'Main'}</span>
                          <span className="font-bold">₹{Number(activeNow.servicePrice || 0)}</span>
                        </div>
                      </div>

                      {/* Action buttons for in-service chair */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => sendWhatsAppReminder(activeNow)}
                          className="flex items-center justify-center gap-1 p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold transition-colors"
                          title="WhatsApp Client"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WA</span>
                        </button>
                        <button
                          onClick={() => setViewConsultationAppt(activeNow)}
                          className="flex items-center justify-center gap-1 p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-xs font-semibold transition-colors"
                          title="Consultation & Formula"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Card</span>
                        </button>
                        <button
                          onClick={() => proceedToPOSBilling(activeNow)}
                          className="flex items-center justify-center gap-1 p-2 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 text-white text-xs font-bold shadow-sm transition-colors"
                          title="Bill at POS"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Bill</span>
                        </button>
                      </div>
                    </div>
                  ) : nextUpcoming ? (
                    <div className="mt-3.5 space-y-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                          <span>Next Slot: {nextUpcoming.scheduledTime}</span>
                          <span className="font-semibold">{nextUpcoming.durationMinutes}m</span>
                        </div>
                        <div className="font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {nextUpcoming.clientName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {nextUpcoming.serviceName}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateAppointmentStatus(nextUpcoming.id, 'IN_SERVICE')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Service</span>
                        </button>
                        <button
                          onClick={() => sendWhatsAppReminder(nextUpcoming)}
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold transition-colors"
                          title="WhatsApp Reminder"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 text-center py-4">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                        <Armchair className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2">
                        Station Ready
                      </p>
                      <button
                        onClick={() => {
                          setChairNumber(stationName);
                          setIsBookModalOpen(true);
                        }}
                        className="mt-2 text-xs font-bold text-pink-600 hover:text-pink-700 dark:text-pink-400"
                      >
                        + Book this chair
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TIME SLOTS TIMELINE */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-6 shadow-sm overflow-x-auto">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-pink-500" />
            <span>Chair vs Time Slot Schedule Matrix</span>
          </h2>
          <div className="min-w-[900px]">
            {/* Header Stations */}
            <div className="grid grid-cols-9 gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500">
              <div className="col-span-1">Slot Time</div>
              {CHAIR_STATIONS.map((c, i) => (
                <div key={c} className="col-span-1 text-center truncate">
                  Station {i + 1}
                </div>
              ))}
            </div>

            {/* Time Slot Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {TIME_SLOTS.map((slot) => {
                const slotBookings = appointments.filter((a) => a.scheduledTime === slot);
                return (
                  <div key={slot} className="grid grid-cols-9 gap-2 py-2.5 items-center text-xs">
                    <div className="col-span-1 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{slot}</span>
                    </div>

                    {CHAIR_STATIONS.map((station) => {
                      const apptInSlot = slotBookings.find((a) => a.chairNumber === station);
                      if (apptInSlot) {
                        const badge = STATUS_BADGES[apptInSlot.status] || STATUS_BADGES.BOOKED;
                        return (
                          <div
                            key={station}
                            onClick={() => setViewConsultationAppt(apptInSlot)}
                            className={`col-span-1 p-2 rounded-xl border text-[11px] cursor-pointer hover:shadow-md transition-all ${badge.bg} ${badge.border}`}
                          >
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {apptInSlot.clientName}
                            </div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                              {apptInSlot.serviceName}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={station}
                          onClick={() => {
                            setScheduledTime(slot);
                            setChairNumber(station);
                            setIsBookModalOpen(true);
                          }}
                          className="col-span-1 h-9 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 hover:border-pink-300 hover:text-pink-500 cursor-pointer transition-all"
                          title={`Click to book at ${slot} on ${station}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WALK-IN WAITING LOUNGE */}
      {activeTab === 'LOUNGE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>Live Walk-In Waiting Lounge & Token Display</span>
              </h2>
              <p className="text-xs text-slate-500">
                Manage walk-in clients waiting on salon couches with live token alerts and chair seating
              </p>
            </div>
            <button
              onClick={() => setIsWalkInModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
            >
              + Issue Walk-In Token
            </button>
          </div>

          {walkInQueue.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-3">
                No Clients Currently Waiting in Lounge
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                When walk-in guests arrive without a prior booking, click "+ Issue Walk-In Token" to seat them or track their wait time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {walkInQueue.map((guest) => (
                <div
                  key={guest.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/60 p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 bg-amber-500 text-white text-sm font-black rounded-xl shadow-sm">
                        {guest.tokenNumber || 'W-01'}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {guest.clientName}
                        </h4>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {guest.clientPhone}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {guest.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                    <div className="text-slate-700 dark:text-slate-300 font-semibold">
                      {guest.serviceName}
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Est. ₹{Number(guest.servicePrice || 0)}</span>
                      <span>Arrived at: {guest.scheduledTime}</span>
                    </div>
                  </div>

                  {/* Seat at Chair selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Assign to Chair Station:
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) seatWalkInAtChair(guest.id, e.target.value);
                      }}
                      defaultValue=""
                      className="w-full text-xs p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                    >
                      <option value="" disabled>
                        Select available chair...
                      </option>
                      {CHAIR_STATIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => sendWhatsAppReminder(guest)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 text-xs font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => proceedToPOSBilling(guest)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Bill Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STYLIST PERFORMANCE & COMMISSIONS */}
      {activeTab === 'COMMISSIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                <span>Stylist & Specialist Commission Leaderboard</span>
              </h2>
              <p className="text-xs text-slate-500">
                Live daily service counts, client revenue generated, tips, and calculated staff incentives
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stylistStats.map((st) => (
              <div
                key={st.stylistName}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold flex items-center justify-center text-sm shadow-sm">
                    {st.stylistName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {st.stylistName}
                    </h3>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      Specialist Stylist
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                    <span className="text-slate-500 text-[11px]">Services Done</span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {st.servicesCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                    <span className="text-slate-500 text-[11px]">Revenue Billed</span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      ₹{st.revenueGenerated.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-xs border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-emerald-700 dark:text-emerald-300 text-[11px]">Commission</span>
                    <div className="text-lg font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
                      ₹{st.commissionEarned.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-xs border border-pink-100 dark:border-pink-900/40">
                    <span className="text-pink-700 dark:text-pink-300 text-[11px]">Client Tips</span>
                    <div className="text-lg font-bold text-pink-800 dark:text-pink-200 mt-0.5">
                      ₹{st.tipsEarned.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800 text-xs flex justify-between items-center">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Total Take-Home:</span>
                  <span className="font-extrabold text-purple-700 dark:text-purple-300 text-sm">
                    ₹{(st.commissionEarned + st.tipsEarned).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: APPOINTMENTS DIRECTORY & SEARCH */}
      {activeTab === 'LIST' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Appointment Records ({filteredAppointments.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Time & Token</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Services Booked</th>
                  <th className="py-3 px-4">Station & Stylist</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAppointments.map((appt) => {
                  const badge = STATUS_BADGES[appt.status] || STATUS_BADGES.BOOKED;
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-pink-500" />
                          {appt.scheduledTime}
                        </div>
                        {appt.tokenNumber && (
                          <span className="inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                            {appt.tokenNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{appt.clientName}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {appt.clientPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {appt.serviceName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {appt.durationMinutes} mins
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {appt.chairNumber || 'Main Floor'}
                        </div>
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
                          {appt.stylistName || 'Unassigned'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          ₹{Number(appt.servicePrice || 0).toLocaleString('en-IN')}
                        </div>
                        {Number(appt.tipAmount || 0) > 0 && (
                          <div className="text-[10px] text-pink-600 mt-0.5">
                            +₹{Number(appt.tipAmount)} Tip
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => sendWhatsAppReminder(appt)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewConsultationAppt(appt)}
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                            title="Consultation Card"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => proceedToPOSBilling(appt)}
                            className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Bill</span>
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

      {/* MODAL 1: MULTI-SERVICE APPOINTMENT BUILDER */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-pink-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Book Multi-Service Appointment
                </h3>
              </div>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              {/* Client Info with Instant History Lookup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    WhatsApp Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(e.target.value);
                      lookupCustomerHistory(e.target.value);
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
              </div>

              {/* Station & Stylist Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    Station / Chair
                  </label>
                  <select
                    value={chairNumber}
                    onChange={(e) => setChairNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  >
                    {CHAIR_STATIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    Stylist / Specialist
                  </label>
                  <select
                    value={stylistName}
                    onChange={(e) => setStylistName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  >
                    {STYLIST_PRESETS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {staffMembers.map((sm) => (
                      <option key={sm.id} value={sm.name}>{sm.name} ({sm.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    Time Slot
                  </label>
                  <select
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Service Cart Builder */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    Services Cart ({serviceCart.length} Services)
                  </span>
                  <button
                    type="button"
                    onClick={addServiceRow}
                    className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Another Service
                  </button>
                </div>

                {/* Service Rows */}
                <div className="space-y-2 pt-1">
                  {serviceCart.map((row, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex-1 min-w-[160px]">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateServiceRow(idx, 'name', e.target.value)}
                          placeholder="Service name..."
                          className="w-full p-1.5 bg-transparent border-none text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div className="w-24">
                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1">
                          <span className="text-slate-400">₹</span>
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => updateServiceRow(idx, 'price', Number(e.target.value))}
                            className="w-full bg-transparent border-none text-xs font-bold focus:outline-none text-right"
                          />
                        </div>
                      </div>
                      <div className="w-20">
                        <select
                          value={row.durationMinutes}
                          onChange={(e) => updateServiceRow(idx, 'durationMinutes', Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-1 text-[11px] font-medium"
                        >
                          <option value={15}>15m</option>
                          <option value={30}>30m</option>
                          <option value={45}>45m</option>
                          <option value={60}>60m</option>
                          <option value={90}>90m</option>
                          <option value={120}>120m</option>
                        </select>
                      </div>
                      {serviceCart.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeServiceRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Presets Ribbon */}
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium py-1">Quick Add:</span>
                  {PRESET_QUICK_SERVICES.slice(0, 4).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setServiceCart((prev) => [...prev, { ...p, commissionPercent: 10 }])}
                      className="px-2 py-0.5 text-[10px] rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-pink-100 dark:hover:bg-pink-900 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      + {p.name.split(' ')[0]} (₹{p.price})
                    </button>
                  ))}
                </div>

                {/* Cart Sum Summary */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Total Duration: {cartTotalDuration} mins</span>
                  <span className="text-pink-600 dark:text-pink-400 text-sm">
                    Est. Total: ₹{cartTotalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Consultation Card Collapsible */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowConsultationCard(!showConsultationCard)}
                  className="w-full flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <span className="flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-purple-500" />
                    Client Hair & Skin Consultation Card
                  </span>
                  <span className="text-pink-600 text-[11px]">
                    {showConsultationCard ? 'Hide Details' : '+ Add Formula & Allergies'}
                  </span>
                </button>

                {showConsultationCard && (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block">Hair Type</label>
                        <select
                          value={hairType}
                          onChange={(e) => setHairType(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Dry & Frizzy">Dry & Frizzy</option>
                          <option value="Color-Treated">Color-Treated</option>
                          <option value="Fine / Thin">Fine / Thin</option>
                          <option value="Curly / Wavy">Curly / Wavy</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block">Skin Sensitivity</label>
                        <select
                          value={skinType}
                          onChange={(e) => setSkinType(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Sensitive">Sensitive</option>
                          <option value="Oily / Acne Prone">Oily / Acne Prone</option>
                          <option value="Dry">Dry</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 mb-0.5 block">Color Formula / Recipe Code</label>
                      <input
                        type="text"
                        placeholder="e.g. L’Oréal Majirel 5.3 (40g) + 20 Vol (60g)"
                        value={colorFormula}
                        onChange={(e) => setColorFormula(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 mb-0.5 block">Known Allergies</label>
                      <input
                        type="text"
                        placeholder="e.g. Ammonia allergic, Bleach sensitive"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Commission & Tip Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    Staff Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    Pre-Tip (₹) Optional
                  </label>
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Booking Slot...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK WALK-IN REGISTRATION */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Issue Walk-In Token
                </h3>
              </div>
              <button
                onClick={() => setIsWalkInModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Walk-In Guest Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh K"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mobile Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9845012345"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Requested Service
                  </label>
                  <input
                    type="text"
                    value={walkInService}
                    onChange={(e) => setWalkInService(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Est. Price (₹)
                  </label>
                  <input
                    type="number"
                    value={walkInPrice}
                    onChange={(e) => setWalkInPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="walkInImmediate"
                  checked={walkInAssignImmediately}
                  onChange={(e) => setWalkInAssignImmediately(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <label htmlFor="walkInImmediate" className="font-semibold text-slate-700 dark:text-slate-300">
                  Seat immediately at chair (Otherwise send to Waiting Lounge)
                </label>
              </div>

              {walkInAssignImmediately && (
                <div className="space-y-2 pt-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Choose Chair & Stylist:
                  </label>
                  <select
                    value={walkInChair}
                    onChange={(e) => setWalkInChair(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {CHAIR_STATIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  {submitting ? 'Issuing...' : 'Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW CONSULTATION & FORMULA CARD */}
      {viewConsultationAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Client Consultation Card
                </h3>
              </div>
              <button
                onClick={() => setViewConsultationAppt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40">
                <div className="font-bold text-sm text-purple-950 dark:text-purple-200">
                  {viewConsultationAppt.clientName}
                </div>
                <div className="text-purple-700 dark:text-purple-300 mt-0.5">
                  Phone: {viewConsultationAppt.clientPhone}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">HAIR PROFILE</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {viewConsultationAppt.clientHistory?.hairType || 'Normal / Healthy'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">SKIN PROFILE</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {viewConsultationAppt.clientHistory?.skinType || 'Normal'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-slate-400 block text-[10px]">COLOR FORMULA / TREATMENT RECIPE</span>
                <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">
                  {viewConsultationAppt.clientHistory?.colorFormula || 'No custom formula recorded yet'}
                </span>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-xl">
                <span className="text-rose-500 block text-[10px] font-bold">KNOWN ALLERGIES & CONTRAINDICATIONS</span>
                <span className="font-semibold text-rose-800 dark:text-rose-200">
                  {viewConsultationAppt.clientHistory?.allergies || 'None reported'}
                </span>
              </div>

              {/* Service breakdown */}
              {viewConsultationAppt.servicesJson && viewConsultationAppt.servicesJson.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <span className="text-slate-400 block text-[10px]">ITEMIZED SERVICES BOOKED</span>
                  {viewConsultationAppt.servicesJson.map((svc, i) => (
                    <div key={i} className="flex justify-between font-medium text-slate-800 dark:text-slate-200">
                      <span>• {svc.name} ({svc.durationMinutes}m)</span>
                      <span>₹{svc.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => sendWhatsAppReminder(viewConsultationAppt)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Client</span>
              </button>
              <button
                onClick={() => proceedToPOSBilling(viewConsultationAppt)}
                className="px-4 py-2 rounded-xl bg-pink-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Bill at POS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
