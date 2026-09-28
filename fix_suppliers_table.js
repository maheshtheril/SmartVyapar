const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

const correctTbody = `
              <tbody className="divide-y divide-slate-100">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{s.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      {s.gstin ? (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">{s.gstin}</span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        {s.phone && <span className="text-xs text-slate-600 flex items-center gap-1"><Phone className="w-3 h-3"/> {s.phone}</span>}
                        {s.email && <span className="text-xs text-slate-500">{s.email}</span>}
                        {!s.phone && !s.email && <span className="text-slate-400 text-sm">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.address || <span className="text-slate-400 text-sm">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditSupplier(s); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={async () => { if(window.confirm('Delete supplier?')) { await fetch('/api/suppliers?id='+s.id, {method:'DELETE'}); loadSuppliers(); } }} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
`;

c = c.replace(/<tbody className="divide-y divide-slate-100">[\s\S]*?<\/tbody>/, correctTbody.trim());

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed supplier table rendering');
