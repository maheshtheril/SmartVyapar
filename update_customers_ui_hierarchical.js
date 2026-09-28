const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Update state variables
c = c.replace(/const \[territories, setTerritories\] = useState<any\[\]>\(\[\]\);/, `const [territoryEnabled, setTerritoryEnabled] = useState(false);\n    const [regions, setRegions] = useState<any[]>([]);`);

c = c.replace(/const \[addTerritoryId, setAddTerritoryId\] = useState\(''\);/, `const [addRegionId, setAddRegionId] = useState('');\n    const [addZoneId, setAddZoneId] = useState('');\n    const [addTerritoryId, setAddTerritoryId] = useState('');\n    const [addBeatId, setAddBeatId] = useState('');`);

// Update fetch
c = c.replace(/const tRes = await fetch\('\/api\/territories'\);\n\s*const tData = await tRes\.json\(\);\n\s*if \(tData\.success\) setTerritories\(tData\.territories \|\| \[\]\);/, 
`const tRes = await fetch('/api/territories/hierarchy');
        const tData = await tRes.json();
        if (tData.success) {
          setTerritoryEnabled(tData.enabled);
          setRegions(tData.regions || []);
        }`);

// Update POST payload
c = c.replace(/territoryId: addTerritoryId \|\| undefined,/, `regionId: addRegionId || undefined,\n            zoneId: addZoneId || undefined,\n            territoryId: addTerritoryId || undefined,\n            beatId: addBeatId || undefined,`);

// Reset state
c = c.replace(/setAddTerritoryId\(''\);/, `setAddRegionId(''); setAddZoneId(''); setAddTerritoryId(''); setAddBeatId('');`);

// UI Block
const hierarchicalUI = `
              {territoryEnabled && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Distribution Hierarchy</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Region</label>
                      <select
                        value={addRegionId}
                        onChange={(e) => { setAddRegionId(e.target.value); setAddZoneId(''); setAddTerritoryId(''); setAddBeatId(''); }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Select Region --</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Zone</label>
                      <select
                        value={addZoneId}
                        onChange={(e) => { setAddZoneId(e.target.value); setAddTerritoryId(''); setAddBeatId(''); }}
                        disabled={!addRegionId}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white disabled:opacity-50"
                      >
                        <option value="">-- Select Zone --</option>
                        {regions.find(r => r.id === addRegionId)?.zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Territory</label>
                      <select
                        value={addTerritoryId}
                        onChange={(e) => { setAddTerritoryId(e.target.value); setAddBeatId(''); }}
                        disabled={!addZoneId}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white disabled:opacity-50"
                      >
                        <option value="">-- Select Territory --</option>
                        {regions.find(r => r.id === addRegionId)?.zones?.find(z => z.id === addZoneId)?.territories?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Route / Beat</label>
                      <select
                        value={addBeatId}
                        onChange={(e) => setAddBeatId(e.target.value)}
                        disabled={!addTerritoryId}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white disabled:opacity-50"
                      >
                        <option value="">-- Select Route --</option>
                        {regions.find(r => r.id === addRegionId)?.zones?.find(z => z.id === addZoneId)?.territories?.find(t => t.id === addTerritoryId)?.beats?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
`;

c = c.replace(/<div className="grid grid-cols-1 gap-4 mt-4">\n\s*<div>\n\s*<label className="block text-\[11px\] font-bold uppercase tracking-wide text-slate-500 mb-1">TERRITORY \/ BEAT \(optional\)<\/label>\n\s*<select[\s\S]*?<\/select>\n\s*<\/div>\n\s*<\/div>/, hierarchicalUI);

fs.writeFileSync(p, c, 'utf8');
console.log('Customer UI updated with chained hierarchical dropdowns');
