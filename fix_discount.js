const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /purchasePrice: \{ type: "number" \},/g,
  `purchasePrice: { type: "number" },\n                        discountPercent: { type: "number" },`
);

c = c.replace(
  /required: \["productName", "suggestedDisplayName", "quantity", "purchasePrice", "partNumber", "hsnCode", "batchNumber", "unit", "lineTotal"\]/g,
  `required: ["productName", "suggestedDisplayName", "quantity", "purchasePrice", "discountPercent", "partNumber", "hsnCode", "batchNumber", "unit", "lineTotal"]`
);

fs.writeFileSync(path, c);
console.log("Added discountPercent to strict JSON schema");
