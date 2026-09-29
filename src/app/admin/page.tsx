'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Shield,
  Crown,
  Calendar,
  Package,
  Receipt,
  ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  amount: number;
  status: string;
  createdAt: string;
  billingCycle: string;
}

interface Tenant {
  id: string;
  businessName: string;
  email: string | null;
  phone: string;
  subscriptionTier: 'PRO' | 'FREE' | 'ENTERPRISE';
  subscriptionStatus: string;
  planExpiresAt: string | null;
  createdAt: string;
  invoiceCount: number;
  productCount: number;
  purchaseBillCount: number;
  lastActiveAt: string | null;
  payments: Payment[];
}

interface AllPayment {
  id: string;
  tenantId: string;
  businessName: string;
  amount: number;
  status: string;
  tier: string;
  billingCycle: string;
  orderId: string;
  paymentId: string | null;
  createdAt: string;
}

interface Metrics {
  totalTenants: number;
  proTenants: number;
  freeTenants: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
  expiringSoon: number;
}

interface DashboardData {
  metrics: Metrics;
  tenants: Tenant[];
  payments: AllPayment[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const isExpiringSoon = (expiry: string | null) => {
  if (!expiry) return false;
  const now = new Date();
  const exp = new Date(expiry);
  const diff = exp.getTime() - now.getTime();
  return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-2 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-slate-500 text-xs">{sub}</div>}
    </div>
  );
}

function PlanBadge({ tier }: { tier: string }) {
  if (tier === 'PRO')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-900 text-purple-300 border border-purple-700">
        <Crown className="w-3 h-3" /> PRO
      </span>
    );
  if (tier === 'ENTERPRISE')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-900 text-blue-300 border border-blue-700">
        <Shield className="w-3 h-3" /> ENTERPRISE
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
      FREE
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-900 text-emerald-300 border-emerald-700',
    TRIALING: 'bg-cyan-900 text-cyan-300 border-cyan-700',
    EXPIRED: 'bg-rose-900 text-rose-300 border-rose-700',
    CANCELLED: 'bg-slate-700 text-slate-400 border-slate-600',
    PAID: 'bg-emerald-900 text-emerald-300 border-emerald-700',
    FAILED: 'bg-rose-900 text-rose-300 border-rose-700',
    PENDING: 'bg-amber-900 text-amber-300 border-amber-700',
  };
  const cls = map[status] ?? 'bg-slate-700 text-slate-400 border-slate-600';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}

// ─── Tenant Detail Modal ──────────────────────────────────────────────────────

function TenantModal({
  tenant,
  onClose,
  onSaveOverride,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSaveOverride: (id: string, tier: 'PRO' | 'FREE', expiry: string | null) => Promise<void>;
}) {
  const [tier, setTier] = useState<'PRO' | 'FREE'>(
    tenant.subscriptionTier === 'ENTERPRISE' ? 'PRO' : (tenant.subscriptionTier as 'PRO' | 'FREE')
  );
  const [expiry, setExpiry] = useState<string>(
    tenant.planExpiresAt ? tenant.planExpiresAt.split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveOverride(tenant.id, tier, expiry || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">{tenant.businessName}</h2>
            <PlanBadge tier={tenant.subscriptionTier} />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Business Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-slate-500 text-xs mb-1">Email</div>
              <div className="text-white text-sm">{tenant.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Phone</div>
              <div className="text-white text-sm">{tenant.phone}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Joined</div>
              <div className="text-white text-sm">{fmtDate(tenant.createdAt)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Last Active</div>
              <div className="text-white text-sm">{fmtDate(tenant.lastActiveAt)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Status</div>
              <StatusBadge status={tenant.subscriptionStatus} />
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Plan Expires</div>
              <div
                className={`text-sm font-medium ${
                  isExpiringSoon(tenant.planExpiresAt)
                    ? 'text-amber-400'
                    : 'text-white'
                }`}
              >
                {fmtDate(tenant.planExpiresAt)}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <Receipt className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{tenant.invoiceCount}</div>
              <div className="text-slate-500 text-xs">Invoices</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <Package className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{tenant.productCount}</div>
              <div className="text-slate-500 text-xs">Products</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <CreditCard className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{tenant.purchaseBillCount}</div>
              <div className="text-slate-500 text-xs">Bills</div>
            </div>
          </div>

          {/* Payment History */}
          {tenant.payments.length > 0 && (
            <div>
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">
                Payment History
              </div>
              <div className="space-y-2">
                {tenant.payments.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold">{fmtMoney(p.amount)}</span>
                      <span className="text-slate-500 text-xs">{p.billingCycle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <span className="text-slate-500 text-xs">{fmtDate(p.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Plan Override */}
          <div className="border border-amber-800/50 bg-amber-950/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-semibold">Manual Plan Override</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Subscription Tier</label>
                <div className="relative">
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as 'PRO' | 'FREE')}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm appearance-none focus:outline-none focus:border-purple-500"
                  >
                    <option value="PRO">PRO</option>
                    <option value="FREE">FREE</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Plan Expiry Date</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
            >
              {saving ? 'Saving…' : 'Save Override'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');

  const [filter, setFilter] = useState<'ALL' | 'PRO' | 'FREE' | 'EXPIRING'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants');
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try to get session info from a cookie or local state for display
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setAdminEmail(d?.email ?? ''))
      .catch(() => {});
    fetchData();
  }, [fetchData]);

  const handleUpgrade = async (id: string, tier: 'PRO' | 'FREE') => {
    const expiry =
      tier === 'PRO'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;
    await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionTier: tier, planExpiresAt: expiry }),
    });
    await fetchData();
  };

  const handleSaveOverride = async (
    id: string,
    tier: 'PRO' | 'FREE',
    expiry: string | null
  ) => {
    await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionTier: tier,
        planExpiresAt: expiry ? new Date(expiry).toISOString() : null,
      }),
    });
    setSelectedTenant(null);
    await fetchData();
  };

  // ── Access denied screen ────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-rose-900/30 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400">
            You do not have permission to view the platform admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-slate-400">Loading platform data…</p>
        </div>
      </div>
    );
  }

  const { metrics, tenants = [], payments = [] } = data ?? {
    metrics: {
      totalTenants: 0,
      proTenants: 0,
      freeTenants: 0,
      mrr: 0,
      arr: 0,
      totalRevenue: 0,
      expiringSoon: 0,
    },
    tenants: [],
    payments: [],
  };

  // ── Filter & search tenants ─────────────────────────────────────────────────
  const filteredTenants = tenants.filter((t) => {
    const matchSearch = t.businessName.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'PRO') return t.subscriptionTier === 'PRO';
    if (filter === 'FREE') return t.subscriptionTier === 'FREE';
    if (filter === 'EXPIRING') return isExpiringSoon(t.planExpiresAt);
    return true;
  });

  const totalPaymentsAmount = payments
    .filter((p) => p.status === 'PAID')
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Top Header ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              ZionaPOS Platform Admin
            </h1>
            <p className="text-slate-500 text-xs">Super Admin Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {adminEmail && (
            <span className="text-slate-400 text-sm hidden sm:block">
              Logged in as <span className="text-white font-medium">{adminEmail}</span>
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard
            icon={Building2}
            label="Total Tenants"
            value={metrics.totalTenants}
            color="bg-blue-600"
          />
          <MetricCard
            icon={Crown}
            label="PRO"
            value={metrics.proTenants}
            color="bg-purple-600"
          />
          <MetricCard
            icon={Users}
            label="FREE"
            value={metrics.freeTenants}
            color="bg-slate-600"
          />
          <MetricCard
            icon={TrendingUp}
            label="MRR"
            value={fmtMoney(metrics.mrr)}
            sub="Monthly Recurring"
            color="bg-emerald-600"
          />
          <MetricCard
            icon={TrendingUp}
            label="ARR"
            value={fmtMoney(metrics.arr)}
            sub="Annual Recurring"
            color="bg-teal-600"
          />
          <MetricCard
            icon={CreditCard}
            label="Total Revenue"
            value={fmtMoney(metrics.totalRevenue)}
            sub="All-time paid"
            color="bg-indigo-600"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Expiring Soon"
            value={metrics.expiringSoon}
            sub="Within 7 days"
            color="bg-amber-600"
          />
        </div>

        {/* ── Two Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Tenants Table (60%) ── */}
          <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  Tenants
                  <span className="text-slate-500 text-sm font-normal">
                    ({filteredTenants.length})
                  </span>
                </h2>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 flex-wrap">
                {(['ALL', 'PRO', 'FREE', 'EXPIRING'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                      filter === f
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {f === 'EXPIRING' ? 'Expiring Soon' : f}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search by business name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Tenants list */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">
                      Business
                    </th>
                    <th className="px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">
                      Plan
                    </th>
                    <th className="px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide hidden md:table-cell">
                      Expires
                    </th>
                    <th className="px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide hidden lg:table-cell">
                      Inv
                    </th>
                    <th className="px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide hidden lg:table-cell">
                      Prod
                    </th>
                    <th className="px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide hidden lg:table-cell">
                      Bills
                    </th>
                    <th className="px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide hidden xl:table-cell">
                      Last Active
                    </th>
                    <th className="px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No tenants found.
                      </td>
                    </tr>
                  )}
                  {filteredTenants.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white leading-tight">
                          {t.businessName}
                        </div>
                        <div className="text-slate-500 text-xs">{t.email ?? t.phone}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <PlanBadge tier={t.subscriptionTier} />
                          <StatusBadge status={t.subscriptionStatus} />
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        {t.planExpiresAt ? (
                          <span
                            className={`text-xs ${
                              isExpiringSoon(t.planExpiresAt)
                                ? 'text-amber-400 font-medium'
                                : 'text-slate-400'
                            }`}
                          >
                            {isExpiringSoon(t.planExpiresAt) && (
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                            )}
                            {fmtDate(t.planExpiresAt)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-300 hidden lg:table-cell">
                        {t.invoiceCount}
                      </td>
                      <td className="px-3 py-3 text-slate-300 hidden lg:table-cell">
                        {t.productCount}
                      </td>
                      <td className="px-3 py-3 text-slate-300 hidden lg:table-cell">
                        {t.purchaseBillCount}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-xs hidden xl:table-cell">
                        {fmtDate(t.lastActiveAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1.5">
                          {t.subscriptionTier !== 'PRO' ? (
                            <button
                              onClick={() => handleUpgrade(t.id, 'PRO')}
                              className="flex items-center gap-1 px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              <Crown className="w-3 h-3" /> Upgrade PRO
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpgrade(t.id, 'FREE')}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              Set FREE
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTenant(t)}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors border border-slate-700 whitespace-nowrap"
                          >
                            <Shield className="w-3 h-3" /> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right: Payment Log (40%) ── */}
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Payment Log
              </h2>
              <span className="text-slate-500 text-xs">{payments.length} records</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {payments.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">No payments yet.</div>
              )}
              {payments.map((p) => (
                <div key={p.id} className="px-4 py-3 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-white text-sm truncate">
                        {p.businessName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-500 text-xs">{p.tier}</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-slate-500 text-xs">{p.billingCycle}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {fmtMoney(p.amount)}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="text-slate-600 text-xs mt-1">{fmtDate(p.createdAt)}</div>
                </div>
              ))}
            </div>

            {/* Total footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Paid</span>
                <span className="text-emerald-400 font-bold text-base">
                  {fmtMoney(totalPaymentsAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Tenant Detail Modal ── */}
      {selectedTenant && (
        <TenantModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onSaveOverride={handleSaveOverride}
        />
      )}
    </div>
  );
}
