const fs = require('fs');
let p = 'C:\\2035-HMS\\ZionaPOS\\src\\app\\(app)\\inventory\\purchase\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/const DEFAULT_SUPPLIERS[\s\S]*?\];/, 'const DEFAULT_SUPPLIERS: SupplierOption[] = [];');
c = c.replace(/Presets: Bosch Castrol Exide/, 'Vendor Search');

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed purchase page');
