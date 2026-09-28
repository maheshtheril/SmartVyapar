const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\register\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Add businessType state
c = c.replace(/const \[isComposition, setIsComposition\] = useState\(false\);/, `const [isComposition, setIsComposition] = useState(false);\n  const [businessType, setBusinessType] = useState("RETAIL");`);

// Add to payload
c = c.replace(/body: JSON\.stringify\(\{/, `body: JSON.stringify({\n        businessType,`);

// Add UI selector before Step 2
const businessTypeUI = `
            <hr className="border-slate-100" />
            
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>2. Industry Type</span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'RETAIL', label: 'Retail & POS' },
                  { id: 'DISTRIBUTION', label: 'FMCG & Distribution' },
                  { id: 'RESTAURANT', label: 'Restaurant & F&B' },
                  { id: 'SERVICES', label: 'Services & Billing' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setBusinessType(type.id)}
                    className={\`flex items-center justify-center py-2.5 rounded-xl border text-xs font-bold transition \${businessType === type.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}\`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {businessType === 'DISTRIBUTION' && (
                <p className="text-[10px] text-indigo-600 mt-2 font-medium bg-indigo-50 p-2 rounded-lg">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  Advanced modules like Route/Beat Planning and Region ➔ Territory hierarchy will be automatically enabled.
                </p>
              )}
            </div>
`;

c = c.replace(/<hr className="border-slate-100" \/>\n\s*\{\/\* Step 2: Payment Details \*\/\}/, businessTypeUI + '\n\n              <hr className="border-slate-100" />\n\n              {/* Step 3: Payment Details */}');
c = c.replace(/<span>2\. Dynamic UPI QR Settings<\/span>/, '<span>3. Dynamic UPI QR Settings</span>');
c = c.replace(/<span>3\. Owner Account<\/span>/, '<span>4. Owner Account</span>');

fs.writeFileSync(p, c, 'utf8');
console.log('Register page updated with Business Type');
