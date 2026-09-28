const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\tenant\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/name: "Parties & Khata",/g, 'name: "Customers & Receivables",');

fs.writeFileSync(p, c, 'utf8');
console.log('Renamed Khata');
