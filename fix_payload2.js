const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /mrp: Number\(it\.mrp \|\| it\.sellingPrice \|\| 0\),\s*gstRate: Number\(it\.gstRate \|\| 18\),/g,
  `mrp: Number(it.mrp || it.sellingPrice || 0),\n            suggestedDisplayName: it.suggestedDisplayName || undefined,\n            partNumber: it.partNumber || undefined,\n            gstRate: Number(it.gstRate || 18),`
);

fs.writeFileSync(path, c);
console.log("Updated payload properly.");
