const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\prisma\\\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('isActive  Boolean')) {
  c = c.replace(/accountId String\? @unique/, 'accountId String? @unique\n    isActive  Boolean @default(true)');
  fs.writeFileSync(p, c, 'utf8');
}
console.log('Added isActive to Supplier schema');
