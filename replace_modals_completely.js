const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Find the start of the EDIT CUSTOMER MODAL
const idx = c.indexOf('{/* EDIT CUSTOMER MODAL */}');
if (idx !== -1) {
  // we will chop off everything from here to the end, except the closing tags for the main div.
  const prefix = c.substring(0, idx);
  
  const modalsCode = `
      {/* EDIT CUSTOMER MODAL */}
      {isEditModalOpen && editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-black text-slate-800">Edit Customer</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
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
            }} className="p-6 overflow-y-auto space-y-4">
              
              {editError && <div className="p-3 text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-200 rounded-lg">{editError}</div>}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Full Name *</label>
                  <input required type="text" value={editCustomer.name || ''} onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Mobile Number</label>
                    <input type="text" value={editCustomer.phone || ''} onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">GSTIN</label>
                    <input type="text" value={editCustomer.gstin || ''} onChange={(e) => setEditCustomer({...editCustomer, gstin: e.target.value.toUpperCase()})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Email (Optional)</label>
                    <input type="email" value={editCustomer.email || ''} onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">State Code</label>
                    <input type="text" value={editCustomer.stateCode || ''} onChange={(e) => setEditCustomer({...editCustomer, stateCode: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Address</label>
                    <input type="text" value={editCustomer.address || ''} onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Pincode</label>
                    <input type="text" value={editCustomer.pincode || ''} onChange={(e) => setEditCustomer({...editCustomer, pincode: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>

                {territoryEnabled && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mt-4 space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-800 flex items-center gap-1.5 mb-2">
                      Distribution Hierarchy
                    </h3>
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

              <div className="bg-slate-50 p-4 border border-slate-200 mt-2 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editCustomer?.isActive !== false} onChange={(e) => setEditCustomer({...editCustomer, isActive: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span className="text-xs font-bold text-slate-800">Customer Account is Active</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1 pl-6">Uncheck this to archive the customer and hide them from selection dropdowns.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold transition">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50">
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Add New Customer
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Rajan Enterprises"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Mobile Number (WhatsApp) *</label>
                    <input
                      required
                      type="tel"
                      maxLength={10}
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value.replace(/\\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">GSTIN (optional)</label>
                    <input
                      type="text"
                      value={addGstin}
                      onChange={(e) => setAddGstin(e.target.value.toUpperCase())}
                      placeholder="29AAAAA0000A1Z5"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      placeholder="e.g. 1500.00"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="e.g. raj@example.com"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">State Code</label>
                    <input
                      type="text"
                      value={addStateCode}
                      onChange={(e) => setAddStateCode(e.target.value)}
                      placeholder="e.g. 32"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={addPincode}
                      onChange={(e) => setAddPincode(e.target.value)}
                      placeholder="e.g. 682001"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Address</label>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="Full physical address"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {territoryEnabled && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mt-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-800 flex items-center gap-1.5">
                      Distribution Hierarchy
                    </h3>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rememberHierarchy} 
                        onChange={(e) => setRememberHierarchy(e.target.value === 'true' || e.target.checked)} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3" 
                      />
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Remember Selection</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Region</label>
                      <select
                        value={addRegionId}
                        onChange={(e) => { setAddRegionId(e.target.value); setAddZoneId(''); setAddTerritoryId(''); setAddBeatId(''); }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Any Region --</option>
                        {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Zone</label>
                      <select
                        value={addZoneId}
                        onChange={(e) => handleZoneChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Any Zone --</option>
                        {(addRegionId ? regions.find((r: any) => r.id === addRegionId)?.zones : allZones)?.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Territory</label>
                      <select
                        value={addTerritoryId}
                        onChange={(e) => handleTerritoryChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Any Territory --</option>
                        {(addZoneId ? allZones.find((z: any) => z.id === addZoneId)?.territories : allTerritories)?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Route / Beat (Fast Select)</label>
                      <select
                        value={addBeatId}
                        onChange={(e) => handleBeatChange(e.target.value)}
                        className="w-full rounded-lg border-2 border-indigo-400 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none bg-white font-semibold text-indigo-900 shadow-sm"
                      >
                        <option value="">-- Select Route to Auto-Fill --</option>
                        {(addTerritoryId ? allTerritories.find((t: any) => t.id === addTerritoryId)?.beats : allBeats)?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {addError && (
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-2 rounded-lg">{addError}</p>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-60"
                >
                  {addSaving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`;
  
  c = prefix + modalsCode;
  fs.writeFileSync(p, c, 'utf8');
  console.log('Replaced both Edit and Add modals fully.');
}
