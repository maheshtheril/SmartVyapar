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

export async function scanPurchaseInvoiceWithGemini(
  base64Data: string,
  mimeType: string,
  apiKey?: string
): Promise<ScannedInvoiceResult> {
  const finalApiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!finalApiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(finalApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are an expert Indian Purchase Invoice and Bill OCR auditor with specialized knowledge in wholesale packaging and Units of Measure (UOM).
Analyze this invoice image or document and extract the vendor, items, packaging units, tax slabs, and totals into a strict JSON object.

RULES:
1. Vendor/Supplier: Extract exact business name, GSTIN (15 characters if present), bill/invoice number, and bill date (YYYY-MM-DD format).
2. Line Items & Packaging (UOM) Intelligence:
   - Indian wholesale invoices often bill in packaging units ('BOX', 'CTN', 'STRIP', 'BAG', 'PKT', 'DOZ') with pack notations like '10x1', '1x10', '10 PCS', '12 NOS', '50 PCS/CTN'.
   - Extract:
     - "productName": Exact item name or description
     - "hsnCode": HSN/SAC code if listed (else "")
     - "batchNumber": Batch or Lot ID if present (else "")
     - "expiryDate": Expiry if pharma/food (YYYY-MM-DD or "")
     - "unit": Billed unit (e.g., "BOX", "CTN", "STRIP", "PCS", "KG", "MTR")
     - "quantity": Number of units billed (numeric, supports decimals e.g. 2.50)
     - "packageSize": Multiplier if packaging unit (e.g. if 1 Box has 10 Pcs, packageSize is 10. If loose/single unit, packageSize is 1)
     - "baseUnit": Atomic base inventory unit (e.g. "PCS", "KG", "MTR", "NOS")
     - "baseQuantity": Effective atomic quantity entering inventory (= quantity * packageSize). E.g. 5 boxes of 10 pcs = 50 pcs.
     - "purchasePrice": Billed unit rate before tax (e.g. ₹1200 per Box)
     - "baseCostPrice": Cost per atomic base unit (= purchasePrice / packageSize). E.g. ₹1200 / 10 = ₹120 per Pc.
     - "mrp": Maximum Retail Price if listed (numeric)
     - "gstRate": Applicable GST slab (e.g. 5, 12, 18, 28)
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

  const timeoutMs = 30_000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Gemini AI OCR request timed out after 30 seconds")), timeoutMs);
  });

  const response = (await Promise.race([
    model.generateContent([prompt, imagePart]),
    timeoutPromise,
  ])) as any;

  const text = response.response.text();

  // Clean JSON response (strip any ```json ``` wrapper if returned)
  let cleanJson = text.trim();
  if (cleanJson.startsWith("```json")) {
    cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
  }

  const rawParsed = JSON.parse(cleanJson);
  const validated = ScannedInvoiceResultSchema.parse(rawParsed);
  return validated;
}
