const fs = require('fs');

const path = 'src/app/api/purchase/route.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/"1200", "1410"/g, '"1300", "1410"');
c = c.replace(/accountMap\.get\("1200"\)/g, 'accountMap.get("1300")');

fs.writeFileSync(path, c);
console.log("Updated API logic");
