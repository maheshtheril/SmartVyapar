const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

const importIcons = `import { Plus, Search, Building2, Phone, X, Edit2, Trash2 } from 'lucide-react';`;
c = c.replace(/import \{ Plus, Search, Building2, Phone, X \} from 'lucide-react';/, importIcons);

// Add Edit State
c = c.replace(/const \[isModalOpen, setIsModalOpen\] = useState\(false\);/, `const [isModalOpen, setIsModalOpen] = useState(false);\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false);\n  const [editSupplier, setEditSupplier] = useState<any>(null);`);

// UI Table Header
c = c.replace(/<th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Address<\/th>/, 
  `<th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Address</th>\n                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>`);

// UI Table Row Actions
c = c.replace(/<td className="px-4 py-3 text-sm text-slate-600">\{s.address\}<\/td>\n\s*<\/tr>/g, 
  `<td className="px-4 py-3 text-sm text-slate-600">{s.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditSupplier(s); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={async () => { if(window.confirm('Delete supplier?')) { await fetch('/api/suppliers?id='+s.id, {method:'DELETE'}); fetchSuppliers(); } }} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>`);

// Edit Modal UI
const editModal = `
      {/* EDIT SUPPLIER MODAL */}
      {isEditModalOpen && editSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Edit Supplier</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/suppliers', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editSupplier)
                });
                if (res.ok) {
                  setIsEditModalOpen(false);
                  fetchSuppliers();
                }
              } catch (e) {}
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input required type="text" value={editSupplier.name || ''} onChange={(e) => setEditSupplier({...editSupplier, name: e.target.value})} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                <input type="text" value={editSupplier.gstin || ''} onChange={(e) => setEditSupplier({...editSupplier, gstin: e.target.value})} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input type="text" value={editSupplier.phone || ''} onChange={(e) => setEditSupplier({...editSupplier, phone: e.target.value})} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

c = c.replace(/\{\/\* ADD SUPPLIER MODAL \*\/\}/, editModal + '\n\n      {/* ADD SUPPLIER MODAL */}');

fs.writeFileSync(p, c, 'utf8');
console.log('Suppliers UI updated with edit modal');
