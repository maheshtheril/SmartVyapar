const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\tenant\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const territoryNav = `{ 
              id: "territories-master", 
              name: "Territories Master (FMCG)", 
              href: "/territories", 
              icon: "Map" 
            },`;

c = c.replace(/\{\s*id: "customers",\s*name: "Customer Directory & Balance",\s*href: "\/customers",\s*icon: "Users"\s*\},/, `{\n              id: "customers",\n              name: "Customer Directory & Balance",\n              href: "/customers",\n              icon: "Users"\n            },\n            ${territoryNav}`);

fs.writeFileSync(p, c, 'utf8');
console.log('Sidebar nav updated with Territories Master');
