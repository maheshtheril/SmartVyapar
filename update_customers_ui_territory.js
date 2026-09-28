const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Add territories state
c = c.replace(/const \[customers, setCustomers\] = useState<Customer\[\]>\(\[\]\);/, `const [customers, setCustomers] = useState<Customer[]>([]);\n    const [territories, setTerritories] = useState<any[]>([]);`);

// Load territories
c = c.replace(/const res = await fetch\(url\);/, `const res = await fetch(url);\n        const tRes = await fetch('/api/territories');\n        const tData = await tRes.json();\n        if (tData.success) setTerritories(tData.territories || []);`);

// Add addTerritoryId state
c = c.replace(/const \[addStateCode, setAddStateCode\] = useState\(''\);/, `const [addStateCode, setAddStateCode] = useState('');\n    const [addTerritoryId, setAddTerritoryId] = useState('');`);

// Add to fetch payload
c = c.replace(/stateCode: addStateCode \|\| undefined,/, `stateCode: addStateCode || undefined,\n            territoryId: addTerritoryId || undefined,`);

// Reset state
c = c.replace(/setAddStateCode\(''\);/, `setAddStateCode(''); setAddTerritoryId('');`);

// Add to UI modal
const territoryField = `
              </div>
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">TERRITORY / BEAT (optional)</label>
                  <select
                    value={addTerritoryId}
                    onChange={(e) => setAddTerritoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Select Territory --</option>
                    {territories.map(t => (
                      <option key={t.id} value={t.id}>{t.zone ? \`\${t.zone} - \` : ''}{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
`;

c = c.replace(/className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"\n\s*\/>\n\s*<\/div>\n\s*<\/div>\n\s*\{addError && \(/, 
(match) => `className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"\n                  />\n                </div>\n              </div>` + territoryField + `\n              {addError && (`
);

// Add to table
c = c.replace(/<td className="px-4 py-3">\n\s*<div className="font-bold text-slate-900">\{c\.name\}<\/div>/, (match) => match + '\n                          {c.territory && <div className="text-[10px] text-indigo-500 font-bold">{c.territory.name}</div>}');

fs.writeFileSync(p, c, 'utf8');
console.log('Customer UI updated with Territories');
