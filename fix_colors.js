const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

const regex = /<td className="py-2 px-1 align-middle relative">\s*<input\s*type="text"\s*placeholder="Clean Name[^>]*\s*value=\{row\.suggestedDisplayName \|\| ''\}\s*onChange=\{\(e\) => updateItem\(idx, 'suggestedDisplayName', e\.target\.value\)\}\s*className="[^"]*"\s*\/>\s*\{row\.productId \? \([\s\S]*?\) : \([\s\S]*?NEW[\s\S]*?\}\s*<\/td>/m;

const replacement = `<td className="py-2 px-1 align-middle relative">
                                  <input
                                    type="text"
                                    placeholder="Clean Name (e.g. Swift Shock)"
                                    value={row.suggestedDisplayName || ''}
                                    onChange={(e) => updateItem(idx, 'suggestedDisplayName', e.target.value)}
                                    className={\`w-full border rounded px-2.5 py-1.5 text-[11px] font-bold focus:ring-2 transition-colors \${
                                      row.productId 
                                        ? 'border-slate-200 bg-white text-slate-900 focus:ring-slate-400' 
                                        : 'border-amber-300 bg-amber-50/60 text-amber-900 focus:ring-amber-500'
                                    }\`}
                                    title={row.productId ? 'Saved Item (Matched in Database)' : 'New Item (Will be created)'}
                                  />
                                </td>`;

c = c.replace(regex, replacement);

fs.writeFileSync(path, c);
console.log("Replaced badges with color coding.");
