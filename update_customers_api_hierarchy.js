const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/const \{ name, phone, gstin, stateCode, email, address, pincode, territoryId \} = body;/, 'const { name, phone, gstin, stateCode, email, address, pincode, regionId, zoneId, territoryId, beatId } = body;');

c = c.replace(/territoryId: territoryId \|\| null,/, 'regionId: regionId || null,\n            zoneId: zoneId || null,\n            territoryId: territoryId || null,\n            beatId: beatId || null,');

fs.writeFileSync(p, c, 'utf8');
console.log('Customers API updated for full hierarchy');
