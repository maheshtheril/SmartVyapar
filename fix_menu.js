const fs = require('fs');
const path = 'src/app/api/tenant/route.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `{ 
              id: "stock", 
              name: "Product Catalog & Stock", 
              href: "/inventory", 
              icon: "Package",
              badge: lowStockCount > 0 ? \`\${lowStockCount}\` : undefined,
              badgeColor: "rose"
            },`,
  `{ 
              id: "stock", 
              name: "Product Catalog & Stock", 
              href: "/inventory", 
              icon: "Package",
              badge: lowStockCount > 0 ? \`\${lowStockCount}\` : undefined,
              badgeColor: "rose"
            },
            {
              id: "price-lists",
              name: "Price Lists (Tiers)",
              href: "/inventory/price-lists",
              icon: "Tag",
              badge: "New",
              badgeColor: "emerald",
            },`
);

fs.writeFileSync(path, c);
console.log("Updated sidebar menu");
