const fs = require('fs');

const scannerPath = 'src/lib/ai-invoice-scanner.ts';
let scannerCode = fs.readFileSync(scannerPath, 'utf8');

scannerCode = scannerCode.replace(
  /export async function scanPurchaseInvoiceWithGemini\([\s\S]*?Promise<ScannedInvoiceResult> \{/m,
  `export async function scanPurchaseInvoiceWithGemini(
  files: { base64Data: string; mimeType: string }[],
  apiKey?: string
): Promise<ScannedInvoiceResult> {`
);

scannerCode = scannerCode.replace(
  /role: "user",[\s\S]*?parts: \[[\s\S]*?\{ text: prompt \},[\s\S]*?\{ inlineData: \{ mimeType: mimeType \|\| "image\/jpeg", data: base64Data \} \},[\s\S]*?\],/m,
  `role: "user",
              parts: [
                { text: prompt },
                ...files.map(f => ({ inlineData: { mimeType: f.mimeType || "image/jpeg", data: f.base64Data } })),
              ],`
);

fs.writeFileSync(scannerPath, scannerCode);
console.log("Updated ai-invoice-scanner correctly.");
