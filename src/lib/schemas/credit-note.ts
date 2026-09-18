import { z } from "zod";

export const CreditNoteReasonEnum = z.enum([
  "SALES_RETURN",
  "POST_SALE_DISCOUNT",
  "DEFICIENT_GOODS",
  "INVOICE_CORRECTION",
  "OTHER",
]);

export const RefundModeEnum = z.enum([
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CREDIT",
]);

export const CreditNoteItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  invoiceItemId: z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  hsnCode: z.string().min(2, "HSN code is required").default("9983"),
  unitReturned: z.string().default("PCS"),
  quantity: z.number().positive("Return quantity must be strictly greater than 0"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  conversionFactor: z.number().positive().default(1.0),
  gstRate: z.number().nonnegative().default(0),
  restock: z.boolean().default(true),
});

export const CreateCreditNoteSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  reason: CreditNoteReasonEnum.default("SALES_RETURN"),
  remarks: z.string().max(500).optional().nullable(),
  refundMode: RefundModeEnum.default("CASH"),
  items: z.array(CreditNoteItemInputSchema).min(1, "At least one item must be returned in a credit note"),
});

export type CreateCreditNoteInput = z.infer<typeof CreateCreditNoteSchema>;
export type CreditNoteItemInput = z.infer<typeof CreditNoteItemInputSchema>;
