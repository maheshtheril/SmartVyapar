'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  description?: string;
  imageUrl?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export default function PublicOrderPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tableId = params?.tableId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<{ businessName: string; logoUrl?: string } | null>(null);
  const [table, setTable] = useState<{ id: string; name: string; section: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccessKot, setOrderSuccessKot] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !tableId) return;

    fetch(`/api/public/menu?slug=${encodeURIComponent(slug)}&tableId=${encodeURIComponent(tableId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error || 'Failed to load restaurant menu');
        } else {
          setTenant(data.tenant);
          setTable(data.table);
          setProducts(data.products || []);
          if (data.tenant?.businessName) {
            document.title = `Menu • ${data.tenant.businessName}`;
          }
        }
      })
      .catch((err) => {
        setError('Network error loading menu');
      })
      .finally(() => setLoading(false));
  }, [slug, tableId]);

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filteredProducts = selectedCategory === 'ALL'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const updateQuantity = (product: Product, delta: number) => {
    setCart((prev) => {
      const existing = prev[product.id];
      const newQty = (existing?.quantity || 0) + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: newQty,
          notes: existing?.notes || '',
        },
      };
    });
  };

  const updateNotes = (productId: string, notes: string) => {
    setCart((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          notes,
        },
      };
    });
  };

  const cartItemsList = Object.values(cart);
  const totalItemCount = cartItemsList.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cartItemsList.reduce((sum, item) => sum + item.quantity * item.product.sellingPrice, 0);

  const handlePlaceOrder = async () => {
    if (cartItemsList.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/public/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          tableId,
          customerName: customerName.trim() || undefined,
          items: cartItemsList.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            notes: item.notes.trim() || undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to place order');
      }

      setOrderSuccessKot(data.kotNumber);
      setCart({});
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="text-3xl animate-bounce">🍽️</div>
          <p className="text-xs font-bold text-slate-500">Loading digital menu...</p>
        </div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 max-w-sm w-full text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-base font-black text-slate-900">Unable to Open Menu</h2>
          <p className="text-xs text-rose-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.businessName} className="h-9 w-9 rounded-xl object-contain border border-slate-100" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg font-black shadow-xs">
                🍛
              </div>
            )}
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">{tenant?.businessName}</h1>
              <p className="text-[10px] font-bold text-emerald-600">Table: {table?.name} ({table?.section})</p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100">
            Self-Order
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Success Modal / Banner */}
        {orderSuccessKot && (
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 text-center space-y-2 animate-in fade-in">
            <div className="text-3xl">🎉</div>
            <h2 className="text-base font-black text-emerald-950">Order Sent to Kitchen!</h2>
            <p className="text-xs text-emerald-800 font-semibold">
              KOT Ticket: <span className="font-mono font-black text-emerald-900 bg-emerald-200 px-1.5 py-0.5 rounded">{orderSuccessKot}</span>
            </p>
            <p className="text-[11px] text-emerald-700">
              The chefs are preparing your food. You can order more items anytime!
            </p>
            <button
              onClick={() => setOrderSuccessKot(null)}
              className="mt-2 text-xs font-bold text-emerald-700 underline"
            >
              Order more items
            </button>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat === 'ALL' ? '🍽️ All Dishes' : cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="space-y-2.5">
          {filteredProducts.map((p) => {
            const inCart = cart[p.id];
            const qty = inCart?.quantity || 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-xs text-slate-900 truncate">{p.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">{p.category}</p>
                  <div className="text-xs font-extrabold text-slate-900 mt-1">₹{p.sellingPrice.toFixed(2)}</div>
                </div>

                {/* Add / Qty Control */}
                <div className="shrink-0">
                  {qty === 0 ? (
                    <button
                      onClick={() => updateQuantity(p, 1)}
                      className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 px-3 py-1.5 text-xs font-black shadow-2xs transition"
                    >
                      + Add
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-slate-900 text-white rounded-xl p-1 shadow-xs">
                      <button
                        onClick={() => updateQuantity(p, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 text-white text-xs font-black flex items-center justify-center hover:bg-slate-700"
                      >
                        -
                      </button>
                      <span className="text-xs font-black px-1">{qty}</span>
                      <button
                        onClick={() => updateQuantity(p, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 text-white text-xs font-black flex items-center justify-center hover:bg-slate-700"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Sticky Bottom Cart Bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3.5 shadow-xl">
          <div className="max-w-md mx-auto space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in order
              </span>
              <span className="font-black text-sm text-slate-900">
                ₹{totalCartAmount.toFixed(2)}
              </span>
            </div>

            {error && (
              <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Your Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                disabled={submitting}
                onClick={handlePlaceOrder}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-5 py-2 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {submitting ? 'Sending...' : '🔥 Send to Kitchen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
