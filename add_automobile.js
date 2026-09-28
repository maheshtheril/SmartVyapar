const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\register\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/\{ id: 'SERVICES', label: 'Services & Billing' \}/, `{ id: 'SERVICES', label: 'Services & Billing' },\n                  { id: 'AUTOMOBILE', label: 'Automobile & Garage' }`);
fs.writeFileSync(p, c, 'utf8');

p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\lib\\\\schemas\\\\register.ts';
c = fs.readFileSync(p, 'utf8');
c = c.replace(/"RETAIL", "DISTRIBUTION", "RESTAURANT", "SERVICES"/, `"RETAIL", "DISTRIBUTION", "RESTAURANT", "SERVICES", "AUTOMOBILE"`);
fs.writeFileSync(p, c, 'utf8');

console.log('Automobile added to register page');
