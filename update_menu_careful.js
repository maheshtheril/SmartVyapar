const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\tenant\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/\{\s*id:\s*"inventory-transfers"/g, '{\n              id: "supplier-master",\n              name: "Supplier Master",\n              href: "/inventory/suppliers",\n              icon: "Users",\n              isPro: false\n            },\n            { id: "inventory-transfers"');

fs.writeFileSync(p, c, 'utf8');
console.log('Menu updated successfully');
