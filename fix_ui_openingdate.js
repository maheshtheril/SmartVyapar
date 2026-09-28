const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('addOpeningBalanceDate')) {
  // Add state variables
  c = c.replace(/const \[openingBalance, setOpeningBalance\] = useState\(''\);/, "const [openingBalance, setOpeningBalance] = useState('');\n    const [addOpeningBalanceDate, setAddOpeningBalanceDate] = useState('');");

  // In Edit modal
  const editDateHtml = `
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Opening Balance (₹)</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" value={editCustomer.outstandingBalance ?? 0} onChange={(e) => setEditCustomer({...editCustomer, outstandingBalance: e.target.value})} className="w-1/2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                      <input type="date" value={editCustomer.openingBalanceDate ? new Date(editCustomer.openingBalanceDate).toISOString().split('T')[0] : ''} onChange={(e) => setEditCustomer({...editCustomer, openingBalanceDate: e.target.value})} className="w-1/2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                    </div>
                  </div>
  `;
  c = c.replace(/<div>\s*<label className="block text-\[11px\] font-bold uppercase tracking-wide text-slate-500 mb-1">Opening Balance \(₹\)<\/label>\s*<input type="number".*?onChange=\{\(e\) => setEditCustomer.*? \/>\s*<\/div>/, editDateHtml.trim());

  // In Add modal
  const addDateHtml = `
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Opening Balance (₹)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        placeholder="e.g. 1500.00"
                        className="w-1/2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={addOpeningBalanceDate}
                        onChange={(e) => setAddOpeningBalanceDate(e.target.value)}
                        className="w-1/2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
  `;
  c = c.replace(/<div>\s*<label className="block text-\[11px\] font-bold uppercase tracking-wide text-slate-500 mb-1">Opening Balance \(₹\)<\/label>\s*<input\s*type="number"[\s\S]*?onChange=\{\(e\) => setOpeningBalance\(e\.target\.value\)\}[\s\S]*?\/>\s*<\/div>/, addDateHtml.trim());

  // In handleAddCustomer
  c = c.replace(/openingBalance\n\s*\}/, "openingBalance,\n      openingBalanceDate: addOpeningBalanceDate\n    }");
  
  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed UI for openingBalanceDate');
} else {
  console.log('Already added');
}
