const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/fetchCustomers\(\)/g, "load()");

fs.writeFileSync(p, c, 'utf8');
console.log('Replaced fetchCustomers with load in customers page');
