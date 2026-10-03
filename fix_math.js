const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// Fix 1: Projected Gross Profit loop
c = c.replace(
  /const sp = Number\(item\.sellingPrice \|\| 0\);\s*projectedGrossProfit \+= \(sp - cost\) \* qty;/g,
  `const sp = Number(item.sellingPrice || 0);
      const landedCost = tenant?.isComposition ? cost * (1 + Number(item.gstRate || 0) / 100) : cost;
      projectedGrossProfit += (sp - landedCost) * qty;`
);

// Fix 2: updateEditItem manual sellingPrice change
c = c.replace(
  /} else if \(field === 'sellingPrice'\) \{\s*\/\/ If user manually changed sellingPrice -> compute marginPercent\s*const cost = Number\(row\.purchasePrice \|\| 0\) \* \(1 - Number\(row\.discountPercent \|\| 0\) \/ 100\);\s*const sp = Number\(value \|\| 0\);\s*if \(cost > 0\) \{\s*row\.marginPercent = Math\.round\(\(\(sp - cost\) \/ cost\) \* 1000\) \/ 10;\s*\}/m,
  `} else if (field === 'sellingPrice') {
        // If user manually changed sellingPrice -> compute marginPercent
        const cost = Number(row.purchasePrice || 0) * (1 - Number(row.discountPercent || 0) / 100);
        const landedCost = tenant?.isComposition ? cost * (1 + Number(row.gstRate || 0) / 100) : cost;
        const sp = Number(value || 0);
        if (landedCost > 0) {
          row.marginPercent = Math.round(((sp - landedCost) / landedCost) * 1000) / 10;
        }`
);

// Fix 3: Editing modal unitProfit
c = c.replace(
  /const cost = Number\(row\.purchasePrice \|\| 0\) \* \(1 - Number\(row\.discountPercent \|\| 0\) \/ 100\);\s*const sp = Number\(row\.sellingPrice \|\| 0\);\s*const unitProfit = Math\.round\(\(sp - cost\) \* 100\) \/ 100;/g,
  `const cost = Number(row.purchasePrice || 0) * (1 - Number(row.discountPercent || 0) / 100);
                          const sp = Number(row.sellingPrice || 0);
                          const landedCost = tenant?.isComposition ? cost * (1 + Number(row.gstRate || 0) / 100) : cost;
                          const unitProfit = Math.round((sp - landedCost) * 100) / 100;`
);

fs.writeFileSync(path, c);
console.log("Updated margin/profit math for Composition mode.");
