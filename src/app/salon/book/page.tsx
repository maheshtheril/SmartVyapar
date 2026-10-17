'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Star,
  MapPin,
  ShieldCheck,
  Plus,
  Check,
  X,
  MessageCircle,
  ExternalLink,
  Flame,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface Stylist {
  name: string;
  role: string;
  rating: string;
  avatar: string;
  specialty: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description: string;
}

interface Slot {
  time: string;
  isAvailable: boolean;
}

interface ConfirmedBooking {
  bookingCode: string;
  clientName: string;
  clientPhone: string;
  stylistName: string;
  chairNumber: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  scheduledDate: string;
  scheduledTime: string;
  arrivalTime: string;
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
}

export default function PublicSalonBookingPage() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Salon Details from API
  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    phone: string;
    address: string;
    slug?: string;
  }>({
    name: 'Ziona Luxury Salon & Wellness Spa',
    phone: '+91 98450 12345',
    address: 'High Street Avenue, Luxury Wing',
  });

  // Catalogs
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  // User Selections
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Customer Input Fields
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [hairSkinNotes, setHairSkinNotes] = useState<string>('');

  // Confirmed Result
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);

  // Load Salon Data & Slots
  useEffect(() => {
    async function loadSlots() {
      setLoading(true);
      try {
        const stylistParam = selectedStylist ? encodeURIComponent(selectedStylist.name) : '';
        const res = await fetch(`/api/public/salon/slots?date=${selectedDate}&stylist=${stylistParam}`);
        const data = await res.json();
        if (data.success) {
          if (data.tenant) {
            setTenantInfo({
              name: data.tenant.name || 'Ziona Luxury Salon & Spa',
              phone: data.tenant.phone || '+91 98450 12345',
              address: data.tenant.address || 'Premium Wellness Suite',
              slug: data.tenant.slug,
            });
          }
          if (Array.isArray(data.stylists)) {
            setStylists(data.stylists);
            if (!selectedStylist && data.stylists.length > 0) {
              setSelectedStylist(data.stylists[0]);
            }
          }
          if (Array.isArray(data.services)) {
            setServices(data.services);
          }
          if (Array.isArray(data.slots)) {
            setSlots(data.slots);
          }
        }
      } catch (err) {
        console.error('Error fetching salon slots:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSlots();
  }, [selectedDate, selectedStylist?.name]);

  // Unique service categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    if (activeCategory === 'ALL') return services;
    return services.filter((s) => s.category.toLowerCase() === activeCategory.toLowerCase());
  }, [services, activeCategory]);

  // Toggle service selection in cart
  const toggleService = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  // Cart calculations
  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices]
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0),
    [selectedServices]
  );

  // Generate 7 upcoming date pills
  const upcomingDates = useMemo(() => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      list.push({ iso, dayName, dayNumber, monthName });
    }
    return list;
  }, []);

  // Submit Booking
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!clientPhone.trim() || clientPhone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit WhatsApp phone number');
      return;
    }
    if (!selectedTime) {
      setErrorMessage('Please pick an appointment time slot');
      return;
    }
    if (selectedServices.length === 0) {
      setErrorMessage('Please select at least one service');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/salon/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
          stylistName: selectedStylist ? selectedStylist.name : 'Master Stylist',
          services: selectedServices.map((s) => ({
            name: s.name,
            price: s.price,
            durationMinutes: s.durationMinutes,
          })),
          notes: specialNotes.trim() || undefined,
          consultationCard: hairSkinNotes.trim() ? { preferences: hairSkinNotes } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to confirm booking');
      }

      setConfirmedBooking({
        bookingCode: data.bookingCode,
        clientName: data.appointment.clientName,
        clientPhone: data.appointment.clientPhone,
        stylistName: data.appointment.stylistName,
        chairNumber: data.appointment.chairNumber,
        serviceName: data.appointment.serviceName,
        servicePrice: data.appointment.servicePrice,
        durationMinutes: data.appointment.durationMinutes,
        scheduledDate: data.appointment.scheduledDate,
        scheduledTime: data.appointment.scheduledTime,
        arrivalTime: data.appointment.arrivalTime,
        tenantName: data.tenant.name,
        tenantPhone: data.tenant.phone,
        tenantAddress: data.tenant.address,
      });

      setStep(5); // Confirmation screen
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Open WhatsApp Pass for the customer
  const shareBookingOnWhatsApp = () => {
    if (!confirmedBooking) return;
    const msg = `✨ *MY SALON BOOKING PASS - ${confirmedBooking.tenantName}* ✨\n\n🎟️ Pass Ref: *${confirmedBooking.bookingCode}*\n👤 Client: *${confirmedBooking.clientName}*\n📅 Date: *${confirmedBooking.scheduledDate}*\n⏰ Service Slot: *${confirmedBooking.scheduledTime}*\n⚡ *Zero-Wait Arrival Time: ${confirmedBooking.arrivalTime}*\n💇 Specialist: *${confirmedBooking.stylistName}*\n💺 Chair Station: *${confirmedBooking.chairNumber}*\n✂️ Services: *${confirmedBooking.serviceName}*\n💰 Total: *₹${confirmedBooking.servicePrice}*\n\n📍 Address: ${confirmedBooking.tenantAddress}`;
    const cleanPhone = confirmedBooking.clientPhone.replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-pink-500 selection:text-white">
      {/* Top Navigation & Brand Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base text-white tracking-tight flex items-center gap-2">
                {tenantInfo.name}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Zero-Waiting System
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-pink-400" />
                  {tenantInfo.address.split(',')[0]}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 border border-pink-500/30 rounded-full text-pink-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Smart Priority Pass</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full p-4 md:p-6 space-y-6 flex-1">
        {/* Step Indicator (Only when not confirmed) */}
        {step < 5 && (
          <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <div className="flex justify-between items-center text-xs font-bold mb-2 text-slate-400">
              <span className={step >= 1 ? 'text-pink-400' : ''}>1. Specialist</span>
              <span className={step >= 2 ? 'text-pink-400' : ''}>2. Services</span>
              <span className={step >= 3 ? 'text-pink-400' : ''}>3. Time Slot</span>
              <span className={step >= 4 ? 'text-pink-400' : ''}>4. Confirm</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: SELECT SPECIALIST / TECHNICIAN */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Select Your Preferred Specialist</span>
                <Sparkles className="w-4 h-4 text-pink-400" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Each technician is dedicated to your scheduled slot with zero chair handover delay.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stylists.map((st) => {
                const isSelected = selectedStylist?.name === st.name;
                return (
                  <div
                    key={st.name}
                    onClick={() => setSelectedStylist(st)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-pink-950/30 border-pink-500 shadow-lg shadow-pink-500/10 ring-1 ring-pink-500'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-md ${
                            isSelected
                              ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {st.avatar}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">{st.name}</h3>
                          <p className="text-xs text-pink-400 font-medium">{st.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-amber-400 text-xs font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{st.rating}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                      <span>{st.specialty}</span>
                      {isSelected ? (
                        <span className="text-pink-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Selected
                        </span>
                      ) : (
                        <span className="text-slate-500">Click to choose</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>Continue to Choose Services</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHOOSE SERVICES (MULTI-SELECT CART) */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Choose Services</h2>
                <p className="text-xs text-slate-400">
                  Select one or multiple services. You won’t be charged until your visit is complete.
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-pink-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Change Stylist ({selectedStylist?.name.split(' ')[0]})
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Service Item Cards */}
            <div className="space-y-2.5">
              {filteredServices.map((service) => {
                const isSelected = selectedServices.some((s) => s.id === service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-pink-950/20 border-pink-500/80 shadow-md ring-1 ring-pink-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{service.name}</h4>
                        {service.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {service.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{service.description}</p>
                      <div className="flex items-center gap-3 text-xs pt-1">
                        <span className="font-extrabold text-pink-400 text-sm">
                          ₹{service.price}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {service.durationMinutes} mins
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-pink-500 text-white'
                          : 'border border-slate-700 text-slate-500 hover:border-pink-500'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Bar & Actions */}
            {selectedServices.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-pink-950/50 via-slate-900 to-slate-900 border border-pink-500/40 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">
                    {selectedServices.length} service(s) • ~{totalDuration} mins duration
                  </div>
                  <div className="text-lg font-black text-white">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-md shadow-pink-500/20 flex items-center gap-1.5"
                  >
                    <span>Pick Time Slot</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: PICK DATE & COLLISION-FREE TIME SLOT */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Select Date & Time</h2>
                <p className="text-xs text-slate-400">
                  Live availability for {selectedStylist?.name}. Zero waiting time guaranteed.
                </p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="text-xs text-pink-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Services
              </button>
            </div>

            {/* Date Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {upcomingDates.map((item) => {
                const isSelected = selectedDate === item.iso;
                return (
                  <button
                    key={item.iso}
                    onClick={() => {
                      setSelectedDate(item.iso);
                      setSelectedTime('');
                    }}
                    className={`p-3 rounded-2xl text-center min-w-[76px] transition-all border ${
                      isSelected
                        ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[11px] font-bold opacity-80">{item.dayName}</div>
                    <div className="text-lg font-black mt-0.5">{item.dayNumber}</div>
                    <div className="text-[10px] opacity-70">{item.monthName}</div>
                  </button>
                );
              })}
            </div>

            {/* Slot Matrix */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-pink-400" />
                  Available 30-Minute Slots
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Free
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-600" /> Reserved
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Checking real-time technician slots...
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                  {slots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    if (!slot.isAvailable) {
                      return (
                        <div
                          key={slot.time}
                          className="py-2.5 px-2 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-600 text-xs font-semibold text-center cursor-not-allowed line-through"
                        >
                          {slot.time}
                        </div>
                      );
                    }
                    return (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center border transition-all ${
                          isSelected
                            ? 'bg-pink-600 border-pink-500 text-white shadow-md shadow-pink-500/20'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-pink-500/60 hover:text-white'
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-xs text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                disabled={!selectedTime}
                onClick={() => setStep(4)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white text-xs font-bold shadow-md shadow-pink-500/20 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continue ({selectedTime || 'Select Time'})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: GUEST DETAILS & ZERO-WAIT GUARANTEE CONFIRMATION */}
        {step === 4 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Your Contact Details</h2>
                <p className="text-xs text-slate-400">
                  We send your digital Zero-Wait pass & live arrival countdown directly to WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs text-pink-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Edit Time Slot
              </button>
            </div>

            {/* Booking Summary Pill */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Date & Time:</span>
                <span className="font-bold text-white">
                  {selectedDate} at {selectedTime}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Technician:</span>
                <span className="font-bold text-pink-400">{selectedStylist?.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Services:</span>
                <span className="font-bold text-white text-right max-w-xs truncate">
                  {selectedServices.map((s) => s.name).join(' + ')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-extrabold text-sm text-white">
                <span>Total Payable at Salon:</span>
                <span className="text-pink-400">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  WhatsApp Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Hair / Skin Preferences or Allergies (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sensitive scalp, Ammonia-free color only, Soft water wash"
                  value={hairSkinNotes}
                  onChange={(e) => setHairSkinNotes(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            {/* Zero-Wait Trust Shield */}
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/50 rounded-2xl flex items-center gap-3 text-xs text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>Zero-Wait Promise:</strong> Your chair will be sanitized and reserved at{' '}
                {selectedTime}. No waiting in the lobby.
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2.5 text-xs text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white text-xs font-bold shadow-lg shadow-pink-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                <span>{submitting ? 'Reserving Your Chair...' : 'Confirm Zero-Wait Booking'}</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: LUXURY DIGITAL PASS / CONFIRMATION */}
        {step === 5 && confirmedBooking && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Success Card */}
            <div className="bg-gradient-to-b from-pink-950/40 via-slate-900 to-slate-900 border border-pink-500/50 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Scissors className="w-32 h-32 text-pink-500" />
              </div>

              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-emerald-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-pink-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white">
                  Zero-Wait Chair Reserved!
                </h2>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Hi <strong className="text-white">{confirmedBooking.clientName}</strong>, your slot with{' '}
                  <strong className="text-pink-400">{confirmedBooking.stylistName}</strong> is officially locked.
                </p>
              </div>

              {/* Booking Reference Code */}
              <div className="my-5 p-3.5 bg-slate-950/80 border border-pink-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">
                    Digital Booking Pass
                  </span>
                  <span className="font-mono text-base font-black text-pink-400">
                    {confirmedBooking.bookingCode}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-semibold">STATION</span>
                  <span className="text-xs font-bold text-white">{confirmedBooking.chairNumber}</span>
                </div>
              </div>

              {/* Timing & Leave Home Notice */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between items-center text-emerald-400 font-bold">
                  <span>Scheduled Service Time:</span>
                  <span className="text-sm font-extrabold">{confirmedBooking.scheduledTime}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Recommended Arrival Time:</span>
                  <span className="font-bold text-white">{confirmedBooking.arrivalTime} (5 min prior)</span>
                </div>
                <div className="text-[11px] text-emerald-300/80 pt-1 border-t border-emerald-900/50">
                  ⚡ Relax at your home/office until {confirmedBooking.arrivalTime}. Your chair is guaranteed ready with 0 wait time!
                </div>
              </div>

              {/* Itemized Services */}
              <div className="mt-4 pt-4 border-t border-slate-800 text-xs space-y-2">
                <div className="text-slate-400 font-semibold">Booked Services:</div>
                <div className="font-bold text-white">{confirmedBooking.serviceName}</div>
                <div className="flex justify-between items-center text-slate-400 pt-1">
                  <span>Total Payable on Completion:</span>
                  <span className="font-black text-base text-pink-400">
                    ₹{confirmedBooking.servicePrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={shareBookingOnWhatsApp}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Save Pass to WhatsApp</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all"
                >
                  Print / Save Receipt
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedServices([]);
                  setSelectedTime('');
                  setConfirmedBooking(null);
                }}
                className="text-xs text-slate-400 hover:text-pink-400 underline"
              >
                Book another appointment
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>{tenantInfo.name} • Zero-Wait Salon Architecture</span>
          <span>Powered by Ziona POS Enterprise</span>
        </div>
      </footer>
    </div>
  );
}
