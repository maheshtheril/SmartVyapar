const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\lib\\\\schemas\\\\register.ts';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('businessType: z')) {
  c = c.replace(/isComposition: z\.boolean\(\)\.default\(false\),/, `isComposition: z.boolean().default(false),\n  businessType: z.enum(["RETAIL", "DISTRIBUTION", "RESTAURANT", "SERVICES"]).default("RETAIL"),`);
  fs.writeFileSync(p, c, 'utf8');
}

p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\auth\\\\register\\\\route.ts';
c = fs.readFileSync(p, 'utf8');

if (!c.includes('enableTerritory: data.businessType === "DISTRIBUTION",')) {
  c = c.replace(/businessType: "RETAIL",/, `businessType: data.businessType,\n            enableTerritory: data.businessType === "DISTRIBUTION",`);
  fs.writeFileSync(p, c, 'utf8');
}

console.log('Register schema and API updated');
