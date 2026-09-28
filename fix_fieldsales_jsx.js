const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\field-sales\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/routeName: \\`\\\$\{b\.name\} \(\\\$\{t\.name\}\)\\`/, "routeName: `${b.name} (${t.name})`");
c = c.replace(/className=\{\\`py-4 flex flex-col items-center justify-center gap-1 \\\$\{activeTab === 'PRODUCTS' \? 'text-indigo-600' : 'text-slate-400'\} \\\$\{!selectedCustomer \? 'opacity-30' : ''\}\\`\}/, "className={`py-4 flex flex-col items-center justify-center gap-1 ${activeTab === 'PRODUCTS' ? 'text-indigo-600' : 'text-slate-400'} ${!selectedCustomer ? 'opacity-30' : ''}`}");
c = c.replace(/className=\{\\`py-4 flex flex-col items-center justify-center gap-1 relative \\\$\{activeTab === 'CART' \? 'text-indigo-600' : 'text-slate-400'\} \\\$\{!selectedCustomer \? 'opacity-30' : ''\}\\`\}/, "className={`py-4 flex flex-col items-center justify-center gap-1 relative ${activeTab === 'CART' ? 'text-indigo-600' : 'text-slate-400'} ${!selectedCustomer ? 'opacity-30' : ''}`}");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed escaped backticks in field-sales page');
