const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/openingBalance: openingBalance \? parseFloat\(openingBalance\) : 0,/, "openingBalance: openingBalance ? parseFloat(openingBalance) : 0,\n            openingBalanceDate: addOpeningBalanceDate || undefined,");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed handleAddCustomer payload');
