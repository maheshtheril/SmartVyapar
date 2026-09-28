const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\suppliers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/requireRole\(req, \['ADMIN', 'MANAGER', 'CASHIER'\]\)/g, "requireRole(req, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'])");
c = c.replace(/requireRole\(req, \['ADMIN', 'MANAGER'\]\)/g, "requireRole(req, ['OWNER', 'ADMIN', 'MANAGER'])");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed role permissions in Suppliers API');
