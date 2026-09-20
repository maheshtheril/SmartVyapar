import { z } from "zod";
import { indianPhoneSchema, stateCodeSchema } from "./common";

export const InvoiceItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitSold: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative").optional(),
  price: z.coerce.number().nonnegative().optional(), // alias used by some POS forms
  batchId: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
});

export const CreateInvoiceSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name must be at least 2 characters"),
  customerPhone: indianPhoneSchema,
  customerStateCode: stateCodeSchema.default("32"),
  customerGstin: z.string().trim().optional().nullable(),
  paymentStatus: z.enum(["PAID", "PARTIAL", "UNPAID"]).default("UNPAID"),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CREDIT"]).default("UPI"),
  paidAmount: z.coerce.number().nonnegative("Paid amount cannot be negative").default(0),
  items: z.array(InvoiceItemSchema).min(1, "Invoice must contain at least one line item"),
  loyaltyPointsToRedeem: z.coerce.number().nonnegative().default(0).optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;
