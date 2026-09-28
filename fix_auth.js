const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\suppliers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/requireRole\(\['ADMIN', 'MANAGER', 'CASHIER'\]\)/g, "requireRole(req, ['ADMIN', 'MANAGER', 'CASHIER'])");
c = c.replace(/requireRole\(\['ADMIN', 'MANAGER'\]\)/g, "requireRole(req, ['ADMIN', 'MANAGER'])");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed auth arguments');
