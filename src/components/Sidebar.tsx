'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  MessageSquare
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  FileText,
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
};

interface NavChildNode {
  id: string;
  name: string;
  href: string;
  icon: string;
  badge?: string;
  badgeColor?: 'amber' | 'rose' | 'emerald' | 'indigo';
  aiTag?: string;
  highlight?: boolean;
}

interface NavTreeGroup {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  badgeColor?: 'amber' | 'rose' | 'emerald' | 'indigo';
  children: NavChildNode[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState({
    businessName: "Loading Business...",
    subscriptionTier: "FREE",
    gstin: "",
  });
  const [currentUser, setCurrentUser] = useState({ name: "", role: "" });
  const [treeGroups, setTreeGroups] = useState<NavTreeGroup[]>([]);

  // Expanded state for parent tree categories
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    billing: true,
    inventory: true,
    restaurant: false,
    parties: false,
    accounting: false,
    ai: true,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Auto-expand group if current path matches any child
  useEffect(() => {
    if (pathname.startsWith('/billing') || pathname.startsWith('/invoices')) {
      setExpandedGroups((prev) => ({ ...prev, billing: true }));
    } else if (pathname.startsWith('/inventory')) {
      setExpandedGroups((prev) => ({ ...prev, inventory: true }));
    } else if (pathname.startsWith('/restaurant')) {
      setExpandedGroups((prev) => ({ ...prev, restaurant: true }));
    } else if (pathname.startsWith('/customers')) {
      setExpandedGroups((prev) => ({ ...prev, parties: true }));
    } else if (pathname.startsWith('/accounting')) {
      setExpandedGroups((prev) => ({ ...prev, accounting: true }));
    } else if (pathname.startsWith('/scanner')) {
      setExpandedGroups((prev) => ({ ...prev, ai: true }));
    }
  }, [pathname]);

  // Dynamically load Tenant Profile & Live DB Tree from /api/tenant
  useEffect(() => {
    async function loadTenantData() {
      try {
        const res = await fetch("/api/tenant");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
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
          // Set dynamic menu tree populated by Neon Database
          if (Array.isArray(data.menuTree)) {
            setTreeGroups(data.menuTree);
          }
        }
      } catch (err) {
        console.error("Failed to load tenant profile for sidebar:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTenantData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-sm shadow-indigo-200">
            SV
          </div>
          <div>
            <span className="text-base font-bold text-slate-900">Smart<span className="text-indigo-600">Vyapar</span></span>
            <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">ERP</span>
          </div>
        </div>
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

      {/* Dynamic Hierarchical Tree Sidebar (Loaded from Database) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-sm shadow-indigo-200">
              SV
            </div>
            <div>
              <span className="text-base font-bold text-slate-900">Smart<span className="text-indigo-600">Vyapar</span></span>
              <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">PRO</span>
            </div>
          </div>
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
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Plan: <span className="font-bold text-indigo-600">{tenant.subscriptionTier}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Menu Search Trigger (World Standard Ctrl+K) */}
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

        {/* Dynamic Tree Navigation from Database */}
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

          <div className="pt-2">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ERP Modules
            </p>
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

                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                            isChildActive
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                              : child.highlight
                              ? 'bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <ChildIcon className={`h-3.5 w-3.5 shrink-0 ${
                              isChildActive
                                ? 'text-white'
                                : child.highlight
                                ? 'text-emerald-600'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`} />
                            <span className="truncate">{child.name}</span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {child.badge && (
                              <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                                child.badgeColor === 'amber'
                                  ? 'bg-amber-100 text-amber-800'
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
                          </div>
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
    </>
  );
}
