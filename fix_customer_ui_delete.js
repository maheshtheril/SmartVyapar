const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Ensure Edit2 and Trash2 are imported
if (!c.includes('Edit2')) {
  c = c.replace(/import \{ Users, Search, Plus, Upload, Download, FileText, CheckCircle2, AlertCircle, Map, ChevronRight, MapPin \} from 'lucide-react';/, 
                "import { Users, Search, Plus, Upload, Download, FileText, CheckCircle2, AlertCircle, Map, ChevronRight, MapPin, Edit2, Trash2 } from 'lucide-react';");
}

// Add state for Edit Customer
if (!c.includes('const [isEditModalOpen')) {
  c = c.replace(/const \[isAddModalOpen, setIsAddModalOpen\] = useState\(false\);/, 
    "const [isAddModalOpen, setIsAddModalOpen] = useState(false);\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false);\n  const [editCustomer, setEditCustomer] = useState<any>(null);\n  const [editSubmitting, setEditSubmitting] = useState(false);\n  const [editError, setEditError] = useState('');");
}

// Inject Edit/Delete buttons into Actions column
c = c.replace(/\{\/\* View Invoices \*\/\}/g, 
`{/* Edit / Delete Buttons */}
<button onClick={() => { setEditCustomer(c); setEditError(''); setIsEditModalOpen(true); }} className="p-1 text-slate-400 hover:text-indigo-600 transition" title="Edit Customer"><Edit2 className="h-4 w-4" /></button>
<button onClick={async () => {
  if(window.confirm('Delete customer?')) {
    const res = await fetch('/api/customers?id='+c.id, {method:'DELETE'});
    const data = await res.json().catch(()=>null);
    if(!res.ok || (data && !data.success)) {
      alert(data?.error || "Failed to delete customer.");
    } else {
      fetchCustomers();
    }
  }
}} className="p-1 text-slate-400 hover:text-rose-600 transition mr-2" title="Delete Customer"><Trash2 className="h-4 w-4" /></button>

                            {/* View Invoices */}`);

// Add Inactive Badge next to Name
c = c.replace(/<div className="font-bold text-slate-900">\{c\.name\}<\/div>/g, 
  `<div className="flex items-center gap-2">
    <div className="font-bold text-slate-900">{c.name}</div>
    {c.isActive === false && <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-rose-100 text-rose-700 rounded border border-rose-200">Inactive</span>}
  </div>`);

// Complete Edit Modal Injection
const editModal = `
      {/* EDIT CUSTOMER MODAL */}
      {isEditModalOpen && editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-black text-slate-800">Edit Customer</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setEditSubmitting(true);
              setEditError('');
              try {
                const res = await fetch('/api/customers', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editCustomer)
                });
                const data = await res.json().catch(()=>null);
                if (res.ok && data?.success) {
                  setIsEditModalOpen(false);
                  fetchCustomers();
                } else {
                  setEditError(data?.error || "Failed to update customer.");
                }
              } catch (e: any) { setEditError(e.message || "Failed to update customer."); }
              finally { setEditSubmitting(false); }
            }} className="p-4 overflow-y-auto space-y-4">
              
              {editError && <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{editError}</div>}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Full Name *</label>
                  <input required type="text" value={editCustomer.name || ''} onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Mobile Number</label>
                    <input type="text" value={editCustomer.phone || ''} onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">GSTIN</label>
                    <input type="text" value={editCustomer.gstin || ''} onChange={(e) => setEditCustomer({...editCustomer, gstin: e.target.value.toUpperCase()})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Email</label>
                  <input type="email" value={editCustomer.email || ''} onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Address</label>
                  <input type="text" value={editCustomer.address || ''} onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editCustomer?.isActive !== false} onChange={(e) => setEditCustomer({...editCustomer, isActive: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span className="text-xs font-semibold text-slate-700">Customer Account is Active</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1 pl-6">Uncheck this to archive the customer and hide them from selection dropdowns.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold transition">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50">
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

// Only replace if not already replaced previously, to be safe
if (!c.includes('EDIT CUSTOMER MODAL')) {
  c = c.replace(/\{\/\* ADD CUSTOMER MODAL \*\/\}/, editModal + '\n\n      {/* ADD CUSTOMER MODAL */}');
}

fs.writeFileSync(p, c, 'utf8');
console.log('Successfully injected Edit Customer Modal and buttons');
