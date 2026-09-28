const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\prisma\\\\schema.prisma';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('openingBalanceDate')) {
  c = c.replace(/outstandingBalance Decimal\s*@default\(0\.0\)\s*@db\.Decimal\(10, 2\).*/, "$&\n  openingBalanceDate DateTime?");
  fs.writeFileSync(p, c, 'utf8');
  console.log('Added openingBalanceDate to Customer');
} else {
  console.log('already added');
}
