'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Receipt,
  Package,
  Users,
  CreditCard,
  Building2,
  Settings,
  Sparkles,
  Truck,
  Printer,
  FileCode,
  RotateCcw,
  Boxes,
  ChefHat,
  Grid,
  Tag,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  CornerDownLeft,
  X,
  PlusCircle,
  Landmark,
  Layers,
  HelpCircle,
  FileCheck,
  Scale,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'ACTIONS' | 'MODULES' | 'INVENTORY' | 'SETTINGS';
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  badge?: string;
  badgeColor?: 'indigo' | 'emerald' | 'amber' | 'violet';
}

const PALETTE_ITEMS: PaletteItem[] = [
  // ⚡ QUICK ACTIONS
  {
    id: 'act-new-invoice',
    title: 'Create New Tax Invoice / POS Bill',
    subtitle: 'Generate GST tax invoice or quick retail POS bill',
    category: 'ACTIONS',
    href: '/billing/new',
    icon: PlusCircle,
    keywords: ['new', 'create', 'bill', 'pos', 'invoice', 'sale', 'counter', 'quick'],
    badge: 'Fast Bill',
    badgeColor: 'emerald',
  },
  {
    id: 'act-new-voucher',
    title: 'Record Accounting Voucher (PV / RV / CV / JV)',
    subtitle: 'Payment, receipt, contra transfer, or journal entry with double-entry math',
    category: 'ACTIONS',
    href: '/accounting/vouchers',
    icon: FileCheck,
    keywords: ['voucher', 'payment', 'receipt', 'contra', 'journal', 'pv', 'rv', 'cv', 'jv', 'expense', 'debit', 'credit'],
    badge: 'Double-Entry',
    badgeColor: 'indigo',
  },
  {
    id: 'act-upgrade-pro',
    title: 'Upgrade to SmartVyapar Pro (Razorpay)',
    subtitle: 'Unlock unlimited invoices, multi-warehouse, and e-invoicing',
    category: 'ACTIONS',
    href: '/settings?tab=billing',
    icon: Zap,
    keywords: ['upgrade', 'pro', 'plan', 'billing', 'subscription', 'razorpay', 'pricing', 'pay'],
    badge: 'Pro Tier',
    badgeColor: 'amber',
  },
  {
    id: 'act-new-transfer',
    title: 'New Inter-Warehouse Stock Transfer',
    subtitle: 'Dispatch goods to another warehouse or store branch',
    category: 'ACTIONS',
    href: '/inventory/transfers',
    icon: Truck,
    keywords: ['transfer', 'warehouse', 'dispatch', 'challan', 'transit', 'stock', 'store'],
    badge: 'Multi-Store',
    badgeColor: 'indigo',
  },
  {
    id: 'act-ai-scan',
    title: 'Scan Supplier Purchase Bill with AI',
    subtitle: 'Extract line items and taxes automatically via Gemini Vision',
    category: 'ACTIONS',
    href: '/scanner',
    icon: Sparkles,
    keywords: ['scan', 'ai', 'gemini', 'ocr', 'purchase', 'bill', 'camera', 'upload'],
    badge: 'AI Vision',
    badgeColor: 'violet',
  },

  // 🧭 CORE MODULES
  {
    id: 'mod-invoices',
    title: 'Tax Invoices & E-Invoicing (IRN)',
    subtitle: 'View sales history, print thermal slips, and generate IRN QR',
    category: 'MODULES',
    href: '/invoices',
    icon: Receipt,
    keywords: ['invoices', 'history', 'sales', 'gst', 'irn', 'e-invoice', 'receipt', 'thermal'],
  },
  {
    id: 'mod-inventory',
    title: 'Product Catalog & Current Stock',
    subtitle: 'Item list, HSN codes, cost, selling price, and stock levels',
    category: 'MODULES',
    href: '/inventory',
    icon: Package,
    keywords: ['inventory', 'products', 'items', 'catalog', 'stock', 'hsn', 'mrp', 'price'],
  },
  {
    id: 'mod-customers',
    title: 'Parties, Customers & Khata Ledger',
    subtitle: 'Customer directory, credit balances, and UPI payment requests',
    category: 'MODULES',
    href: '/customers',
    icon: Users,
    keywords: ['customers', 'parties', 'khata', 'ledger', 'balance', 'dues', 'credit', 'phone'],
  },
  {
    id: 'mod-gstr1',
    title: 'GSTR-1 Tax Export Portal JSON',
    subtitle: 'Download government-ready GSTR-1 JSON for GSTN portal upload',
    category: 'MODULES',
    href: '/invoices',
    icon: FileCode,
    keywords: ['gstr1', 'gst', 'tax', 'returns', 'government', 'json', 'export', 'compliance'],
  },
  {
    id: 'mod-coa',
    title: 'Chart of Accounts & Accounting Ledgers',
    subtitle: 'Double-entry statutory ledgers, asset, liability & income accounts',
    category: 'MODULES',
    href: '/accounting/chart-of-accounts',
    icon: Landmark,
    keywords: ['accounting', 'chart of accounts', 'coa', 'ledger', 'assets', 'liabilities'],
  },
  {
    id: 'mod-vouchers',
    title: 'Accounting Vouchers & Journals',
    subtitle: 'Payment, Receipt, Contra, and Journal entries with automatic ledger posting',
    category: 'MODULES',
    href: '/accounting/vouchers',
    icon: FileCheck,
    keywords: ['vouchers', 'payment', 'receipt', 'contra', 'journal', 'pv', 'rv', 'cv', 'jv', 'debit', 'credit', 'ledger'],
    badge: 'Double-Entry',
    badgeColor: 'indigo',
  },
  {
    id: 'mod-financial-reports',
    title: 'Financial Statements (Trial Balance, P&L, Balance Sheet)',
    subtitle: 'Statutory double-entry reports, trading profit, balance sheet & ledger statements',
    category: 'MODULES',
    href: '/accounting/reports',
    icon: Scale,
    keywords: ['reports', 'financial', 'p&l', 'profit', 'loss', 'balance sheet', 'trial balance', 'ledger', 'statements'],
    badge: 'Statements',
    badgeColor: 'emerald',
  },

  // 📦 INVENTORY & LOGISTICS
  {
    id: 'inv-transfers',
    title: 'Warehouses & Inter-Branch Transfers',
    subtitle: 'Manage godowns, transit status, and print Delivery Challans',
    category: 'INVENTORY',
    href: '/inventory/transfers',
    icon: Truck,
    keywords: ['warehouses', 'godown', 'transfers', 'challan', 'dispatch', 'racks', 'transit'],
    badge: 'Multi-Store',
    badgeColor: 'indigo',
  },
  {
    id: 'inv-batches',
    title: 'Batches & Expiry Management (FIFO)',
    subtitle: 'Batch numbers, manufacturing dates, and expiry tracking',
    category: 'INVENTORY',
    href: '/inventory/batches',
    icon: Boxes,
    keywords: ['batch', 'expiry', 'fifo', 'mfg', 'lot', 'expiration', 'pharmacy', 'food'],
  },
  {
    id: 'inv-barcodes',
    title: 'Barcode Label Generator',
    subtitle: 'Generate and print EAN-13 and Code-128 sticker labels',
    category: 'INVENTORY',
    href: '/inventory/barcode-generator',
    icon: Tag,
    keywords: ['barcode', 'labels', 'stickers', 'ean', 'code128', 'print', 'sku'],
  },
  {
    id: 'inv-variants',
    title: 'Product Variant Matrix',
    subtitle: 'Manage parent-child items by Size, Color, and Attributes',
    category: 'INVENTORY',
    href: '/inventory/variants',
    icon: Grid,
    keywords: ['variants', 'matrix', 'size', 'color', 'apparel', 'options', 'attributes'],
  },
  {
    id: 'inv-recipes',
    title: 'Recipes & Bill of Materials (BOM)',
    subtitle: 'Automated ingredient depletion for kitchens and manufacturing',
    category: 'INVENTORY',
    href: '/inventory/recipes',
    icon: ChefHat,
    keywords: ['recipes', 'bom', 'ingredients', 'kitchen', 'restaurant', 'depletion', 'food'],
  },

  // ⚙️ SETTINGS & ADMINISTRATION
  {
    id: 'set-billing',
    title: 'Plans & Billing (Razorpay Subscriptions)',
    subtitle: 'View quota limits, manage Pro tier, and invoice payment receipts',
    category: 'SETTINGS',
    href: '/settings?tab=billing',
    icon: CreditCard,
    keywords: ['plans', 'billing', 'subscription', 'razorpay', 'pro', 'upgrade', 'payment', 'invoices'],
    badge: 'PRO',
    badgeColor: 'indigo',
  },
  {
    id: 'set-profile',
    title: 'Company Profile & Business Logo',
    subtitle: 'GSTIN, business trade name, address, contact, and UPI VPA ID',
    category: 'SETTINGS',
    href: '/settings?tab=profile',
    icon: Building2,
    keywords: ['profile', 'company', 'logo', 'gstin', 'address', 'upi', 'phone', 'business'],
  },
  {
    id: 'set-whatsapp',
    title: 'WhatsApp Bot & SMS Gateway Studio',
    subtitle: 'Two-way automated customer bot, webhook URL, and chat simulator',
    category: 'SETTINGS',
    href: '/settings?tab=messaging',
    icon: MessageSquare,
    keywords: ['whatsapp', 'bot', 'sms', 'messaging', 'webhook', 'meta', 'simulator', 'gateway'],
  },
  {
    id: 'set-team',
    title: 'Team Members & Staff Permissions (RBAC)',
    subtitle: 'Manage user logins, Owner / Manager / Staff roles and security',
    category: 'SETTINGS',
    href: '/settings?tab=users',
    icon: ShieldCheck,
    keywords: ['team', 'users', 'staff', 'manager', 'owner', 'rbac', 'permissions', 'roles'],
  },
  {
    id: 'set-print',
    title: 'Print Configuration Studio',
    subtitle: 'Customize 2-inch & 3-inch thermal receipts, A4 headers, and logos',
    category: 'SETTINGS',
    href: '/settings/print',
    icon: Printer,
    keywords: ['print', 'thermal', 'receipt', 'template', 'studio', 'a4', 'header', 'printer'],
  },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Listeners: Ctrl+K, Cmd+K, or Custom Event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // Close on Escape
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter items matching query
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return PALETTE_ITEMS;

    return PALETTE_ITEMS.filter((item) => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.subtitle && item.subtitle.toLowerCase().includes(q)) return true;
      if (item.category.toLowerCase().includes(q)) return true;
      return item.keywords.some((k) => k.toLowerCase().includes(q));
    });
  }, [query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Navigate to selected item
  const handleSelect = (item: PaletteItem) => {
    setOpen(false);
    router.push(item.href);
  };

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-16 sm:pt-24 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Palette Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] z-10">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <Search className="h-5 w-5 text-indigo-600 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a menu, action, or keyword (e.g. 'billing', 'transfer', 'gst')..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 mr-2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 divide-y divide-slate-100 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No matching menus or actions</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for &quot;billing&quot;, &quot;invoices&quot;, &quot;warehouse&quot;, or &quot;whatsapp&quot;
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  data-active={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                              isSelected
                                ? 'bg-white text-indigo-700'
                                : item.badgeColor === 'amber'
                                ? 'bg-amber-100 text-amber-800'
                                : item.badgeColor === 'emerald'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.badgeColor === 'violet'
                                ? 'bg-violet-100 text-violet-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    {isSelected && (
                      <span className="hidden sm:flex items-center text-[10px] text-indigo-200 font-semibold space-x-1">
                        <span>Press</span>
                        <kbd className="bg-white/20 px-1 py-0.5 rounded text-white font-mono">↵</kbd>
                      </span>
                    )}
                    <ArrowRight
                      className={`h-4 w-4 ${
                        isSelected ? 'text-white' : 'text-slate-300 group-hover:text-slate-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">↵</kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">ESC</kbd>
              <span>to close</span>
            </span>
          </div>

          <span className="text-[10px] font-semibold text-slate-400">
            SmartVyapar Omnisearch
          </span>
        </div>
      </div>
    </div>
  );
}
