import { z } from "zod";

/**
 * Statutory cancellation reasons defined by GST NIC e-Invoice system:
 * 1: Duplicate
 * 2: Data entry mistake
 * 3: Order cancelled
 * 4: Others
 */
export const CancelEinvoiceSchema = z.object({
  cancelReason: z.enum(["1", "2", "3", "4"], {
    message:
      "Please select a valid cancellation reason: 1 (Duplicate), 2 (Data entry mistake), 3 (Order cancelled), or 4 (Others)",
  }),
  cancelRemarks: z
    .string()
    .min(3, "Remarks must be at least 3 characters")
    .max(100, "Remarks cannot exceed 100 characters")
    .optional(),
});

export type CancelEinvoiceInput = z.infer<typeof CancelEinvoiceSchema>;

/**
 * Schema for manually recording pre-generated IRN details from external ASP/GSP
 */
export const ManualEinvoiceSchema = z.object({
  irn: z
    .string()
    .trim()
    .length(64, "IRN must be exactly 64 hexadecimal characters")
    .regex(/^[a-fA-F0-9]{64}$/, "IRN must be a valid 64-character hex string"),
  ackNo: z
    .string()
    .trim()
    .regex(/^\d{15,16}$/, "Acknowledgment Number must be 15 to 16 digits"),
  ackDate: z.string().datetime({ message: "Acknowledgment date must be a valid ISO timestamp" }),
  signedQrCode: z.string().trim().optional(),
});

export type ManualEinvoiceInput = z.infer<typeof ManualEinvoiceSchema>;
