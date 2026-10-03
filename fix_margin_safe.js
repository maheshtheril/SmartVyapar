const fs = require('fs');
const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `const newSP = cost > 0 ? Math.round(cost * (1 + margin / 100) * 100) / 100 : it.sellingPrice;`,
  `const landedCost = tenant?.isComposition ? cost * (1 + Number(it.gstRate || 0) / 100) : cost;
        const newSP = landedCost > 0 ? Math.round(landedCost * (1 + margin / 100) * 100) / 100 : it.sellingPrice;`
);

c = c.replace(
  `const margin = cost > 0 ? Math.round(((sp - cost) / cost) * 1000) / 10 : globalMargin;`,
  `const landedCost = tenant?.isComposition ? cost * (1 + Number(found.gstRate || 0) / 100) : cost;
        const margin = landedCost > 0 ? Math.round(((sp - landedCost) / landedCost) * 1000) / 10 : globalMargin;`
);

c = c.replace(
  `row.sellingPrice = Math.round(cost * (1 + margin / 100) * 100) / 100;`,
  `const landedCost = tenant?.isComposition ? cost * (1 + Number(row.gstRate || 0) / 100) : cost;
        row.sellingPrice = Math.round(landedCost * (1 + margin / 100) * 100) / 100;`
);

c = c.replace(
  `if (cost > 0) {\n          row.marginPercent = Math.round(((sp - cost) / cost) * 1000) / 10;\n        }`,
  `const landedCost = tenant?.isComposition ? cost * (1 + Number(row.gstRate || 0) / 100) : cost;
        if (landedCost > 0) {
          row.marginPercent = Math.round(((sp - landedCost) / landedCost) * 1000) / 10;
        }`
);

c = c.replace(
  `const unitProfit = Math.round((sp - cost) * 100) / 100;`,
  `const landedCost = tenant?.isComposition ? cost * (1 + Number(row.gstRate || 0) / 100) : cost;
                          const unitProfit = Math.round((sp - landedCost) * 100) / 100;`
);

c = c.replace(
  `row.sellingPrice = Math.round(cost * (1 + Number(row.marginPercent || 0) / 100) * 100) / 100;`,
  `const landedCost = tenant?.isComposition ? cost * (1 + Number(row.gstRate || 0) / 100) : cost;
                  row.sellingPrice = Math.round(landedCost * (1 + Number(row.marginPercent || 0) / 100) * 100) / 100;`
);

c = c.replace(
  `if (cost > 0) row.marginPercent = Math.round(((Number(value) - cost) / cost) * 1000) / 10;`,
  `const landedCost = tenant?.isComposition ? cost * (1 + Number(row.gstRate || 0) / 100) : cost;
                  if (landedCost > 0) row.marginPercent = Math.round(((Number(value) - landedCost) / landedCost) * 1000) / 10;`
);

fs.writeFileSync(path, c);
console.log("Margin logic fixed safely");
