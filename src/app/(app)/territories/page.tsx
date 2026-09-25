"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Map, Plus, ChevronRight, FolderTree, MapPin } from 'lucide-react';

export default function TerritoriesMaster() {
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REGION');

  // Form State
  const [name, setName] = useState('');
  const [selRegion, setSelRegion] = useState('');
  const [selZone, setSelZone] = useState('');
  const [selTerritory, setSelTerritory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/territories/hierarchy');
      const data = await res.json();
      if (data.success) {
        setHierarchy(data.regions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    let action = '';
    if (activeTab === 'REGION') action = 'CREATE_REGION';
    if (activeTab === 'ZONE') action = 'CREATE_ZONE';
    if (activeTab === 'TERRITORY') action = 'CREATE_TERRITORY';
    if (activeTab === 'BEAT') action = 'CREATE_BEAT';

    try {
      const res = await fetch('/api/territories/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          name,
          regionId: selRegion || undefined,
          zoneId: selZone || undefined,
          territoryId: selTerritory || undefined,
        })
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      
      setName('');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Map className="h-6 w-6 text-indigo-600" />
            <span>Distribution Territories</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your Regions, Zones, Territories, and Beats hierarchy.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Creation Form */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              {['REGION', 'ZONE', 'TERRITORY', 'BEAT'].map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setError(''); }}
                  className={\`flex-1 py-3 text-[10px] font-bold text-center transition \${activeTab === tab ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}\`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              
              {/* Conditional dropdowns based on tab */}
              {activeTab !== 'REGION' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Parent Region</label>
                  <select required value={selRegion} onChange={(e) => { setSelRegion(e.target.value); setSelZone(''); setSelTerritory(''); }} className="w-full border rounded-xl px-3 py-2 text-xs">
                    <option value="">Select Region...</option>
                    {hierarchy.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}

              {(activeTab === 'TERRITORY' || activeTab === 'BEAT') && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Parent Zone</label>
                  <select required value={selZone} onChange={(e) => { setSelZone(e.target.value); setSelTerritory(''); }} className="w-full border rounded-xl px-3 py-2 text-xs">
                    <option value="">Select Zone...</option>
                    {hierarchy.find(r => r.id === selRegion)?.zones?.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              )}

              {activeTab === 'BEAT' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Parent Territory</label>
                  <select required value={selTerritory} onChange={(e) => setSelTerritory(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs">
                    <option value="">Select Territory...</option>
                    {hierarchy.find(r => r.id === selRegion)?.zones?.find((z: any) => z.id === selZone)?.territories?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">New {activeTab} Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder={\`e.g. \${activeTab === 'REGION' ? 'South India' : 'Ernakulam'}\`} className="w-full border rounded-xl px-3 py-2 text-xs font-bold" />
              </div>

              {error && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</p>}

              <button disabled={saving} type="submit" className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition">
                <Plus className="h-4 w-4" /> Add {activeTab}
              </button>
            </form>
          </div>
        </div>

        {/* Tree View */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-full min-h-[400px]">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4">
              <FolderTree className="h-4 w-4 text-indigo-500" /> Current Hierarchy
            </h2>
            
            {loading ? (
              <div className="text-xs text-slate-400">Loading hierarchy...</div>
            ) : hierarchy.length === 0 ? (
              <div className="text-xs text-slate-400">No regions configured yet.</div>
            ) : (
              <div className="space-y-4">
                {hierarchy.map(region => (
                  <div key={region.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                    <div className="font-black text-sm text-indigo-900 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-indigo-500" /> {region.name} (Region)</div>
                    
                    {region.zones?.length > 0 && (
                      <div className="ml-4 mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                        {region.zones.map((zone: any) => (
                          <div key={zone.id}>
                            <div className="font-bold text-xs text-slate-700 flex items-center gap-1"><ChevronRight className="h-3 w-3 text-slate-400"/> {zone.name} (Zone)</div>
                            
                            {zone.territories?.length > 0 && (
                              <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3">
                                {zone.territories.map((territory: any) => (
                                  <div key={territory.id}>
                                    <div className="font-semibold text-[11px] text-slate-600 flex items-center gap-1"><ChevronRight className="h-2 w-2 text-slate-300"/> {territory.name} (Territory)</div>
                                    
                                    {territory.beats?.length > 0 && (
                                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">
                                        {territory.beats.map((beat: any) => (
                                          <div key={beat.id} className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <span className="h-1 w-1 rounded-full bg-slate-300"></span> {beat.name}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
