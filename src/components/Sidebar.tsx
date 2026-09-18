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
  BookOpen,
  Sparkles,
  Tag,
  ChefHat,
  Grid,
  Boxes,
  UtensilsCrossed,
  LogOut,
  UserCircle2
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Package,
  Users,
  BookOpen,
  Camera,
  Tag,
  ChefHat,
  Grid,
  Boxes,
  UtensilsCrossed,
};

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: string;
  highlight?: boolean;
  badge?: string;
  badgeColor?: string;
  aiTag?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenant, setTenant] = useState({
    businessName: "Loading Business...",
    subscriptionTier: "FREE",
    gstin: "",
  });
  const [currentUser, setCurrentUser] = useState({ name: "", role: "" });
  const [navItems, setNavItems] = useState<NavItem[]>([
    { id: "dashboard", name: "Dashboard", href: "/", icon: "LayoutDashboard" },
    { id: "pos", name: "Create Bill (POS)", href: "/billing/new", icon: "PlusCircle", highlight: true },
    { id: "invoices", name: "Invoices & Ledger", href: "/invoices", icon: "FileText" },
    { id: "inventory", name: "Stock & Inventory", href: "/inventory", icon: "Package" },
    { id: "barcode", name: "Barcode Labels", href: "/inventory/barcode-generator", icon: "Tag" },
    { id: "variants", name: "Variant Matrix", href: "/inventory/variants", icon: "Grid" },
    { id: "batches", name: "Batches & Expiry", href: "/inventory/batches", icon: "Boxes" },
    { id: "recipes", name: "Recipes (BOM)", href: "/inventory/recipes", icon: "ChefHat" },
    { id: "restaurant", name: "Restaurant & KOT", href: "/restaurant", icon: "UtensilsCrossed" },
    { id: "customers", name: "Customers", href: "/customers", icon: "Users" },
    { id: "coa", name: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: "BookOpen" },
    { id: "scanner", name: "AI Purchase Scanner", href: "/scanner", icon: "Camera", aiTag: "Gemini" },
  ]);

  // Dynamically load Tenant Profile & Live DB Badges from Neon
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
          if (Array.isArray(data.navItems)) {
            setNavItems(data.navItems);
          }
        }
      } catch (err) {
        console.error("Error loading dynamic sidebar:", err);
      }
    }
    loadTenantData();
  }, [pathname]); // Refresh badges on page change

  async function handleLogout() {
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <>
      {/* Mobile Top Header with Hamburger Button */}
      <div className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-xs shadow-sm shadow-indigo-200">
            SV
          </div>
          <span className="font-bold text-slate-900 text-sm truncate max-w-[180px]">
            {tenant.businessName}
          </span>
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

      {/* Dynamic Sidebar (Desktop Fixed + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
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
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Tenant Card (Live from Neon DB) */}
        <div className="p-3">
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

        {/* Dynamic Navigation Menu Items */}
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = ICON_MAP[item.icon] || FileText;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : item.highlight
                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="truncate">{item.name}</span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {item.badge && (
                    <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                      item.badgeColor === 'amber'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.aiTag && (
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-800 flex items-center space-x-0.5">
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>{item.aiTag}</span>
                    </span>
                  )}
                  {!isActive && <ChevronRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User Info + Logout */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          {currentUser.name && (
            <div className="flex items-center space-x-2 px-1">
              <UserCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-700 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400">{currentUser.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
