const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\tenant\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/href: "\/inventory\/payables",/g, 'href: "/inventory/suppliers",\n              icon: "Users",\n            },\n            {\n              id: "payables",\n              name: "Accounts Payable",\n              href: "/inventory/payables",');

fs.writeFileSync(p, c, 'utf8');
console.log('Menu updated perfectly');
