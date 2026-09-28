const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

const uiFields = `
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">EMAIL (optional)</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="e.g. raj@example.com"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">STATE CODE (optional)</label>
                  <input
                    type="text"
                    value={addStateCode}
                    onChange={(e) => setAddStateCode(e.target.value)}
                    placeholder="e.g. 32"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">ADDRESS (optional)</label>
                  <textarea
                    rows={2}
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="Full physical address"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs resize-none focus:border-indigo-500 focus:outline-none"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">PINCODE (optional)</label>
                  <input
                    type="text"
                    value={addPincode}
                    onChange={(e) => setAddPincode(e.target.value)}
                    placeholder="e.g. 682001"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                {addError && (
`;

c = c.replace(/<\/div>\n\s*\{addError && \(/, uiFields);

fs.writeFileSync(p, c, 'utf8');
console.log('Customer modal truly updated again');
