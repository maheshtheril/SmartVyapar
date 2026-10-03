const fs = require('fs');
const path = 'src/app/(app)/customers/page.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('const [priceLists, setPriceLists]')) {
  // Add state
  c = c.replace(
    'const [regions, setRegions] = useState<any[]>([]);',
    'const [regions, setRegions] = useState<any[]>([]);\n  const [priceLists, setPriceLists] = useState<any[]>([]);'
  );

  // Add fetch to load
  c = c.replace(
    `const tRes = await fetch('/api/territories/hierarchy');`,
    `const tRes = await fetch('/api/territories/hierarchy');\n        const plRes = await fetch('/api/price-lists').catch(() => null);\n        if (plRes && plRes.ok) {\n          const plData = await plRes.json();\n          if (plData.success) setPriceLists(plData.priceLists);\n        }`
  );

  // Add field to add modal state
  c = c.replace(
    `const [addTerritoryId, setAddTerritoryId] = useState('');`,
    `const [addTerritoryId, setAddTerritoryId] = useState('');\n  const [addPriceListId, setAddPriceListId] = useState('');`
  );

  // Add field to add modal payload
  c = c.replace(
    `territoryId: addTerritoryId || undefined`,
    `territoryId: addTerritoryId || undefined,\n            priceListId: addPriceListId || undefined`
  );

  // Add UI for Add Modal
  c = c.replace(
    `<label className="block text-xs font-bold text-slate-700 mb-1">State Code</label>`,
    `<label className="block text-xs font-bold text-slate-700 mb-1">Price List (Wholesale Tier)</label>
                      <select value={addPriceListId} onChange={(e) => setAddPriceListId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none bg-white">
                        <option value="">Standard Retail Pricing</option>
                        {priceLists.map(pl => (
                          <option key={pl.id} value={pl.id}>{pl.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">State Code</label>`
  );

  // Add UI for Edit Modal
  c = c.replace(
    `<label className="block text-xs font-bold text-slate-700 mb-1">Territory / Area</label>`,
    `<label className="block text-xs font-bold text-slate-700 mb-1">Price List (Wholesale Tier)</label>
                    <select value={editCustomer.priceListId || ""} onChange={(e) => setEditCustomer({...editCustomer, priceListId: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none bg-white">
                      <option value="">Standard Retail Pricing</option>
                      {priceLists.map((pl: any) => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Territory / Area</label>`
  );

  fs.writeFileSync(path, c);
  console.log("Updated customers page");
} else {
  console.log("Already updated");
}
