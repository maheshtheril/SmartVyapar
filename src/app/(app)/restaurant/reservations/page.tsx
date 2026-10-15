'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Users, Phone, Plus, Check, X, ChefHat, List } from 'lucide-react';

type ResStatus = 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'WAITLIST';

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  reservedAt: string;
  tableId: string | null;
  notes: string | null;
  status: ResStatus;
}

const STATUS_STYLES: Record<ResStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800',
  SEATED:    'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-rose-100 text-rose-700',
  WAITLIST:  'bg-sky-100 text-sky-700',
};

const STATUS_ACTIONS: Record<ResStatus, { label: string; next: ResStatus }[]> = {
  PENDING:   [{ label: '✓ Confirm', next: 'CONFIRMED' }, { label: '✕ Cancel', next: 'CANCELLED' }],
  CONFIRMED: [{ label: '🪑 Seat', next: 'SEATED' }, { label: '✕ Cancel', next: 'CANCELLED' }],
  SEATED:    [{ label: '✓ Complete', next: 'COMPLETED' }],
  WAITLIST:  [{ label: '✓ Confirm', next: 'CONFIRMED' }, { label: '✕ Cancel', next: 'CANCELLED' }],
  COMPLETED: [],
  CANCELLED: [],
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const [tab, setTab] = useState<'reservations' | 'waitlist'>('reservations');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGuests, setFormGuests] = useState(2);
  const [formDate, setFormDate] = useState(todayStr());
  const [formTime, setFormTime] = useState('19:00');
  const [formNotes, setFormNotes] = useState('');
  const [formIsWaitlist, setFormIsWaitlist] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/restaurant/reservations?date=${date}`);
      const data = await res.json();
      if (data.success) setReservations(data.reservations);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/restaurant/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formName,
          customerPhone: formPhone,
          guestCount: formGuests,
          reservedAt: formIsWaitlist ? undefined : `${formDate}T${formTime}:00`,
          notes: formNotes || undefined,
          isWaitlist: formIsWaitlist,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setShowForm(false);
      setFormName(''); setFormPhone(''); setFormGuests(2); setFormNotes('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, status: ResStatus) => {
    await fetch('/api/restaurant/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reservation?')) return;
    await fetch(`/api/restaurant/reservations?id=${id}`, { method: 'DELETE' });
    loadData();
  };

  const displayed = reservations.filter((r) =>
    tab === 'waitlist' ? r.status === 'WAITLIST' : r.status !== 'WAITLIST'
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Reservations & Waitlist
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage advance bookings and walk-in queue</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormIsWaitlist(false); }}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" /> New Reservation
        </button>
      </div>

      {/* Tabs + Date */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 gap-0.5">
          {(['reservations', 'waitlist'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                tab === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t === 'waitlist' ? '🕐 Waitlist' : '📅 Bookings'}
            </button>
          ))}
        </div>
        {tab !== 'waitlist' && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        )}
        {tab === 'waitlist' && (
          <button
            onClick={() => { setShowForm(true); setFormIsWaitlist(true); }}
            className="flex items-center gap-1 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
          >
            <Plus className="h-3 w-3" /> Add Walk-in to Waitlist
          </button>
        )}
      </div>

      {/* Reservations List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {tab === 'waitlist' ? 'No one in the waitlist right now' : `No reservations for ${date}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900">{r.customerName}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {r.customerPhone}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[r.status]}`}>
                  {r.status}
                </span>
              </div>

              {/* Details */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {r.guestCount} guests
                </span>
                {r.status !== 'WAITLIST' && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(r.reservedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {r.notes && (
                <p className="text-[11px] text-slate-400 italic">"{r.notes}"</p>
              )}

              {/* Action buttons */}
              {STATUS_ACTIONS[r.status]?.length > 0 && (
                <div className="flex gap-2 pt-1">
                  {STATUS_ACTIONS[r.status].map((a) => (
                    <button
                      key={a.next}
                      onClick={() => handleAction(r.id, a.next)}
                      className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold border transition ${
                        a.next === 'CANCELLED'
                          ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                          : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-400 hover:bg-slate-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Reservation Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">
                {formIsWaitlist ? '🕐 Add to Waitlist' : '📅 New Reservation'}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <p className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">{error}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name *</label>
                  <input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ravi Sharma"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone *</label>
                  <input
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Guests</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formGuests}
                    onChange={(e) => setFormGuests(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                {!formIsWaitlist && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Time *</label>
                      <input
                        type="time"
                        required
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Notes (optional)</label>
                  <input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Birthday, anniversary, dietary needs…"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : formIsWaitlist ? 'Add to Waitlist' : 'Book Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
