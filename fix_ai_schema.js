const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /suggestedDisplayName: z\.string\(\)\.trim\(\)\.optional\(\)\.default\(""\),/g,
  `suggestedDisplayName: z.string().trim().describe("Mandatory. You must ALWAYS generate a clean, readable POS display name. Never leave this blank."),`
);

fs.writeFileSync(path, c);
console.log("Forced AI to always generate suggestedDisplayName.");
