const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

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
            {formError && <div className="px-6 pt-4"><div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{formError}</div></div>}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setFormError('');
              try {
                const res = await fetch('/api/suppliers', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editSupplier)
                });
                if (res.ok) {
                  setIsEditModalOpen(false);
                  loadSuppliers();
                } else {
                  const data = await res.json().catch(()=>null);
                  setFormError(data?.error || "Failed to update supplier.");
                }
              } catch (e: any) { setFormError(e.message || "Failed to update supplier."); }
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
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editSupplier?.isActive !== false} onChange={(e) => setEditSupplier({...editSupplier, isActive: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span className="text-xs font-semibold text-slate-700">Supplier is Active</span>
                </label>
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

c = c.replace(/\{\/\* Modal \*\/\}/, editModal + '\n\n      {/* Modal */}');
fs.writeFileSync(p, c, 'utf8');
console.log('Successfully injected Edit Supplier Modal');
