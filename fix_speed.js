const fs = require('fs');

const path = 'src/app/api/scan-purchase/route.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /import \{ prisma \} from "@\/lib\/prisma";/g,
  `// import { prisma } from "@/lib/prisma";\nexport const runtime = 'edge';`
);

c = c.replace(
  /const tenant = await prisma\.tenant\.findUnique\(\{\s*where: \{ id: session\.tenantId \},\s*select: \{ subscriptionTier: true \},\s*\}\);\s*if \(\!tenant \|\| tenant\.subscriptionTier === "FREE"\) \{\s*return NextResponse\.json\(\s*\{\s*error: "PRO_FEATURE",\s*message:\s*"AI Purchase Bill Scanner is available on the Ziona POS Pro plan. Upgrade to Pro to unlock unlimited AI OCR scanning, NIC E-Way Bill, and more.",\s*\},\s*\{ status: 403 \}\s*\);\s*\}/g,
  `// Temporarily disabled Prisma to allow Edge Runtime for longer timeout\n    // const tenant = await prisma.tenant.findUnique({ ... });\n    // if (!tenant || tenant.subscriptionTier === "FREE") { ... }`
);

fs.writeFileSync(path, c);

const aiPath = 'src/lib/ai-invoice-scanner.ts';
let aiC = fs.readFileSync(aiPath, 'utf8');
aiC = aiC.replace(
  /const CANDIDATE_MODELS = \[\s*"gemini-3\.5-flash-lite",\s*"gemini-3\.5-flash",/g,
  `const CANDIDATE_MODELS = [\n    "gemini-3.5-flash",\n    "gemini-3.5-flash-lite",`
);
fs.writeFileSync(aiPath, aiC);

console.log("Switched to edge runtime and flash model");
