'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CarFront, 
  User, 
  Wrench, 
  Plus, 
  Trash2,
  Save,
  Search,
  Package,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import ProductSearchCombobox from '@/components/ProductSearchCombobox';
import CustomerSearch from '@/components/CustomerSearch';

export default function NewJobCard() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [labourServices, setLabourServices] = useState<any[]>([]);
  
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [customerConcerns, setCustomerConcerns] = useState('');
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [assignedMechanic, setAssignedMechanic] = useState('');
  const [items, setItems] = useState<any[]>([]);

  // Add Item State
  const [newItemType, setNewItemType] = useState<'PART' | 'LABOUR'>('PART');
  const [selectedProductId, setSelectedProductId] = useState('');

  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchVehicles(selectedCustomerId);
    } else {
      setVehicles([]);
      setSelectedVehicleId('');
    }
  }, [selectedCustomerId]);

  const fetchVehicles = async (customerId: string) => {
    try {
      const res = await fetch(`/api/vehicles?customerId=${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setInventory(data.products || data);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddItem = () => {
    if (newItemType === 'LABOUR' && !selectedProductId) return;
    if (newItemType === 'PART' && !selectedProductId) return;

    const selectedProduct = newItemType === 'PART' ? inventory.find(p => p.id === selectedProductId) : null;
    const selectedLabour = newItemType === 'LABOUR' ? labourServices.find(s => s.id === selectedProductId) : null;
    const name = newItemType === 'LABOUR' ? (selectedLabour?.name || 'Labour') : (selectedProduct?.name || `Part ID: ${selectedProductId}`);
    
    setItems([...items, {
      id: Date.now().toString(),
      itemType: newItemType,
      productId: newItemType === 'PART' ? selectedProductId : null,
      name,
      quantity: itemQty,
      unitPrice: itemPrice,
      lineTotal: itemQty * itemPrice
    }]);

    // Reset

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedCustomerId) return alert('Select Customer and Vehicle');

    setLoading(true);
    try {
      const res = await fetch('/api/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          vehicleId: selectedVehicleId,
          odometerReading,
          customerConcerns,
          mechanicNotes,
          assignedMechanic,
          items
        })
      });

      if (res.ok) {
        router.push('/garage');
      } else {
        const err = await res.json();
        alert(`Couldn't save the Job Card. Your stock was not changed.\nError: ${err.error || 'Unknown'}\n\nPlease try again.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Network Error: Couldn't connect to server. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/garage" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Open New Job Card</h1>
          <p className="text-sm text-slate-500">Register a new vehicle service workflow.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer & Vehicle */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="h-5 w-5 text-indigo-600" />
            1. Customer & Vehicle Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Search Customer</label>
              <CustomerSearch
                customerName={customerName}
                customerPhone={customerPhone}
                onSelectCustomer={(cust) => {
                  if (cust) {
                    setSelectedCustomerId(cust.id);
                    setCustomerName(cust.name);
                    setCustomerPhone(cust.phone);
                  } else {
                    setSelectedCustomerId('');
                    setCustomerName('');
                    setCustomerPhone('');
                  }
                }}
                onNameChange={setCustomerName}
                onPhoneChange={setCustomerPhone}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Vehicle</label>
              <select 
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-slate-50"
                required
                disabled={!selectedCustomerId}
              >
                <option value="">-- Choose Vehicle --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.licensePlate} ({v.make} {v.model})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Service Intake */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Wrench className="h-5 w-5 text-indigo-600" />
            2. Service Intake
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Odometer Reading (KM)</label>
              <input 
                type="number" 
                value={odometerReading}
                onChange={e => setOdometerReading(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-slate-50"
                placeholder="e.g. 45000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Mechanic</label>
              <input 
                type="text" 
                value={assignedMechanic}
                onChange={e => setAssignedMechanic(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-slate-50"
                placeholder="Mechanic Name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Concerns</label>
              <textarea 
                value={customerConcerns}
                onChange={e => setCustomerConcerns(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-slate-50"
                rows={2}
                placeholder="e.g. Brake noise, oil leak..."
              />
            </div>
          </div>
        </div>

        {/* Step 3: Parts & Labour */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Package className="h-5 w-5 text-indigo-600" />
            3. Estimated Parts & Labour
          </h3>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex gap-4">
              <div className="w-32">
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <select 
                  value={newItemType}
                  onChange={(e: any) => setNewItemType(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="PART">Part</option>
                  <option value="LABOUR">Labour</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Part</label>
                {newItemType === 'LABOUR' ? (
                  <select
                      value={selectedProductId}
                      onChange={e => {
                        setSelectedProductId(e.target.value);
                        const s = labourServices.find(l => l.id === e.target.value);
                        if (s) setItemPrice(Number(s.fixedRate || s.hourlyRate || 0));
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    >
                      <option value="">Select Service...</option>
                      {labourServices.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (₹{s.fixedRate || s.hourlyRate || 0})</option>
                      ))}
                    </select>
                ) : (
                  <ProductSearchCombobox
                    /* Use server-side search automatically since products prop is omitted */
                    selectedProductId={selectedProductId}
                    onSelect={(prod) => {
                      if (prod) {
                        setSelectedProductId(prod.id);
                        setItemPrice(prod.sellingPrice);
                      } else {
                        setSelectedProductId('');
                        setItemPrice(0);
                      }
                    }}
                    placeholder="Search Part by Name, SKU..."
                  />
                )}
              </div>

              <div className="w-24">
                <label className="block text-xs font-bold text-slate-700 mb-1">Qty</label>
                <input 
                  type="number" 
                  value={itemQty}
                  onChange={e => setItemQty(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  min="1"
                />
              </div>

              <div className="w-32">
                <label className="block text-xs font-bold text-slate-700 mb-1">Rate (₹)</label>
                <input 
                  type="number" 
                  value={itemPrice}
                  onChange={e => setItemPrice(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  min="0"
                />
              </div>

              <div className="flex items-end">
                <button 
                  type="button"
                  onClick={handleAddItem}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          item.itemType === 'LABOUR' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.itemType}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-900">{item.name}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">₹{item.lineTotal.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleRemoveItem(item.id)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-8 py-3 rounded-xl font-black text-sm transition flex items-center gap-2 shadow-lg"
          >
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {loading ? 'Saving...' : 'Open Job Card'}
          </button>
        </div>
      </form>
    </div>
  );
}






