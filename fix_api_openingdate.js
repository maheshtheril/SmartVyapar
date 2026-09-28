const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/openingBalance \}/g, "openingBalance, openingBalanceDate }");
c = c.replace(/openingBalance: parseFloat\(openingBalance\) \|\| 0,/g, "outstandingBalance: parseFloat(openingBalance) || 0,\n              openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null,");
c = c.replace(/isActive: isActive !== undefined \? isActive : true,/g, "isActive: isActive !== undefined ? isActive : true,\n          ...(openingBalanceDate !== undefined && { openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null }),");
c = c.replace(/createdAt: true,/g, "createdAt: true,\n          openingBalanceDate: true,");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed API for openingBalanceDate');
