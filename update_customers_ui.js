const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Replace Text
c = c.replace(/Khata/g, 'Receivables');
c = c.replace(/khata/g, 'receivables');
c = c.replace(/Customer Accounts &amp; Receivables/g, 'Customer Accounts & Directory');
c = c.replace(/Total Receivables Due/g, 'Total Receivables');

// Update State for new fields
c = c.replace(/const \[gstin, setGstin\] = useState\(''\);/, `const [gstin, setGstin] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [stateCode, setStateCode] = useState('');`);

// Update handleSubmit payload
c = c.replace(/body: JSON\.stringify\(\{ name, phone, gstin \}\),/, `body: JSON.stringify({ name, phone, gstin, email, address, pincode, stateCode }),`);

// Reset state
c = c.replace(/setGstin\(''\);\n\s*loadCustomers\(\);/, `setGstin('');
        setEmail('');
        setAddress('');
        setPincode('');
        setStateCode('');
        loadCustomers();`);

// Add new fields to UI modal
const newFields = `
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">EMAIL (OPTIONAL)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">STATE CODE (OPTIONAL)</label>
                  <input type="text" value={stateCode} onChange={e => setStateCode(e.target.value)} placeholder="e.g. 32" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ADDRESS (OPTIONAL)</label>
                  <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full physical address" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PINCODE (OPTIONAL)</label>
                  <input type="text" value={pincode} onChange={e => setPincode(e.target.value)} placeholder="e.g. 682001" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" />
                </div>
              </div>
`;

c = c.replace(/<div>\s*<label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN \(OPTIONAL\).*?\n.*?\n\s*<\/div>/, (match) => match + '\n' + newFields);

fs.writeFileSync(p, c, 'utf8');
console.log('Customers UI updated');
