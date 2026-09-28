const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/stateCode: true,/, "stateCode: true,\n        regionId: true,\n        zoneId: true,\n        beatId: true,\n        isActive: true,");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed GET select fields');
