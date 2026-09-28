const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Render Inactive Badge next to name
c = c.replace(/<div className="font-semibold text-slate-800">\{s\.name\}<\/div>/g, 
  `<div className="flex items-center gap-2">
    <div className="font-semibold text-slate-800">{s.name}</div>
    {s.isActive === false && <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-rose-100 text-rose-700 rounded border border-rose-200">Inactive</span>}
  </div>`);

// Handle Delete with our new error message
c = c.replace(/onClick=\{async \(\) => \{ if\(window\.confirm\('Delete supplier\?'\)\) \{ await fetch\('\/api\/suppliers\?id='\+s\.id, \{method:'DELETE'\}\); loadSuppliers\(\); \} \}\}/g, 
  `onClick={async () => {
    if(window.confirm('Delete supplier?')) {
      const res = await fetch('/api/suppliers?id='+s.id, {method:'DELETE'});
      const data = await res.json().catch(()=>null);
      if(!res.ok || (data && !data.success)) {
        alert(data?.error || "Failed to delete supplier.");
      } else {
        loadSuppliers();
      }
    }
  }}`);

// Add Active toggle to Edit Form
c = c.replace(/<div className="pt-2 flex justify-end gap-2">/g, 
  `<div>
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={editSupplier?.isActive !== false} onChange={(e) => setEditSupplier({...editSupplier, isActive: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
      <span className="text-xs font-semibold text-slate-700">Supplier is Active</span>
    </label>
  </div>
  <div className="pt-2 flex justify-end gap-2">`);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed Supplier UI to handle isActive and safe deletes');
