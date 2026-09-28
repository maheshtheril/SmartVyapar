const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\tenant\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('supplier-master')) {
    c = c.replace(
        /href: "\/inventory\/purchase",\s*isPro: false,\s*\}/g,
        'href: "/inventory/purchase", isPro: false },\n          { id: "supplier-master", name: "Supplier Master", href: "/inventory/suppliers", isPro: false }'
    );
    fs.writeFileSync(p, c, 'utf8');
    console.log('Menu updated');
} else {
    console.log('Already updated');
}
