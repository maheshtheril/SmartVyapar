"use client";
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Users, Search, MapPin, Printer, Share2, Plus, Minus, ArrowRight, PackageOpen } from 'lucide-react';

export default function FieldSalesApp() {
  const [activeTab, setActiveTab] = useState<'SELECT_CUSTOMER' | 'PRODUCTS' | 'CART'>('SELECT_CUSTOMER');
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [selectedBeat, setSelectedBeat] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{product: any, qty: number}[]>([]);
  const [search, setSearch] = useState('');

  // Load Initial Data
  useEffect(() => {
    fetch('/api/territories/hierarchy')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setHierarchy(d.regions || []);
          // Flatten beats
          const allBeats = d.regions?.flatMap((r: any) => 
            r.zones?.flatMap((z: any) => 
              z.territories?.flatMap((t: any) => 
                t.beats?.map((b: any) => ({ ...b, routeName: \`\${b.name} (\${t.name})\` }))
              )
            )
          ) || [];
          setBeats(allBeats);
        }
      });
      
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.products || []) });
      
    fetch('/api/customers')
      .then(r => r.json())
      .then(d => { if (d.success) setCustomers(d.customers || []) });
  }, []);

  const filteredCustomers = customers.filter(c => selectedBeat ? c.beatId === selectedBeat : true);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (product: any) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === id) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : i;
      }
      return i;
    }).filter(i => i.qty > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.product.sellingPrice) * item.qty), 0);

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-[85vh] border-x border-slate-200 shadow-sm relative flex flex-col">
      {/* Mobile Header */}
      <div className="bg-indigo-600 text-white p-4 shadow-md z-10 sticky top-0">
        <h1 className="font-black text-lg flex items-center gap-2 tracking-wide">
          <ShoppingCart className="h-5 w-5" /> Field Sales Mobile
        </h1>
        {selectedCustomer && (
          <div className="mt-2 text-xs font-medium bg-indigo-700/50 p-2 rounded-lg flex items-center justify-between">
            <span className="truncate pr-2">Cart for: <b>{selectedCustomer.name}</b></span>
            <button onClick={() => { setSelectedCustomer(null); setActiveTab('SELECT_CUSTOMER'); }} className="underline shrink-0">Change</button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        
        {/* STEP 1: SELECT CUSTOMER */}
        {activeTab === 'SELECT_CUSTOMER' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">1. Filter by Beat (Route)</label>
              <select 
                value={selectedBeat} 
                onChange={e => setSelectedBeat(e.target.value)}
                className="w-full mt-1 border-2 border-indigo-200 rounded-xl p-3 text-sm font-semibold text-slate-800 bg-white"
              >
                <option value="">-- Show All Beats --</option>
                {beats.map(b => <option key={b.id} value={b.id}>{b.routeName}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">2. Tap a Customer</label>
              <div className="mt-1 space-y-2">
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-slate-400 p-4 text-center border-2 border-dashed rounded-xl">No customers found on this beat.</p>
                ) : (
                  filteredCustomers.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => { setSelectedCustomer(c); setActiveTab('PRODUCTS'); }}
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
          </div>
        )}

        {/* STEP 2: PRODUCTS CATALOG */}
        {activeTab === 'PRODUCTS' && (
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

            <div className="grid grid-cols-2 gap-3">
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

        {/* STEP 3: CART / CHECKOUT */}
        {activeTab === 'CART' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            {cart.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <PackageOpen className="h-16 w-16 mx-auto mb-2" />
                <p className="font-bold">Cart is empty</p>
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
            
            {cart.length > 0 && (
              <div className="bg-slate-800 text-white rounded-xl p-4 shadow-lg mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-slate-300">Total Bill Value</span>
                  <span className="text-xl font-black">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg flex flex-col items-center justify-center transition-transform active:scale-95">
                    <Printer className="h-5 w-5 mb-1" />
                    <span className="text-[10px] uppercase">Spot Bill</span>
                  </button>
                  <button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-lg flex flex-col items-center justify-center transition-transform active:scale-95">
                    <ShoppingCart className="h-5 w-5 mb-1" />
                    <span className="text-[10px] uppercase">Save Order</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Mobile Bottom Nav */}
      <div className="bg-white border-t border-slate-200 fixed bottom-0 w-full max-w-md mx-auto grid grid-cols-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <button 
          disabled={!selectedCustomer}
          onClick={() => setActiveTab('PRODUCTS')}
          className={\`py-4 flex flex-col items-center justify-center gap-1 \${activeTab === 'PRODUCTS' ? 'text-indigo-600' : 'text-slate-400'} \${!selectedCustomer ? 'opacity-30' : ''}\`}
        >
          <Search className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Catalog</span>
        </button>
        <button 
          disabled={!selectedCustomer}
          onClick={() => setActiveTab('CART')}
          className={\`py-4 flex flex-col items-center justify-center gap-1 relative \${activeTab === 'CART' ? 'text-indigo-600' : 'text-slate-400'} \${!selectedCustomer ? 'opacity-30' : ''}\`}
        >
          {cart.length > 0 && <span className="absolute top-2 right-8 bg-rose-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">{cart.length}</span>}
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Checkout</span>
        </button>
      </div>

    </div>
  );
}
