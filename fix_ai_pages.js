const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /Analyze this invoice image or document and extract the vendor/g,
  "Analyze this entire invoice document (ALL PAGES) and extract the vendor"
);

c = c.replace(
  /RULES:/g,
  `RULES:\n0. COMPLETE EXTRACTION: You MUST read EVERY SINGLE PAGE of the document if it has multiple pages. You MUST extract EVERY SINGLE LINE ITEM from ALL pages. Do not stop at page 1. Do not truncate.`
);

fs.writeFileSync(path, c);
console.log("Instructed Gemini to read all pages of PDFs.");
