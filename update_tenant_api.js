const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\tenant\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('...(businessType === "DISTRIBUTION" ? { enableTerritory: true } : {}),')) {
  c = c.replace(/\.\.\.\(businessType !== undefined \? \{ businessType \} : \{\}\),/, `...(businessType !== undefined ? { businessType } : {}),\n        ...(businessType === "DISTRIBUTION" ? { enableTerritory: true } : {}),`);
  fs.writeFileSync(p, c, 'utf8');
}
console.log('Tenant API updated to toggle enableTerritory based on businessType update');
