const fs = require('fs');
const path = 'src/app/(app)/inventory/purchase/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace headers
const headersSearch = `<th className="py-2.5 px-2 w-8 text-center text-slate-400">#</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Product Description</th>
                          <th className="py-2.5 px-2 w-20 text-center">HSN</th>`;
const headersReplace = `<th className="py-2.5 px-2 w-8 text-center text-slate-400">#</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Supplier Invoice Name</th>
                          <th className="py-2.5 px-3 min-w-[200px]">POS Display Name</th>
                          <th className="py-2.5 px-2 w-24">Part / OEM #</th>
                          <th className="py-2.5 px-2 w-20 text-center">HSN</th>`;
code = code.replace(headersSearch, headersReplace);

// Replace body cells
const bodySearch = `<td className="py-2 px-2 font-mono text-slate-400 text-center align-middle">{idx + 1}</td>
                              <td className="py-2 px-3 align-middle font-semibold text-slate-800 max-w-[220px] truncate">{row.productName}</td>
                              <td className="py-2 px-2 align-middle">`;
const bodyReplace = `<td className="py-2 px-2 font-mono text-slate-400 text-center align-middle">{idx + 1}</td>
                              <td className="py-2 px-3 align-middle relative">
                                <div className="relative">
                                  <input type="text" value={row.productName} onChange={(e) => updateEditItem(idx, 'productName', e.target.value)} className="w-full uppercase font-bold text-slate-900 border border-slate-300 rounded px-2 py-1.5 text-xs bg-slate-50 focus:bg-white" />
                                </div>
                              </td>
                              <td className="py-2 px-3 align-middle relative">
                                <div className="relative">
                                  <input type="text" value={row.suggestedDisplayName || row.product?.displayName || row.product?.name || ''} onChange={(e) => updateEditItem(idx, 'suggestedDisplayName', e.target.value)} className="w-full uppercase font-bold text-indigo-700 border border-indigo-200 rounded px-2 py-1.5 text-xs bg-indigo-50 focus:bg-white" />
                                </div>
                              </td>
                              <td className="py-2 px-2 align-middle">
                                <input type="text" value={row.partNumber || row.product?.partNumber || ''} onChange={(e) => updateEditItem(idx, 'partNumber', e.target.value)} className="w-full text-center border border-slate-300 rounded px-1.5 py-1.5 text-xs font-mono font-bold uppercase" />
                              </td>
                              <td className="py-2 px-2 align-middle">`;
code = code.replace(bodySearch, bodyReplace);

fs.writeFileSync(path, code);
console.log("Edit Modal updated!");
