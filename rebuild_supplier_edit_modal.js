const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Replace the entire Edit Modal
const correctEditModal = `
      {/* Modal */}
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
              setSubmitting(true);
              setFormError('');
              try {
                const res = await fetch('/api/suppliers', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editSupplier)
                });
                
                const data = await res.json().catch(()=>null);
                
                if (res.ok && data?.success) {
                  setIsEditModalOpen(false);
                  loadSuppliers();
                } else {
                  setFormError(data?.error || "Failed to update supplier.");
                }
              } catch (err: any) { 
                setFormError(err.message || "Network error. Failed to update supplier."); 
              } finally {
                setSubmitting(false);
              }
            }} className="p-6 space-y-4">
              {formError && <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input required type="text" value={editSupplier.name || ''} onChange={(e) => setEditSupplier({...editSupplier, name: e.target.value})} placeholder="e.g. Acme Corp" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                <input type="text" value={editSupplier.gstin || ''} onChange={(e) => setEditSupplier({...editSupplier, gstin: e.target.value.toUpperCase()})} placeholder="e.g. 29AAACB2021A1Z8" className="w-full font-mono text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input type="text" value={editSupplier.phone || ''} onChange={(e) => setEditSupplier({...editSupplier, phone: e.target.value})} placeholder="Phone number" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" value={editSupplier.email || ''} onChange={(e) => setEditSupplier({...editSupplier, email: e.target.value})} placeholder="Email address" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
                <textarea rows={3} value={editSupplier.address || ''} onChange={(e) => setEditSupplier({...editSupplier, address: e.target.value})} placeholder="Full street address..." className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"></textarea>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editSupplier?.isActive !== false} onChange={(e) => setEditSupplier({...editSupplier, isActive: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span className="text-xs font-semibold text-slate-700">Supplier Account is Active</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1 pl-6">Uncheck this to archive the vendor and hide them from active dropdowns.</p>
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

c = c.replace(/\{\/\* EDIT SUPPLIER MODAL \*\/\}[\s\S]*?\{\/\* Modal \*\/\}/, correctEditModal.trim() + '\n\n      {/* Modal */}');
fs.writeFileSync(p, c, 'utf8');
console.log('Completely rebuilt Edit Supplier Modal');
