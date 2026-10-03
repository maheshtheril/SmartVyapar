const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /"gemini-3\.5-flash-lite",\n\s*"gemini-3\.5-flash",/g,
  `"gemini-3.5-flash",\n    "gemini-3.5-flash-lite",`
);

c = c.replace(
  /model: modelName,/g,
  `model: modelName,\n          generationConfig: { responseMimeType: "application/json" },`
);

// We should also make suggestedDisplayName optional but heavily encouraged, so Zod doesn't instantly throw an error if the AI misses just 1 out of 33 items!
c = c.replace(
  /suggestedDisplayName: z\.string\(\)\.trim\(\)\.describe\("Mandatory\. You must ALWAYS generate a clean, readable POS display name\. Never leave this blank\."\),/g,
  `suggestedDisplayName: z.string().trim().optional().default("").describe("Strongly Required. You must ALWAYS generate a clean, readable POS display name. Never leave this blank."),`
);

fs.writeFileSync(path, c);
console.log("Fixed AI model priority, JSON config, and schema strictness.");
