const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\settings\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/\{ id: 'RETAIL', label: 'Retail & Wholesale', desc: 'Electricals, Supermarket, Garments, Electronics', emoji: '🛒' \},/, 
`{ id: 'RETAIL', label: 'Retail & POS', desc: 'Electricals, Supermarket, Garments, Electronics', emoji: '🛒' },\n                      { id: 'DISTRIBUTION', label: 'FMCG & Distribution', desc: 'Territory management, wholesale beats, distribution', emoji: '🚚' },`);

c = c.replace(/className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2\.5"/, `className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5"`);

fs.writeFileSync(p, c, 'utf8');
console.log('Settings page updated with Distribution');
