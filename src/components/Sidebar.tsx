'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ZionaLogo } from './ZionaLogo';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Package, 
  Users, 
  Camera, 
  Menu, 
  X, 
  Building2,
  ChevronRight,
  ChevronDown,
  Search,
  BookOpen,
  Sparkles,
  Tag,
  ChefHat,
  Grid,
  Boxes,
  UtensilsCrossed,
  LogOut,
  UserCircle2,
  Receipt,
  RotateCcw,
  Truck,
  FileCode,
  Landmark,
  Layers,
  Settings,
  ShieldCheck,
  Printer,
  CreditCard,
  MessageSquare,
  FileCheck,
  Scale,
  ClipboardCheck,
  Wallet,
  ChevronsUpDown,
  Lock,
  Clock,
  Calculator,
  Crown,
  Zap,
  CheckCircle2,
  Wrench,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  FileText,
  FileCheck,
  Scale,
  RotateCcw,
  Truck,
  FileCode,
  Package,
  Tag,
  Grid,
  Boxes,
  ChefHat,
  UtensilsCrossed,
  Layers,
  Users,
  BookOpen,
  Landmark,
  Sparkles,
  Camera,
  Building2,
  Settings,
  ShieldCheck,
  Printer,
  CreditCard,
  MessageSquare,
  ClipboardCheck,
  Wallet,
  Lock,
  Clock,
  Calculator,
  Crown,
  Zap,
  Wrench,
};

const EXPANDED_STORAGE_KEY = 'sv_sidebar_expanded';

interface NavChildNode {
  id: string;
  name: string;
  href: string;
  icon: string;
  badge?: string;
  badgeColor?: 'amber' | 'rose' | 'emerald' | 'indigo';
  aiTag?: string;
  highlight?: boolean;
  proTierOnly?: boolean;
}

interface NavTreeGroup {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  badgeColor?: 'amber' | 'rose' | 'emerald' | 'indigo';
  children: NavChildNode[];
}

function loadPersistedExpanded(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function savePersistedExpanded(state: Record<string, boolean>) {
  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState({
    businessName: "Loading...",
    subscriptionTier: "FREE",
    gstin: "",
  });
  const [currentUser, setCurrentUser] = useState({ name: "", role: "" });
  const [treeGroups, setTreeGroups] = useState<NavTreeGroup[]>([]);
  const [proModalFeature, setProModalFeature] = useState<{ name: string; href: string } | null>(null);

  // Expanded state – seeded from localStorage (all closed by default if no saved state)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    loadPersistedExpanded()
  );

  const updateExpanded = useCallback((updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
    setExpandedGroups((prev) => {
      const next = updater(prev);
      savePersistedExpanded(next);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    updateExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, [updateExpanded]);

  const collapseAll = useCallback(() => {
    updateExpanded(() => ({}));
  }, [updateExpanded]);

  const expandAll = useCallback(() => {
    setTreeGroups((groups) => {
      const allExpanded: Record<string, boolean> = {};
      groups.forEach((g) => { allExpanded[g.id] = true; });
      savePersistedExpanded(allExpanded);
      setExpandedGroups(allExpanded);
      return groups;
    });
  }, []);

  // Auto-expand the group containing the active page – only when it's currently collapsed
  useEffect(() => {
    setExpandedGroups((prev) => {
      const groupMap: Record<string, string> = {
        '/billing': 'billing',
        '/invoices': 'billing',
        '/inventory': 'inventory',
        '/restaurant': 'restaurant',
        '/customers': 'parties',
        '/accounting': 'accounting',
      };
      let targetGroup: string | null = null;
      for (const [prefix, groupId] of Object.entries(groupMap)) {
        if (pathname.startsWith(prefix)) {
          targetGroup = groupId;
          break;
        }
      }
      if (targetGroup && !prev[targetGroup]) {
        const next = { ...prev, [targetGroup]: true };
        savePersistedExpanded(next);
        return next;
      }
      return prev;
    });
  }, [pathname]);

  // Fetch tenant data ONCE on mount only (no dependency on router)
  useEffect(() => {
    let cancelled = false;
    async function loadTenantData() {
      try {
        const res = await fetch("/api/tenant");
        if (cancelled) return;
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          if (data.tenant) {
            setTenant({
              businessName: data.tenant.businessName,
              subscriptionTier: data.tenant.subscriptionTier || "FREE",
              gstin: data.tenant.gstin || "",
            });
          }
          if (data.user) {
            setCurrentUser({ name: data.user.name, role: data.user.role });
          }
          if (Array.isArray(data.menuTree)) {
            setTreeGroups(data.menuTree);
          }
        }
      } catch (err) {
        console.error("Failed to load tenant profile for sidebar:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTenantData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: fetch exactly once, never re-fetch on navigation

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Count how many groups are currently expanded
  const expandedCount = Object.values(expandedGroups).filter(Boolean).length;
  const hasAnyExpanded = expandedCount > 0;

  return (
    <>
      {/* Mobile Top Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <ZionaLogo size="sm" />
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Dynamic Hierarchical Tree Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5 shrink-0">
          <ZionaLogo size="md" />
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Tenant Profile Card */}
        <div className="p-3 shrink-0">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="truncate flex-1 min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">{tenant.businessName}</p>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center space-x-1">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${tenant.subscriptionTier === 'FREE' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Plan: <span className={`font-bold ${tenant.subscriptionTier === 'FREE' ? 'text-amber-700' : 'text-indigo-600'}`}>{tenant.subscriptionTier}</span>
                    </p>
                  </div>
                  {tenant.subscriptionTier === 'FREE' ? (
                    <button
                      onClick={() => setProModalFeature({ name: "Ziona POS PRO Plan", href: "/settings?tab=billing" })}
                      className="inline-flex items-center space-x-0.5 rounded-md bg-amber-500 hover:bg-amber-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-2xs transition cursor-pointer"
                      title="Upgrade to Ziona POS PRO"
                    >
                      <Zap className="h-2.5 w-2.5" />
                      <span>UPGRADE</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center space-x-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <Crown className="h-2.5 w-2.5 text-amber-500" />
                      <span>ACTIVE</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Menu Search Trigger (Ctrl+K) */}
        <div className="px-3 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              window.dispatchEvent(new CustomEvent('open-command-palette'));
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition text-xs font-medium group cursor-pointer shadow-2xs"
            title="Search all menus & actions (Ctrl + K)"
          >
            <div className="flex items-center space-x-2">
              <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
              <span className="text-slate-500 group-hover:text-slate-700 text-xs">Search menus...</span>
            </div>
            <kbd className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Dynamic Tree Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-2 overflow-y-auto">
          {/* Root Link: Dashboard */}
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
              pathname === '/'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <LayoutDashboard className={`h-4 w-4 ${pathname === '/' ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'}`} />
              <span>Dashboard</span>
            </div>
            {pathname === '/' && (
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            )}
          </Link>

          {/* ERP Modules Header + Collapse/Expand All Toggle */}
          <div className="pt-2 flex items-center justify-between pr-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ERP Modules
            </p>
            {treeGroups.length > 0 && (
              <button
                onClick={hasAnyExpanded ? collapseAll : expandAll}
                title={hasAnyExpanded ? "Collapse all sections" : "Expand all sections"}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <ChevronsUpDown className="h-3 w-3" />
                {hasAnyExpanded ? "Collapse" : "Expand"}
              </button>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && treeGroups.length === 0 && (
            <div className="space-y-2 p-2 animate-pulse">
              <div className="h-8 bg-slate-100 rounded-lg w-full"></div>
              <div className="h-8 bg-slate-100 rounded-lg w-full"></div>
              <div className="h-8 bg-slate-100 rounded-lg w-full"></div>
            </div>
          )}

          {/* Render Dynamic Database Tree Groups */}
          {treeGroups.map((group) => {
            const isExpanded = !!expandedGroups[group.id];
            const GroupIcon = ICON_MAP[group.icon] || Package;
            const hasActiveChild = group.children.some((child) => pathname === child.href);

            return (
              <div key={group.id} className="space-y-1">
                {/* Parent Category Button */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                    hasActiveChild && !isExpanded
                      ? 'bg-indigo-50/80 text-indigo-900'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <GroupIcon className={`h-4 w-4 shrink-0 ${hasActiveChild ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                    <span className="truncate">{group.name}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {group.badge && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        group.badgeColor === 'amber'
                          ? 'bg-amber-100 text-amber-800'
                          : group.badgeColor === 'rose'
                          ? 'bg-rose-100 text-rose-800'
                          : group.badgeColor === 'emerald'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {group.badge}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition" />
                    )}
                  </div>
                </button>

                {/* Collapsible Child Tree Nodes */}
                {isExpanded && (
                  <div className="ml-4 border-l-2 border-slate-100 pl-2.5 space-y-0.5 py-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {group.children.map((child) => {
                      const isChildActive = pathname === child.href;
                      const ChildIcon = ICON_MAP[child.icon] || FileText;
                      const isProLocked = !!(child.proTierOnly && tenant.subscriptionTier === 'FREE');

                      // World-standard SaaS gate: visible but locked for FREE users
                      const sharedClasses = `group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition w-full text-left ${
                        isProLocked
                          ? 'text-slate-500 hover:bg-amber-50/60 hover:text-amber-900 opacity-90'
                          : isChildActive
                          ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                          : child.highlight
                          ? 'bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`;

                      const innerContent = (
                        <>
                          <div className="flex items-center space-x-2 truncate">
                            <ChildIcon className={`h-3.5 w-3.5 shrink-0 ${
                              isProLocked
                                ? 'text-amber-400'
                                : isChildActive
                                ? 'text-white'
                                : child.highlight
                                ? 'text-emerald-600'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`} />
                            <span className="truncate">{child.name}</span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {isProLocked ? (
                              <span className="inline-flex items-center space-x-0.5 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-800">
                                <Lock className="h-2.5 w-2.5" />
                                <span>PRO</span>
                              </span>
                            ) : (
                              <>
                                {child.badge && (
                                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                                    child.badgeColor === 'amber'
                                      ? 'bg-amber-100 text-amber-800'
                                      : child.badgeColor === 'emerald'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : child.badgeColor === 'indigo'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {child.badge}
                                  </span>
                                )}
                                {child.aiTag && (
                                  <span className="flex items-center space-x-0.5 rounded-full bg-linear-to-r from-violet-500 to-indigo-500 px-1.5 py-0.2 text-[9px] font-bold text-white shadow-xs">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    <span>{child.aiTag}</span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      );

                      if (isProLocked) {
                        return (
                          <button
                            key={child.id}
                            onClick={() => {
                              setMobileOpen(false);
                              setProModalFeature({ name: child.name, href: "/settings?tab=billing" });
                            }}
                            className={sharedClasses}
                            title={`${child.name} — Upgrade to PRO to unlock`}
                          >
                            {innerContent}
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={sharedClasses}
                        >
                          {innerContent}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Account & Logout Footer */}
        <div className="border-t border-slate-100 p-3 shrink-0">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <div className="truncate min-w-0">
                <p className="truncate text-xs font-bold text-slate-800">
                  {currentUser.name || "Authenticated User"}
                </p>
                <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">
                  {currentUser.role || "STAFF"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* PRO Upgrade Modal — fires when FREE user clicks a proTierOnly feature */}
      {proModalFeature && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setProModalFeature(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">PRO Feature</p>
                  <h2 className="text-base font-extrabold text-slate-900 leading-snug">Unlock SmartVyapar PRO</h2>
                </div>
              </div>
              <button
                onClick={() => setProModalFeature(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Feature Name */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center space-x-3">
              <Lock className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Trying to access</p>
                <p className="text-sm font-bold text-slate-900">{proModalFeature.name}</p>
              </div>
            </div>

            {/* Benefits List */}
            <ul className="space-y-2">
              {[
                "E-Way Bills (Rule 138) for dispatch compliance",
                "Delivery Challans (Rule 55) with invoice conversion",
                "Warehouses & Multi-Store stock transfers",
                "GSTR-2B ITC Matcher with Rule 36(4) auto-reconcile",
                "GSTR-3B Preparation with Rule 88A Electronic setoff",
                "Unlimited invoices, products & customers",
                "Advanced analytics, WhatsApp dunning & bulk export",
              ].map((benefit) => (
                <li key={benefit} className="flex items-start space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Pricing Callout */}
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-center">
              <p className="text-xs text-slate-600">Starting from</p>
              <p className="text-2xl font-extrabold text-indigo-700">₹499<span className="text-sm font-semibold text-slate-500">/month</span></p>
              <p className="text-[10px] text-indigo-600 font-semibold">or ₹4,999/year — Save 2 months free</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setProModalFeature(null);
                  router.push(proModalFeature.href);
                }}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-4 py-3 text-sm font-extrabold shadow-lg shadow-amber-200 transition"
              >
                <Zap className="h-4 w-4" />
                <span>Upgrade to PRO Now</span>
              </button>
              <button
                onClick={() => setProModalFeature(null)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700 transition py-1"
              >
                Maybe later — continue on Free plan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
