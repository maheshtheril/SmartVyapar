import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const ScannedPurchaseItemSchema = z.object({
  productName: z.string().trim().default("Unknown Item"),
  suggestedDisplayName: z.string().trim().describe("Mandatory. You must ALWAYS generate a clean, readable POS display name. Never leave this blank."),
  partNumber: z.string().trim().optional().describe("Always extract the OEM/Part Number if it exists in the name."),
  hsnCode: z.string().trim().optional(),
  batchNumber: z.string().trim().optional().default(""),
  expiryDate: z.string().trim().optional().default(""),
  unit: z.string().trim().default("PCS"),
  quantity: z.coerce.number().positive().default(1),
  packageSize: z.coerce.number().positive().default(1),
  baseUnit: z.string().trim().default("PCS"),
  baseQuantity: z.coerce.number().positive().default(1),
  purchasePrice: z.coerce.number().nonnegative().default(0),
  discountPercent: z.coerce.number().nonnegative().default(0),
  baseCostPrice: z.coerce.number().nonnegative().default(0),
  mrp: z.coerce.number().nonnegative().optional().nullable(),
  gstRate: z.coerce.number().nonnegative().default(18),
  lineTotal: z.coerce.number().nonnegative().default(0),
});

export const ScannedInvoiceResultSchema = z.object({
  supplierName: z.string().trim().default("Unknown Vendor"),
  supplierGstin: z.string().trim().optional().default(""),
  billNumber: z.string().trim().default("BILL-001"),
  billDate: z.string().trim().optional().default(""),
  items: z.array(ScannedPurchaseItemSchema).default([]),
  totalTaxable: z.coerce.number().nonnegative().default(0),
  cgstAmount: z.coerce.number().nonnegative().default(0),
  sgstAmount: z.coerce.number().nonnegative().default(0),
  igstAmount: z.coerce.number().nonnegative().default(0),
  totalAmount: z.coerce.number().nonnegative().default(0),
  confidenceScore: z.coerce.number().min(0).max(1).default(0.9),
});

export type ScannedPurchaseItem = z.infer<typeof ScannedPurchaseItemSchema>;
export type ScannedInvoiceResult = z.infer<typeof ScannedInvoiceResultSchema>;

export function cleanHumanReadableAiError(error: any): string {
  if (!error) {
    return "AI Scanner is temporarily unavailable. Please enter items manually.";
  }
  const msg = typeof error === "string" ? error : error.message || String(error);

  if (/API_KEY_INVALID|API key not valid/i.test(msg)) {
    return "AI Scanner configuration error. Please contact support.";
  }
  if (/PERMISSION_DENIED|denied access|403/i.test(msg)) {
    return "AI Scanner is temporarily unavailable. Please enter items manually.";
  }
  if (/RESOURCE_EXHAUSTED|quota|429/i.test(msg)) {
    return "AI Scanner is busy right now. Please wait a moment and try again, or enter items manually.";
  }
  if (/not found|404|no longer available/i.test(msg)) {
    return "AI Scanner service is temporarily unavailable. Please enter items manually.";
  }
  if (/timed out|timeout/i.test(msg)) {
    return "AI scan took too long. Please try a clearer or smaller image, or enter items manually.";
  }
  if (/not configured|missing|empty/i.test(msg)) {
    return "AI Scanner is not configured. Please contact support.";
  }
  if (/fetch|network|ECONNREFUSED/i.test(msg)) {
    return "AI Scanner is temporarily unavailable. Please enter items manually.";
  }

  return "Unable to scan this invoice. Please ensure the image is clear, or enter items manually.";
}

export async function scanPurchaseInvoiceWithGemini(
  files: { base64Data: string; mimeType: string }[],
  apiKey?: string
): Promise<ScannedInvoiceResult> {
  const isValidKey = (k: string) => k.startsWith("AIzaSy") || k.startsWith("AQ.");
  const validCustomKey = apiKey && isValidKey(apiKey.trim()) ? apiKey.trim() : undefined;
  const finalApiKey = validCustomKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!finalApiKey || finalApiKey.trim() === "") {
    throw new Error("AI Scanner is not configured. Please contact support.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey, apiVersion: "v1" });

  const prompt = `
You are an expert Purchase Invoice and Bill OCR auditor with specialized knowledge across wholesale, pharmaceutical/medical, retail, and manufacturing sectors.
Analyze this invoice image or document and extract the vendor, items, packaging units, tax slabs, batch numbers, expiry dates, and totals into a strict JSON object.

RULES:
1. Vendor/Supplier: Extract exact business name, GSTIN (15 characters if present), bill/invoice number, and bill date (YYYY-MM-DD format).
2. Line Items & Packaging (UOM) Intelligence:
   - Invoices can be from any sector: medical/pharma (medicines, tablets, injections, syrups, surgicals), grocery, electronics, auto, or retail.
   - For pharmaceuticals & perishable goods, carefully capture "batchNumber" and "expiryDate" (YYYY-MM-DD if available).
   - Invoices often bill in packaging units ('BOX', 'STRIP', 'BOTTLE', 'VIAL', 'AMP', 'CTN', 'PKT', 'DOZ', 'PCS', 'KG', 'MTR').
   - Extract:
     - "productName": Exact raw item name or description as printed on the bill
     - "suggestedDisplayName": A clean, human-readable display alias for internal POS use. Strip out weird symbols, excessive measurements, and supplier junk. (e.g., if raw is "QH-TSM70031MS2 /FRONT STRUT MOUNT MARUTI SX4 /SWIFT", return "Swift Front Strut Mount")
     - "partNumber": Extract the exact OEM or Manufacturer Part Number if it is embedded in the description (e.g., "QH-TSM70031MS2")
     - "hsnCode": HSN/SAC code if listed (else "")
     - "batchNumber": Batch or Lot ID if present (else "")
     - "expiryDate": Expiry date if pharma/food (YYYY-MM-DD or "")
     - "unit": Billed unit (e.g., "STRIP", "BOX", "BOTTLE", "PCS", "KG", "MTR")
     - "quantity": Number of units billed (numeric, supports decimals e.g. 2.50)
     - "packageSize": Multiplier if packaging unit (e.g. if 1 Box has 10 Strips, packageSize is 10. If loose/single unit, packageSize is 1)
     - "baseUnit": Atomic base inventory unit (e.g. "STRIP", "TAB", "PCS", "NOS")
     - "baseQuantity": Effective atomic quantity entering inventory (= quantity * packageSize)
     - "purchasePrice": Billed unit rate before discount and tax
     - "discountPercent": Trade/cash discount percentage on the line item (e.g. 37.08 if "Disc%" column shows 37.08; 0 if no discount)
     - "baseCostPrice": Cost per atomic base unit after discount (= purchasePrice * (1 - discountPercent/100) / packageSize)
     - "mrp": Maximum Retail Price if listed (numeric)
     - "gstRate": Applicable GST slab (e.g. 0, 5, 12, 18, 28)
     - "lineTotal": Total item amount
3. Tax Breakdown:
   - "totalTaxable": Total subtotal before tax
   - "cgstAmount": CGST amount
   - "sgstAmount": SGST amount
   - "igstAmount": IGST amount
   - "totalAmount": Final net bill total after roundoff
4. "confidenceScore": A number between 0.0 and 1.0 indicating OCR quality.

Return ONLY a valid JSON object matching this schema, with no markdown code blocks or backticks:
{
  "supplierName": "string",
  "supplierGstin": "string",
  "billNumber": "string",
  "billDate": "YYYY-MM-DD",
  "items": [
    {
      "productName": "string",
      "hsnCode": "string",
      "batchNumber": "string",
      "expiryDate": "string",
      "unit": "BOX",
      "quantity": 5,
      "packageSize": 10,
      "baseUnit": "PCS",
      "baseQuantity": 50,
      "purchasePrice": 1200.0,
      "discountPercent": 0.0,
      "baseCostPrice": 120.0,
      "mrp": 150.0,
      "gstRate": 18.0,
      "lineTotal": 6000.0
    }
  ],
  "totalTaxable": 0.0,
  "cgstAmount": 0.0,
  "sgstAmount": 0.0,
  "igstAmount": 0.0,
  "totalAmount": 0.0,
  "confidenceScore": 0.95
}
`;

  const CANDIDATE_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ];

  let rawText = "";
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const timeoutMs = 55_000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini AI OCR (${modelName}) timed out`)), timeoutMs);
      });

      const scanPromise = ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
              parts: [
                { text: prompt },
                ...files.map(f => ({ inlineData: { mimeType: f.mimeType || "image/jpeg", data: f.base64Data } })),
              ],
          },
        ],
      });

      const response = await Promise.race([scanPromise, timeoutPromise]) as any;
      rawText = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (rawText) break;
    } catch (err: any) {
      lastError = err;
        console.warn(`[AI Invoice Scanner] Model ${modelName} failed (${err.message}).`);
        if (/RESOURCE_EXHAUSTED|quota|429/i.test(err.message)) {
          // If 2.5-flash hits its tiny 20 RPD free tier limit, we must fall back to 1.5-flash which has 1500 RPD
          console.warn(`[AI Invoice Scanner] Rate limited on ${modelName}. Falling back...`);
        }
      }
  }

  if (!rawText) {
    throw new Error(cleanHumanReadableAiError(lastError));
  }

  try {
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const rawParsed = JSON.parse(cleanJson);
    return ScannedInvoiceResultSchema.parse(rawParsed);
  } catch (parseErr: any) {
    console.error("[AI Invoice Scanner] JSON parse failed:", parseErr, "Raw response was:", rawText);
    throw new Error("Unable to parse structured line items from this invoice image. Please verify image clarity or enter items manually.");
  }
}

