const fs = require('fs');

const scannerPath = 'src/lib/ai-invoice-scanner.ts';
let scannerCode = fs.readFileSync(scannerPath, 'utf8');

scannerCode = scannerCode.replace(
  /lastError = err;\s*console\.warn\(\`\[AI Invoice Scanner\] Model \$\{modelName\} failed \(\$\{err\.message\}\)\. Trying next candidate...\`\);\s*\}/m,
  `lastError = err;
        console.warn(\`[AI Invoice Scanner] Model \${modelName} failed (\${err.message}).\`);
        if (/RESOURCE_EXHAUSTED|quota|429/i.test(err.message)) {
          break; // Stop hammering the API if we are rate limited
        }
      }`
);

fs.writeFileSync(scannerPath, scannerCode);
console.log("Updated loop rate limit handling");
