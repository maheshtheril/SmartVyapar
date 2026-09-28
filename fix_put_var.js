const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/isActive, outstandingBalance \} = body;/, 'isActive, outstandingBalance, openingBalanceDate } = body;');
fs.writeFileSync(p, c, 'utf8');
