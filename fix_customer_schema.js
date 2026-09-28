const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\prisma\\\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/loyaltyPoints      Int      @default\(0\)/, 'loyaltyPoints      Int      @default(0)\n    isActive           Boolean  @default(true)');
fs.writeFileSync(p, c, 'utf8');
console.log('Added isActive to Customer schema');
