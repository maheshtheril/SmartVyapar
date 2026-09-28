const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Add state
c = c.replace(/const \[addPhone, setAddPhone\] = useState\(''\);/, `const [addPhone, setAddPhone] = useState('');\n    const [openingBalance, setOpeningBalance] = useState('');`);

// Clear state
c = c.replace(/setAddName\(''\);\n\s*setAddPhone\(''\);/, `setAddName('');\n              setAddPhone('');\n              setOpeningBalance('');`);

// Add to payload
c = c.replace(/phone: addPhone,/, `phone: addPhone,\n            openingBalance: openingBalance ? parseFloat(openingBalance) : 0,`);

// Add to UI
const uiField = `
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      placeholder="e.g. 1500.00"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Amount the customer already owes you.</p>
                  </div>
`;

c = c.replace(/<div className="grid grid-cols-2 gap-4 mt-4">/, `<div className="grid grid-cols-2 gap-4 mt-4">${uiField}`);

fs.writeFileSync(p, c, 'utf8');
console.log('Customers UI updated with openingBalance');
