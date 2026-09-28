const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

const balanceHTML = `
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Opening Balance (₹)</label>
                    <input type="number" step="0.01" value={editCustomer.outstandingBalance ?? 0} onChange={(e) => setEditCustomer({...editCustomer, outstandingBalance: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Email (Optional)</label>
`;

c = c.replace(/<div className="grid grid-cols-2 gap-4">\s*<div>\s*<label className="block text-\[11px\] font-bold uppercase tracking-wide text-slate-500 mb-1">Email \(Optional\)/, balanceHTML.trim());

fs.writeFileSync(p, c, 'utf8');
console.log('Added balance to Edit Modal UI');
