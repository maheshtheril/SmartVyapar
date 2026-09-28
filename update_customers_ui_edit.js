const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

const importIcons = `import { Users, Search, Plus, Upload, Download, FileText, CheckCircle2, AlertCircle, Map, ChevronRight, MapPin, Edit2, Trash2 } from 'lucide-react';`;
c = c.replace(/import \{ Users, Search, Plus, Upload, Download, FileText, CheckCircle2, AlertCircle, Map, ChevronRight, MapPin \} from 'lucide-react';/, importIcons);

// Add Edit State
c = c.replace(/const \[isAddModalOpen, setIsAddModalOpen\] = useState\(false\);/, `const [isAddModalOpen, setIsAddModalOpen] = useState(false);\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false);\n  const [editCustomer, setEditCustomer] = useState<any>(null);`);

// UI Table Row Actions
c = c.replace(/<button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition flex items-center gap-1">\s*Bills >\s*<\/button>/g, 
  `<div className="flex items-center gap-2">
                            <button onClick={() => { setEditCustomer(c); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={async () => { if(window.confirm('Delete customer?')) { await fetch('/api/customers?id='+c.id, {method:'DELETE'}); fetchCustomers(); } }} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 className="h-4 w-4" /></button>
                            <button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold ml-2">Bills ></button>
                          </div>`);

// Edit Modal UI
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
              try {
                const res = await fetch('/api/customers', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editCustomer)
                });
                if (res.ok) {
                  setIsEditModalOpen(false);
                  fetchCustomers();
                }
              } catch (e) {}
            }} className="p-4 overflow-y-auto space-y-4">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Full Name *</label>
                  <input required type="text" value={editCustomer.name || ''} onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Mobile Number</label>
                  <input type="text" value={editCustomer.phone || ''} onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Address</label>
                  <input type="text" value={editCustomer.address || ''} onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold transition">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

c = c.replace(/\{\/\* ADD CUSTOMER MODAL \*\/\}/, editModal + '\n\n      {/* ADD CUSTOMER MODAL */}');

fs.writeFileSync(p, c, 'utf8');
console.log('Customers UI updated with edit modal');
