const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Fix the Duplicate Buttons in the Table
// We will replace the entire <td className="px-4 py-3">...</td> for the actions column.
const cleanActionsColumn = `
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* Record Payment */}
                            {isOverdue && (
                              <button
                                onClick={() => openPayModal(c)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                                title="Record Receivables Payment"
                              >
                                <IndianRupee className="h-3 w-3" />
                                Collect
                              </button>
                            )}
                            {/* WhatsApp Reminder */}
                            {isOverdue && (
                              <a
                                href={buildWhatsApp(c)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold transition"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageSquare className="h-3 w-3" />
                                Remind
                              </a>
                            )}
                            
                            {/* Edit / Delete Buttons */}
                            <button onClick={() => { 
                                setEditCustomer({...c}); 
                                setEditError(''); 
                                setIsEditModalOpen(true); 
                            }} className="p-1 text-slate-400 hover:text-indigo-600 transition" title="Edit Customer"><Edit2 className="h-4 w-4" /></button>
                            
                            <button onClick={async () => {
                              if(window.confirm('Delete customer?')) {
                                const res = await fetch('/api/customers?id='+c.id, {method:'DELETE'});
                                const data = await res.json().catch(()=>null);
                                if(!res.ok || (data && !data.success)) {
                                  alert(data?.error || "Failed to delete customer.");
                                } else {
                                  load();
                                }
                              }
                            }} className="p-1 text-slate-400 hover:text-rose-600 transition" title="Delete Customer"><Trash2 className="h-4 w-4" /></button>
                            
                            {/* View Invoices */}
                            <Link
                              href={\`/invoices?q=\${encodeURIComponent(c.phone)}\`}
                              className="inline-flex items-center gap-0.5 text-slate-400 hover:text-indigo-600 text-[11px] font-bold transition ml-1"
                              title="View All Invoices"
                            >
                              Bills
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </td>`;

// Replace from `<td className="px-4 py-3">` down to `</td>` that contains the actions.
c = c.replace(/<td className="px-4 py-3">\s*<div className="flex items-center justify-center gap-2">[\s\S]*?<\/td>/, cleanActionsColumn.trim());


// 2. Fix the Edit Modal to include hierarchical fields
const advancedEditModal = `
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
                  load();
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

                {territoryEnabled && (
                  <div className="pt-2 border-t border-slate-100 space-y-2 mt-2">
                    <h3 className="text-xs font-bold text-indigo-900 mb-2">FMCG Distribution Routing</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Region</label>
                        <select
                          value={editCustomer.regionId || ''}
                          onChange={(e) => setEditCustomer({...editCustomer, regionId: e.target.value, zoneId: '', territoryId: '', beatId: ''})}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                        >
                          <option value="">-- Any Region --</option>
                          {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Zone</label>
                        <select
                          value={editCustomer.zoneId || ''}
                          onChange={(e) => {
                            const zId = e.target.value;
                            const zone = allZones.find((z: any) => z.id === zId);
                            setEditCustomer({...editCustomer, zoneId: zId, regionId: zone?.parentRegion || editCustomer.regionId, territoryId: '', beatId: ''});
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                        >
                          <option value="">-- Any Zone --</option>
                          {(editCustomer.regionId ? regions.find((r: any) => r.id === editCustomer.regionId)?.zones : allZones)?.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Territory</label>
                        <select
                          value={editCustomer.territoryId || ''}
                          onChange={(e) => {
                            const tId = e.target.value;
                            const territory = allTerritories.find((t: any) => t.id === tId);
                            setEditCustomer({...editCustomer, territoryId: tId, zoneId: territory?.parentZone || editCustomer.zoneId, regionId: territory?.parentRegion || editCustomer.regionId, beatId: ''});
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                        >
                          <option value="">-- Any Territory --</option>
                          {(editCustomer.zoneId ? allZones.find((z: any) => z.id === editCustomer.zoneId)?.territories : allTerritories)?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Route / Beat (Fast Select)</label>
                        <select
                          value={editCustomer.beatId || ''}
                          onChange={(e) => {
                            const bId = e.target.value;
                            const beat = allBeats.find((b: any) => b.id === bId);
                            if(beat) {
                              setEditCustomer({...editCustomer, beatId: bId, territoryId: beat.parentTerritory, zoneId: beat.parentZone, regionId: beat.parentRegion});
                            } else {
                              setEditCustomer({...editCustomer, beatId: bId});
                            }
                          }}
                          className="w-full rounded-lg border-2 border-indigo-400 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none bg-white font-semibold text-indigo-900 shadow-sm"
                        >
                          <option value="">-- Select Route to Auto-Fill --</option>
                          {(editCustomer.territoryId ? allTerritories.find((t: any) => t.id === editCustomer.territoryId)?.beats : allBeats)?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
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

c = c.replace(/\{\/\* EDIT CUSTOMER MODAL \*\/\}[\s\S]*?\{\/\* ADD CUSTOMER MODAL \*\/\}/, advancedEditModal.trim() + '\n\n      {/* ADD CUSTOMER MODAL */}');

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed Customer Actions column and Edit Modal');
