const fs = require('fs');
const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace('generationConfig: { responseMimeType: "application/json" }', 'config: { responseMimeType: "application/json" }');

fs.writeFileSync(path, c);
console.log("Fixed SDK compilation error for real.");
