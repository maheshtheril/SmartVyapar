const fs = require('fs');
const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// I need to change:
// const cost = Number(it.purchasePrice || 0) * (1 - Number(it.discountPercent || 0) / 100);
// to calculate landed cost if tenant?.isComposition === true

const replaceRegex = /const cost = Number\(([^.]+)\.purchasePrice \|\| 0\) \* \(1 - Number\(\1\.discountPercent \|\| 0\) \/ 100\);/g;

c = c.replace(replaceRegex, (match, itName) => {
    return `
    const __baseCost = Number(${itName}.purchasePrice || 0) * (1 - Number(${itName}.discountPercent || 0) / 100);
    const __gstMultiplier = tenant?.isComposition ? (1 + Number(${itName}.gstRate || 0) / 100) : 1;
    const cost = __baseCost * __gstMultiplier;
    `.trim();
});

// There is one place that does `const cost = Number(found.purchasePrice || 0);`
c = c.replace(/const cost = Number\(found\.purchasePrice \|\| 0\);/g, 
  `const __baseCost = Number(found.purchasePrice || 0);\n        const __gstMultiplier = tenant?.isComposition ? (1 + Number(found.gstRate || 0) / 100) : 1;\n        const cost = __baseCost * __gstMultiplier;`);

fs.writeFileSync(path, c);
console.log("Margin fixed");
