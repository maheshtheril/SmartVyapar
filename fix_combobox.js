const fs = require('fs');
const path = 'src/app/(app)/inventory/purchase/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const search = `<td className="py-2 px-3 align-middle relative"><div className="relative"><input type="text" value={row.productName} onChange={(e) => updateEditItem(idx, 'productName', e.target.value)} className="w-full uppercase font-bold text-slate-900 border border-slate-300 rounded px-2 py-1.5 text-xs bg-slate-50 focus:bg-white" /></div></td>`;

const replace = `<td className="py-2 px-3 align-middle relative">
    <div className="relative">
      <input 
        type="text" 
        value={row.productName} 
        onFocus={() => setActiveItemDropdownIdx(idx)}
        onBlur={() => setTimeout(() => setActiveItemDropdownIdx(null), 150)}
        onChange={(e) => {
          updateEditItem(idx, 'productName', e.target.value);
          setActiveItemDropdownIdx(idx);
        }} 
        className="w-full uppercase font-bold text-slate-900 border border-slate-300 rounded px-2 py-1.5 text-xs bg-slate-50 focus:bg-white" 
      />
    </div>
    {/* Searchable Dropdown for Catalog Items */}
    {activeItemDropdownIdx === idx && (
      <div className="absolute z-50 left-3 right-3 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 ring-1 ring-black/5">
        {getFilteredProducts(row.productName).length > 0 ? (
          <>
            <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold uppercase text-slate-600 tracking-wider flex justify-between items-center">
              <span>Matching Catalog Products ({products.length} in store)</span>
              <span className="text-[9px] text-slate-400 font-normal">Click to auto-fill</span>
            </div>
            {getFilteredProducts(row.productName).map((prod) => (
              <div
                key={prod.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  // Auto-fill everything when an existing product is clicked
                  updateEditItem(idx, 'productId', prod.id);
                  updateEditItem(idx, 'productName', row.productName); // Keep the supplier's raw name for the mapping!
                  updateEditItem(idx, 'suggestedDisplayName', prod.displayName || prod.name); // Fill clean name
                  if (prod.partNumber) updateEditItem(idx, 'partNumber', prod.partNumber);
                  if (prod.hsnCode) updateEditItem(idx, 'hsnCode', prod.hsnCode);
                  if (prod.baseUnit) updateEditItem(idx, 'unit', prod.baseUnit);
                  if (prod.purchasePrice && Number(prod.purchasePrice) > 0) updateEditItem(idx, 'purchasePrice', prod.purchasePrice);
                  if (prod.sellingPrice) updateEditItem(idx, 'sellingPrice', prod.sellingPrice);
                  if (prod.mrp) updateEditItem(idx, 'mrp', prod.mrp);
                  if (prod.gstRate) updateEditItem(idx, 'gstRate', prod.gstRate);
                  
                  setActiveItemDropdownIdx(null);
                }}
                className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center group transition"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">{prod.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    SKU: {prod.sku || 'N/A'} | Stock: {prod.currentStock} {prod.baseUnit} | MRP: ₹{prod.mrp}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-700">₹{prod.sellingPrice}</p>
                  <span className="text-[9px] font-bold text-indigo-500 uppercase">Select</span>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-500">No matching products found.</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-1">Leave as is to create a new one.</p>
          </div>
        )}
      </div>
    )}
</td>`;

code = code.replace(search, replace);
fs.writeFileSync(path, code);
console.log("Updated edit modal with combobox");
