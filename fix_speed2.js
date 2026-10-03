const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /const CANDIDATE_MODELS = \[\s*"gemini-3\.5-flash",\s*"gemini-3\.5-flash-lite",/g,
  `const CANDIDATE_MODELS = [\n    "gemini-3.5-flash-lite",\n    "gemini-3.5-flash",`
);

fs.writeFileSync(path, c);
console.log("Switched back to flash-lite");
