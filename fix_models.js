const fs = require('fs');

const scannerPath = 'src/lib/ai-invoice-scanner.ts';
let scannerCode = fs.readFileSync(scannerPath, 'utf8');

scannerCode = scannerCode.replace(
  /const CANDIDATE_MODELS = \[[\s\S]*?\];/m,
  `const CANDIDATE_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ];`
);

fs.writeFileSync(scannerPath, scannerCode);
console.log("Updated AI models to support 3.5");
