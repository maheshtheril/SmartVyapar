const fs = require('fs');
const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

const regex = /properties: \{\s*billNumber:/;
const replacement = `properties: {
                supplierName: { type: "string" },
                supplierGstin: { type: "string" },
                billNumber:`;

c = c.replace(regex, replacement);

fs.writeFileSync(path, c);
console.log("Added supplier fields to responseSchema.");
