const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

const addHtml = `
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" value={addOpeningBalance} onChange={(e) => setAddOpeningBalance(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance Date</label>
                <input type="date" value={addOpeningBalanceDate} onChange={(e) => setAddOpeningBalanceDate(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
              <textarea`;
const editHtml = `
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" value={editSupplier?.outstandingBalance ?? 0} onChange={(e) => setEditSupplier({...editSupplier, outstandingBalance: e.target.value})} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance Date</label>
                <input type="date" value={editSupplier?.openingBalanceDate ? new Date(editSupplier.openingBalanceDate).toISOString().split('T')[0] : ''} onChange={(e) => setEditSupplier({...editSupplier, openingBalanceDate: e.target.value})} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
              <textarea`;

// The file has two Physical Address fields. First is Edit Modal, Second is Add Modal!
// Wait! Let's check the order in the file.
c = c.replace(/<div>\s*<label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address<\/label>\s*<textarea/, editHtml);
c = c.replace(/<div>\s*<label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address<\/label>\s*<textarea/, addHtml);

fs.writeFileSync(p, c, 'utf8');
console.log('Supplier UI fully fixed');
