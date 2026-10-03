const fs = require('fs');
const path = 'src/app/api/customers/route.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/territoryId: true,/g, 'territoryId: true,\n        priceListId: true,');
c = c.replace(/territoryId, beatId, openingBalance, openingBalanceDate } = body;/g, 'territoryId, beatId, openingBalance, openingBalanceDate, priceListId } = body;');
c = c.replace(/territoryId: territoryId \|\| null,/g, 'territoryId: territoryId || null,\n              priceListId: priceListId || null,');
c = c.replace(/territoryId, beatId, isActive/g, 'territoryId, priceListId, beatId, isActive');

fs.writeFileSync(path, c);
console.log("Updated customers API");
