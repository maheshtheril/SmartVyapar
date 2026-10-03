const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

const target = `            sellingPrice: Number(it.sellingPrice || 0),
            marginPercent: Number(it.marginPercent || 0),
            mrp: Number(it.mrp || it.sellingPrice || 0),
            gstRate: Number(it.gstRate || 18),`;

const replacement = `            sellingPrice: Number(it.sellingPrice || 0),
            marginPercent: Number(it.marginPercent || 0),
            mrp: Number(it.mrp || it.sellingPrice || 0),
            suggestedDisplayName: it.suggestedDisplayName || undefined,
            partNumber: it.partNumber || undefined,
            gstRate: Number(it.gstRate || 18),`;

c = c.replace(target, replacement);
fs.writeFileSync(path, c);
console.log("Updated payload.");
