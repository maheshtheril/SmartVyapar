const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/stateCode: true,/, 'stateCode: true,\n        territoryId: true,\n        territory: { select: { name: true, zone: true } },');
c = c.replace(/const \{ name, phone, gstin, stateCode, email, address, pincode \} = body;/, 'const { name, phone, gstin, stateCode, email, address, pincode, territoryId } = body;');
c = c.replace(/stateCode: stateCode \|\| "32",/, 'stateCode: stateCode || "32",\n            territoryId: territoryId || null,');

fs.writeFileSync(p, c, 'utf8');
console.log('Customers API updated for territoryId');
