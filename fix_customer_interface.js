const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/loyaltyPoints: number;\s*totalBills: number;/, "loyaltyPoints: number;\n  totalBills: number;\n  isActive?: boolean;");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed Customer interface in page.tsx');
