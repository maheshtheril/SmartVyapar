const fs = require('fs');

// 1. Update Sidebar Menu
const routePath = 'src/app/api/tenant/route.ts';
let route = fs.readFileSync(routePath, 'utf8');
route = route.replace(/name: "Price Lists \(Tiers\)"/g, 'name: "Price Lists"');
fs.writeFileSync(routePath, route);

// 2. Update Price Lists Page
const pagePath = 'src/app/(app)/inventory/price-lists/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');
page = page.replace(/>Price Lists \(Wholesale Tiers\)</g, '>Price Lists<');
page = page.replace(/Create rule-based pricing tiers for your customers/g, 'Create custom pricing rules and tiers for your customers');
fs.writeFileSync(pagePath, page);

// 3. Update Customers Page
const custPath = 'src/app/(app)/customers/page.tsx';
let cust = fs.readFileSync(custPath, 'utf8');
cust = cust.replace(/Price List \(Wholesale Tier\)/g, 'Price List');
fs.writeFileSync(custPath, cust);

console.log("Updated UI text");
