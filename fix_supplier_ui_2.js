const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/const \[address, setAddress\] = useState\(''\);/, "const [address, setAddress] = useState('');\n  const [addOpeningBalance, setAddOpeningBalance] = useState('');\n  const [addOpeningBalanceDate, setAddOpeningBalanceDate] = useState(() => new Date().toISOString().split('T')[0]);");

c = c.replace(/body: JSON\.stringify\(\{ name, gstin, phone, email, address \}\)/, "body: JSON.stringify({ name, gstin, phone, email, address, openingBalance: addOpeningBalance ? parseFloat(addOpeningBalance) : 0, openingBalanceDate: addOpeningBalanceDate || undefined })");

c = c.replace(/setName\(''\); setGstin\(''\); setPhone\(''\); setEmail\(''\); setAddress\(''\);/, "setName(''); setGstin(''); setPhone(''); setEmail(''); setAddress(''); setAddOpeningBalance('');");

const addHtml = `
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" value={addOpeningBalance} onChange={(e) => setAddOpeningBalance(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Opening Balance Date</label>
                <input type="date" value={addOpeningBalanceDate} onChange={(e) => setAddOpeningBalanceDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Physical Address</label>
              <textarea`;
const editHtml = `
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" value={editSupplier?.outstandingBalance ?? 0} onChange={(e) => setEditSupplier({...editSupplier, outstandingBalance: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Opening Balance Date</label>
                <input type="date" value={editSupplier?.openingBalanceDate ? new Date(editSupplier.openingBalanceDate).toISOString().split('T')[0] : ''} onChange={(e) => setEditSupplier({...editSupplier, openingBalanceDate: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Physical Address</label>
              <textarea`;

// Replace first occurrence (Add Modal)
c = c.replace(/<div>\s*<label className="block text-xs font-medium text-slate-700 mb-1">Physical Address<\/label>\s*<textarea/, addHtml);

// Replace second occurrence (Edit Modal)
c = c.replace(/<div>\s*<label className="block text-xs font-medium text-slate-700 mb-1">Physical Address<\/label>\s*<textarea/, editHtml);

fs.writeFileSync(p, c, 'utf8');
console.log('Supplier UI fixed');
