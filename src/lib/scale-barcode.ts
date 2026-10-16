/**
 * EAN-13 Type 2 / In-Store Variable Measure Barcode Parser
 * Supports all electronic weighing scales (Essae, Mettler Toledo, DIGI, Avery Berkel, CAS, Dibal).
 * 
 * Standard Format:
 * Prefix (2 digits) - PLU / Item Code (5 digits) - Weight/Price (5 digits) - Checksum (1 digit)
 * E.g.: "2000123014506" -> Prefix: 20, PLU: 00123, Weight: 1.450 KG
 * E.g.: "2100456002758" -> Prefix: 21, PLU: 00456, Weight: 0.275 KG
 */

export interface ScaleBarcodeResult {
  isScaleBarcode: boolean;
  rawBarcode: string;
  prefix: string;
  pluCode: string; // 5 digits e.g. "00123"
  cleanPlu: string; // Trimmed e.g. "123"
  weightKg: number; // e.g. 1.450 kg
  embeddedType: "WEIGHT" | "PRICE";
  priceValue?: number;
}

export function parseScaleBarcode(input: string): ScaleBarcodeResult | null {
  if (!input) return null;
  const raw = input.trim();

  // Scale barcodes in retail & hypermarkets are standard EAN-13 (13 digits) or UPC-A (12 digits)
  if (raw.length !== 12 && raw.length !== 13) {
    return null;
  }

  // Common scale prefixes defined by GS1 for in-store variable weight items
  // 20 = Weight-embedded (02 in 12-digit UPC)
  // 21 = Weight-embedded
  // 22 = Price-embedded
  // 28, 29 = Retailer internal variable measure
  const prefix = raw.slice(0, 2);
  const isWeightPrefix = prefix === "20" || prefix === "21" || prefix === "02";
  const isPricePrefix = prefix === "22" || prefix === "28";

  if (!isWeightPrefix && !isPricePrefix) {
    return null;
  }

  // Normalize to 13 digits if 12 digits
  const normalized = raw.length === 12 ? `0${raw}` : raw;

  // Format: PP IIIII WWWWW C
  // PP = prefix (2 digits)
  // IIIII = Item code / PLU (5 digits, index 2 to 7)
  // WWWWW = Weight in grams (5 digits, index 7 to 12)
  // C = Checksum (1 digit, index 12)
  const pluCode = normalized.slice(2, 7);
  const cleanPlu = pluCode.replace(/^0+/, "") || pluCode;
  const valuePart = normalized.slice(7, 12);
  const numericVal = parseInt(valuePart, 10);

  if (isNaN(numericVal)) return null;

  if (isWeightPrefix) {
    // 5 digits represent grams: 01450 = 1450g = 1.450 kg
    const weightKg = Number((numericVal / 1000).toFixed(3));
    return {
      isScaleBarcode: true,
      rawBarcode: raw,
      prefix,
      pluCode,
      cleanPlu,
      weightKg: Math.max(0.001, weightKg),
      embeddedType: "WEIGHT",
    };
  } else {
    // 5 digits represent price in paise / cents: 00250 = Rs. 2.50 or Rs. 250
    const priceValue = Number((numericVal / 100).toFixed(2));
    return {
      isScaleBarcode: true,
      rawBarcode: raw,
      prefix,
      pluCode,
      cleanPlu,
      weightKg: 1.0,
      embeddedType: "PRICE",
      priceValue,
    };
  }
}
