const fs = require('fs');

const scannerPath = 'src/lib/ai-invoice-scanner.ts';
let scannerCode = fs.readFileSync(scannerPath, 'utf8');

scannerCode = scannerCode.replace(
  /if \(\/RESOURCE_EXHAUSTED\|quota\|429\/i\.test\(err\.message\)\) \{\s*break; \/\/ Stop hammering the API if we are rate limited\s*\}/m,
  `if (/RESOURCE_EXHAUSTED|quota|429/i.test(err.message)) {
          // If 2.5-flash hits its tiny 20 RPD free tier limit, we must fall back to 1.5-flash which has 1500 RPD
          console.warn(\`[AI Invoice Scanner] Rate limited on \${modelName}. Falling back...\`);
        }`
);

fs.writeFileSync(scannerPath, scannerCode);
console.log("Updated loop rate limit handling to allow fallback to 1.5-flash");
