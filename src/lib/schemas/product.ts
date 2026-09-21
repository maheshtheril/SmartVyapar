import { z } from "zod";
import { hsnCodeSchema } from "./common";

export const CreateProductSchema = z
  .object({
    name: z.string().trim().min(2, "Product name must be at least 2 characters"),
    sku: z.string().trim().optional().nullable(),
    barcode: z.string().trim().optional().nullable(),
    hsnCode: hsnCodeSchema,
    category: z.string().trim().optional().nullable(),
    imageUrl: z.string().trim().optional().nullable(),
    productType: z.enum(["RETAIL_ITEM", "RAW_MATERIAL", "FINISHED_GOOD"]).default("RETAIL_ITEM").optional(),
    hasBatchTracking: z.boolean().default(false).optional(),
    baseUnit: z.string().trim().default("PCS"),
    hasAltUnit: z.boolean().default(false),
    altUnit: z.string().trim().optional().nullable(),
    conversionFactor: z.coerce.number().positive().default(1.0).optional().nullable(),
    purchasePrice: z.coerce.number().nonnegative("Purchase price cannot be negative"),
    purchasePricePerAlt: z.coerce.number().nonnegative().optional().nullable(),
    sellingPrice: z.coerce.number().nonnegative("Selling price cannot be negative"),
    sellingPricePerAlt: z.coerce.number().nonnegative().optional().nullable(),
    mrp: z.coerce.number().nonnegative().optional().nullable(),
    gstRate: z.coerce.number().nonnegative("GST rate cannot be negative").default(18),
    initialStock: z.coerce.number().nonnegative("Initial stock cannot be negative").default(0),
    minStockAlert: z.coerce.number().nonnegative().default(5),
  })
  .superRefine((val, ctx) => {
    // 1. If alternative packaging unit is enabled, require altUnit and conversion factor > 1
    if (val.hasAltUnit) {
      if (!val.altUnit || val.altUnit.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["altUnit"],
          message: "Packaging unit name (e.g. BOX, CTN) is required when alternative unit is enabled",
        });
      }
      if (!val.conversionFactor || val.conversionFactor <= 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conversionFactor"],
          message: "Conversion factor must be greater than 1 (e.g. 1 Box = 10 Pcs)",
        });
      }
    }

    // 2. In India, selling price cannot exceed MRP under the Legal Metrology Act
    if (val.mrp !== null && val.mrp !== undefined && val.mrp > 0) {
      if (val.sellingPrice > val.mrp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sellingPrice"],
          message: `Selling price (₹${val.sellingPrice}) cannot exceed Maximum Retail Price MRP (₹${val.mrp})`,
        });
      }
    }
  });

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
