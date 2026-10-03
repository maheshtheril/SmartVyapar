const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /const CANDIDATE_MODELS = \[\s*"gemini-3\.5-flash",\s*"gemini-3\.5-flash-lite",/g,
  `const CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",`
);

fs.writeFileSync(path, c);
console.log("Swapped flash-lite to be the primary model to avoid Vercel timeouts.");
