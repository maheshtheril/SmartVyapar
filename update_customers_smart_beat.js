const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Add remember state
c = c.replace(/const \[addBeatId, setAddBeatId\] = useState\(''\);/, `const [addBeatId, setAddBeatId] = useState('');\n    const [rememberHierarchy, setRememberHierarchy] = useState(true);`);

// 2. Modify reset logic on success
c = c.replace(/setAddRegionId\(''\); setAddZoneId\(''\); setAddTerritoryId\(''\); setAddBeatId\(''\);/, 
`if (!rememberHierarchy) {
              setAddRegionId(''); setAddZoneId(''); setAddTerritoryId(''); setAddBeatId('');
            }`);

// 3. Flatten hierarchy logic for smart selection
const flattenLogic = `
  // Flattened lists for smart auto-fill
  const allZones = regions.flatMap(r => r.zones?.map((z: any) => ({ ...z, parentRegion: r.id })) || []);
  const allTerritories = allZones.flatMap((z: any) => z.territories?.map((t: any) => ({ ...t, parentZone: z.id, parentRegion: z.parentRegion })) || []);
  const allBeats = allTerritories.flatMap((t: any) => t.beats?.map((b: any) => ({ ...b, parentTerritory: t.id, parentZone: t.parentZone, parentRegion: t.parentRegion })) || []);

  const handleBeatChange = (beatId: string) => {
    setAddBeatId(beatId);
    if (!beatId) return;
    const beat = allBeats.find((b: any) => b.id === beatId);
    if (beat) {
      setAddTerritoryId(beat.parentTerritory);
      setAddZoneId(beat.parentZone);
      setAddRegionId(beat.parentRegion);
    }
  };

  const handleTerritoryChange = (territoryId: string) => {
    setAddTerritoryId(territoryId);
    setAddBeatId('');
    if (!territoryId) return;
    const territory = allTerritories.find((t: any) => t.id === territoryId);
    if (territory) {
      setAddZoneId(territory.parentZone);
      setAddRegionId(territory.parentRegion);
    }
  };

  const handleZoneChange = (zoneId: string) => {
    setAddZoneId(zoneId);
    setAddTerritoryId('');
    setAddBeatId('');
    if (!zoneId) return;
    const zone = allZones.find((z: any) => z.id === zoneId);
    if (zone) {
      setAddRegionId(zone.parentRegion);
    }
  };
`;

c = c.replace(/const handleAddCustomer = async \(e: React\.FormEvent\) => \{/, flattenLogic + '\n\n  const handleAddCustomer = async (e: React.FormEvent) => {');

// 4. Update the UI block
const newHierarchicalUI = `
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
                        onChange={e => setRememberHierarchy(e.target.checked)} 
                        className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                      />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Remember selection</span>
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
`;

c = c.replace(/\{\s*territoryEnabled && \(\s*<div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-3">[\s\S]*?<\/div>\s*\)\s*\}/, newHierarchicalUI);

fs.writeFileSync(p, c, 'utf8');
console.log('Customers UI updated with Smart Beat Selector and Remember Checkbox');
