const fs = require('fs');

// Fix Purchase Bill Page
const path1 = 'src/app/(app)/inventory/purchase/page.tsx';
let code1 = fs.readFileSync(path1, 'utf8');
const search1 = /<RotateCcw className="w-3 h-3 text-rose-600" \/> Return\s*<\/button>/g;
const replace1 = `<RotateCcw className="w-3 h-3 text-rose-600" /> Return
                            </button>
                            <button
                              onClick={() => deletePurchase(bill.id)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Delete Purchase completely"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" /> Delete
                            </button>`;
if (!code1.includes('deletePurchase(bill.id)')) {
  code1 = code1.replace(search1, replace1);
  fs.writeFileSync(path1, code1);
}

// Fix Invoice Page
const path2 = 'src/app/(app)/invoices/page.tsx';
let code2 = fs.readFileSync(path2, 'utf8');
const search2 = /<RotateCcw className="h-3 w-3 text-amber-600" \/>\s*<span>Return<\/span>\s*<\/button>/g;
const replace2 = `<RotateCcw className="h-3 w-3 text-amber-600" />
                              <span>Return</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => deleteInvoice(inv.id)}
                              className="inline-flex items-center space-x-1 rounded-lg border border-red-200 bg-red-50/80 px-2 py-1 text-red-800 hover:bg-red-100 transition shadow-xs font-semibold"
                              title="Securely Delete Invoice completely"
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                              <span>Delete</span>
                            </button>`;
if (!code2.includes('deleteInvoice(inv.id)')) {
  code2 = code2.replace(search2, replace2);
  fs.writeFileSync(path2, code2);
}
console.log('Fixed buttons');
