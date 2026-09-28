const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\tenant\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const fieldSalesNav = `{ 
              id: "field-sales", 
              name: "Field Sales App (Mobile)", 
              href: "/field-sales", 
              icon: "Smartphone",
              badge: "New",
              badgeColor: "emerald"
            },`;

c = c.replace(/\{\s*id: "territories-master",/, `${fieldSalesNav}\n            {\n              id: "territories-master",`);

fs.writeFileSync(p, c, 'utf8');
console.log('Sidebar nav updated with Field Sales App');
