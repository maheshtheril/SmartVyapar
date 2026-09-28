const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\territories\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/orderBy: \[\n\s*\{ zone: "asc" \},\n\s*\{ name: "asc" \},\n\s*\],/, `orderBy: [\n        { name: "asc" },\n      ],`);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed Territory API orderBy type error');
