const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\tenant\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /id: "vendor-payables",\s*name: "Vendor Payables & Aging",\s*href: "\/inventory\/suppliers",\s*icon: "Users",\s*\},/g,
  'id: "supplier-master", name: "Supplier Master", href: "/inventory/suppliers", icon: "Users" },'
);

c = c.replace(
  /id: "payables",\s*name: "Accounts Payable",\s*href: "\/inventory\/payables",/g,
  'id: "vendor-payables", name: "Vendor Payables & Aging", href: "/inventory/payables",'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed menu titles');
