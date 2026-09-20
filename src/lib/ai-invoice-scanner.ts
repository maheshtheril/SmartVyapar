import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const ScannedPurchaseItemSchema = z.object({
  productName: z.string().trim().default("Unknown Item"),
  hsnCode: z.string().trim().optional().default("9983"),
  batchNumber: z.string().trim().optional().default(""),
  expiryDate: z.string().trim().optional().default(""),
  unit: z.string().trim().default("PCS"),
  quantity: z.coerce.number().positive().default(1),
  packageSize: z.coerce.number().positive().default(1),
  baseUnit: z.string().trim().default("PCS"),
  baseQuantity: z.coerce.number().positive().default(1),
  purchasePrice: z.coerce.number().nonnegative().default(0),
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
    return "AI scanning service is currently unavailable. Please verify your Google API key or enter items manually.";
  }
  const msg = typeof error === "string" ? error : error.message || String(error);

  if (/API_KEY_INVALID|API key not valid/i.test(msg)) {
    return "Google Gemini API key is invalid. Please verify your key in Settings or paste an active key below.";
  }
  if (/PERMISSION_DENIED|denied access|403/i.test(msg)) {
    return "Google Cloud access denied (Permission Denied). Please ensure Generative Language API is enabled on your Google project or paste an active Gemini key below.";
  }
  if (/RESOURCE_EXHAUSTED|quota|429/i.test(msg)) {
    return "Google AI rate limit or quota exceeded. Please wait a minute or use a custom API key below.";
  }
  if (/not found|404|no longer available/i.test(msg)) {
    return "The requested Google AI model is currently unavailable. Please verify your Google AI Studio key.";
  }
  if (/timed out|timeout/i.test(msg)) {
    return "AI invoice processing timed out. Please check your network connection or upload a clearer, smaller image.";
  }
  if (/Gemini AI OCR is not configured/i.test(msg)) {
    return "Google Gemini API key is not configured. Please paste your Gemini API key below or enter invoice items manually.";
  }

  return "Unable to scan this invoice document. Please ensure the document is clear and legible, or enter the bill items manually below.";
}

export async function scanPurchaseInvoiceWithGemini(
  base64Data: string,
  mimeType: string,
  apiKey?: string
): Promise<ScannedInvoiceResult> {
  const finalApiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!finalApiKey) {
    throw new Error(
      "Gemini AI OCR is not configured. Please configure your Google Gemini API key in Settings or enter the purchase invoice items manually."
    );
  }

  const genAI = new GoogleGenerativeAI(finalApiKey);

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
     - "productName": Exact item name or medicine/chemical description
     - "hsnCode": HSN/SAC code if listed (else "")
     - "batchNumber": Batch or Lot ID if present (else "")
     - "expiryDate": Expiry date if pharma/food (YYYY-MM-DD or "")
     - "unit": Billed unit (e.g., "STRIP", "BOX", "BOTTLE", "PCS", "KG", "MTR")
     - "quantity": Number of units billed (numeric, supports decimals e.g. 2.50)
     - "packageSize": Multiplier if packaging unit (e.g. if 1 Box has 10 Strips, packageSize is 10. If loose/single unit, packageSize is 1)
     - "baseUnit": Atomic base inventory unit (e.g. "STRIP", "TAB", "PCS", "NOS")
     - "baseQuantity": Effective atomic quantity entering inventory (= quantity * packageSize)
     - "purchasePrice": Billed unit rate before tax
     - "baseCostPrice": Cost per atomic base unit (= purchasePrice / packageSize)
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

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType || "image/jpeg",
    },
  };

  const CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
    "gemini-pro-latest",
  ];

  let rawText = "";
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const timeoutMs = 25_000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini AI OCR (${modelName}) timed out`)), timeoutMs);
      });

      const response = (await Promise.race([
        model.generateContent([prompt, imagePart]),
        timeoutPromise,
      ])) as any;

      rawText = response.response.text();
      if (rawText) break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Invoice Scanner] Model ${modelName} failed (${err.message}). Trying next candidate...`);
    }
  }

  if (!rawText) {
    throw new Error(cleanHumanReadableAiError(lastError));
  }

  try {
    // Clean JSON response (strip any ```json ``` wrapper if returned)
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
