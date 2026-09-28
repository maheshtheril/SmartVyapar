const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/const \{ name, phone, gstin, stateCode, email, address, pincode, regionId, zoneId, territoryId, beatId \} = body;/, 'const { name, phone, gstin, stateCode, email, address, pincode, regionId, zoneId, territoryId, beatId, openingBalance } = body;');

c = c.replace(/balance: 0,/, 'balance: parseFloat(openingBalance) || 0,');
c = c.replace(/accountId: arAccount.id/, 'accountId: arAccount.id,\n              outstandingBalance: parseFloat(openingBalance) || 0');

fs.writeFileSync(p, c, 'utf8');
console.log('Customers API updated with openingBalance');
