const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /"purchasePrice": Billed unit rate before discount and tax/g,
  `"purchasePrice": Billed UNIT RATE (price for exactly 1 unit). Do NOT put the Line Total here. If the bill only shows the final line total, you MUST divide that total by the quantity to get the purchasePrice`
);

// Also add a math correction loop just in case
c = c.replace(
  /const rawParsed = JSON\.parse\(cleanJson\);\s*return ScannedInvoiceResultSchema\.parse\(rawParsed\);/g,
  `const rawParsed = JSON.parse(cleanJson);
    
    // Auto-correct hallucinated purchase prices
    if (rawParsed.items && Array.isArray(rawParsed.items)) {
       rawParsed.items.forEach((item) => {
         const qty = Number(item.quantity || 1);
         const cost = Number(item.purchasePrice || 0);
         const lineTot = Number(item.lineTotal || 0);
         
         if (qty > 1 && lineTot > 0 && Math.abs(cost - lineTot) < 0.5) {
             // The AI hallucinated and dumped the line total into the unit cost
             item.purchasePrice = lineTot / qty;
         }
       });
    }

    return ScannedInvoiceResultSchema.parse(rawParsed);`
);

fs.writeFileSync(path, c);
console.log("Fixed AI purchase price hallucination by updating prompt and adding math autocorrect.");
