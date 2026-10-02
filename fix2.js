const fs = require('fs');
const path = 'src/app/(app)/inventory/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const s1 = `const [name, setName] = useState("");`;
const r1 = `const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");`;

if(code.includes(s1)) {
    code = code.replace(s1, r1);
}

const s2 = `                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Product / Item Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Amul Gold Milk 500ml"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 font-medium focus:border-indigo-600 focus:bg-white focus:outline-none"
                        />
                      </div>`;

const r2 = `                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Product / Item Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Amul Gold Milk 500ml"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 font-medium focus:border-indigo-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          POS Display Name
                        </label>
                        <input
                          type="text"
                          placeholder="Clean name for receipts"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full rounded-xl border border-indigo-300 bg-indigo-50/50 px-3 py-2 text-xs text-indigo-900 font-bold focus:border-indigo-600 focus:outline-none"
                        />
                      </div>`;

if(code.includes(s2)) {
    code = code.replace(s2, r2);
    fs.writeFileSync(path, code);
    console.log("SUCCESS");
} else {
    console.log("FAILED S2");
}
