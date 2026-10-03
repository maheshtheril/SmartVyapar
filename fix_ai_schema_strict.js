const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /gstRate: \{ type: "number" \}\s*\},/g,
  `gstRate: { type: "number" },\n                      lineTotal: { type: "number" }\n                    },`
);

c = c.replace(
  /required: \["productName", "suggestedDisplayName", "quantity", "purchasePrice", "partNumber", "hsnCode", "batchNumber", "unit"\]/g,
  `required: ["productName", "suggestedDisplayName", "quantity", "purchasePrice", "partNumber", "hsnCode", "batchNumber", "unit", "lineTotal"]`
);

fs.writeFileSync(path, c);
console.log("Added lineTotal to AI strict schema");
