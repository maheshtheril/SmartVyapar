const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /partNumber: z\.string\(\)\.trim\(\)\.optional\(\)\.default\(""\),/g,
  `partNumber: z.string().trim().optional().describe("Always extract the OEM/Part Number if it exists in the name."),`
);

fs.writeFileSync(path, c);
console.log("Improved partNumber prompt.");
