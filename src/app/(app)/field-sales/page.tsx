"use client";

import React, { useState, useEffect } from 'react';
import { Search, MapPin, PackageOpen, Plus, Minus, ShoppingCart, Printer, ArrowRight, UserCircle2 } from 'lucide-react';

export default function FieldSalesMobile() {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'PRODUCTS' | 'CART'>('CUSTOMERS');
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [cart, setCart] = useState<{product: any, qty: number}[]>([]);

  useEffect(() => {
    fetch('/api/customers').then(res => res.json()).then(data => { if (data.success) setCustomers(data.customers); });
    fetch('/api/products').then(res => res.json()).then(data => { if (data.success) setProducts(data.products); });
  }, []);

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)));
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())));

  const addToCart = (product: any) => {
    setCart([...cart, { product, qty: 1 }]);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.product.sellingPrice) * item.qty), 0);

  return (
    <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden shadow-sm border border-slate-200 rounded-xl relative">
      
      {/* LEFT PANE: Customers & Products */}
      <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'CART' ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4 shadow-md z-10 shrink-0">
          <h1 className="font-black text-lg flex items-center gap-2 tracking-wide">
            <ShoppingCart className="h-5 w-5" />
            {activeTab === 'CUSTOMERS' ? 'Select Customer' : 'Product Catalog'}
          </h1>
          {selectedCustomer && (
            <div className="mt-3 bg-white/20 p-2 rounded-lg flex items-center justify-between backdrop-blur-sm">
              <span className="text-xs font-bold truncate pr-4">Order for: {selectedCustomer.name}</span>
              <button onClick={() => { setSelectedCustomer(null); setCart([]); setActiveTab('CUSTOMERS'); }} className="text-[10px] bg-white/20 hover:bg-white/40 px-2 py-1 rounded font-bold uppercase transition-colors">
                Change
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 relative pb-24 md:pb-4">
          
          {/* STEP 1: CUSTOMERS */}
          {(!selectedCustomer || activeTab === 'CUSTOMERS') && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search customers..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                    <UserCircle2 className="h-12 w-12 mx-auto mb-2" />
                    <p className="font-bold">No customers found</p>
                  </div>
                ) : (
                  filteredCustomers.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => { setSelectedCustomer(c); setActiveTab('PRODUCTS'); setSearch(''); }}
                      className="w-full text-left bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-indigo-400 flex items-center justify-between active:scale-[0.98] transition-transform"
                    >
                      <div>
                        <h3 className="font-bold text-slate-800">{c.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {c.address || 'No address'}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PRODUCTS CATALOG */}
          {selectedCustomer && activeTab === 'PRODUCTS' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search inventory..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(p => {
                  const inCart = cart.find(i => i.product.id === p.id);
                  return (
                    <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                      {p.stock <= 5 && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">Low Stock</div>}
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-2">{p.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">{p.category?.name || 'Item'}</p>
                        <p className="font-black text-indigo-700 text-sm mt-2">₹{Number(p.sellingPrice).toFixed(2)}</p>
                      </div>
                      <div className="mt-3">
                        {inCart ? (
                          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg p-1">
                            <button onClick={() => updateQty(p.id, -1)} className="p-1 text-indigo-600 active:bg-indigo-200 rounded"><Minus className="h-4 w-4" /></button>
                            <span className="font-bold text-sm text-indigo-900">{inCart.qty}</span>
                            <button onClick={() => updateQty(p.id, 1)} className="p-1 text-indigo-600 active:bg-indigo-200 rounded"><Plus className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(p)} className="w-full bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 py-2 rounded-lg text-xs font-bold transition-colors">
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Cart & Checkout (Always visible on desktop, tab-based on mobile) */}
      <div className={`w-full md:w-96 flex-col bg-white border-l border-slate-200 shrink-0 ${activeTab === 'CART' ? 'flex' : 'hidden md:flex'}`}>
        <div className="bg-slate-800 text-white p-4 shadow-md z-10 shrink-0">
          <h2 className="font-black text-lg flex items-center gap-2">
            <PackageOpen className="h-5 w-5" />
            Current Order
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 bg-slate-50/50">
          {cart.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <ShoppingCart className="h-16 w-16 mx-auto mb-2" />
              <p className="font-bold text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Select items from the catalog.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1 pr-2">
                    <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{item.product.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">₹{Number(item.product.sellingPrice).toFixed(2)} x {item.qty}</p>
                  </div>
                  <div className="font-black text-sm text-slate-800 text-right pr-4">
                    ₹{(Number(item.product.sellingPrice) * item.qty).toFixed(2)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => updateQty(item.product.id, 1)} className="bg-indigo-50 p-1 rounded text-indigo-600"><Plus className="h-3 w-3" /></button>
                    <button onClick={() => updateQty(item.product.id, -1)} className="bg-rose-50 p-1 rounded text-rose-600"><Minus className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Footer */}
        {cart.length > 0 && (
          <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-24 md:pb-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-500 uppercase">Total Bill</span>
              <span className="text-2xl font-black text-indigo-700">₹{cartTotal.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95 shadow-sm">
                <Printer className="h-5 w-5 mb-1" />
                <span className="text-[10px] uppercase tracking-wider">Spot Bill</span>
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95 shadow-sm">
                <ShoppingCart className="h-5 w-5 mb-1" />
                <span className="text-[10px] uppercase tracking-wider">Save Order</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav (Visible ONLY on mobile) */}
      <div className="md:hidden bg-white border-t border-slate-200 fixed bottom-0 left-0 w-full grid grid-cols-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <button 
          disabled={!selectedCustomer}
          onClick={() => setActiveTab('PRODUCTS')}
          className={`py-4 flex flex-col items-center justify-center gap-1 ${activeTab === 'PRODUCTS' ? 'text-indigo-600' : 'text-slate-400'} ${!selectedCustomer ? 'opacity-30' : ''}`}
        >
          <Search className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Catalog</span>
        </button>
        <button 
          disabled={!selectedCustomer}
          onClick={() => setActiveTab('CART')}
          className={`py-4 flex flex-col items-center justify-center gap-1 relative ${activeTab === 'CART' ? 'text-indigo-600' : 'text-slate-400'} ${!selectedCustomer ? 'opacity-30' : ''}`}
        >
          {cart.length > 0 && <span className="absolute top-2 right-[25%] bg-rose-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">{cart.length}</span>}
          <PackageOpen className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Cart</span>
        </button>
      </div>

    </div>
  );
}
