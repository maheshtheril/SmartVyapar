import { z } from "zod";

export const VoucherLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  accountName: z.string().optional(),
  accountCode: z.string().optional(),
  debit: z.number().min(0, "Debit cannot be negative"),
  credit: z.number().min(0, "Credit cannot be negative"),
  narration: z.string().optional(),
});

export const CreateVoucherSchema = z
  .object({
    voucherType: z.enum(["PAYMENT", "RECEIPT", "CONTRA", "JOURNAL"], {
      message: "Valid voucher type is required (PAYMENT, RECEIPT, CONTRA, or JOURNAL)",
    }),
    date: z.string().or(z.date()).optional(),
    narration: z.string().min(3, "Narration must be at least 3 characters"),
    referenceNo: z.string().optional(),
    lines: z.array(VoucherLineSchema).min(2, "At least two ledger lines are required for double-entry"),
  })
  .superRefine((data, ctx) => {
    let totalDebit = 0;
    let totalCredit = 0;

    data.lines.forEach((line, index) => {
      // Line cannot have both debit and credit
      if (line.debit > 0 && line.credit > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A single ledger line cannot contain both Debit and Credit amounts",
          path: ["lines", index],
        });
      }

      // Line cannot have both 0 debit and 0 credit
      if (line.debit === 0 && line.credit === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Line must have either a positive Debit or Credit amount",
          path: ["lines", index],
        });
      }

      totalDebit += line.debit;
      totalCredit += line.credit;
    });

    if (totalDebit <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total transaction amount must be greater than zero",
        path: ["lines"],
      });
    }

    // Strict Double-Entry: Total Debits must equal Total Credits
    const diff = Math.abs(Math.round(totalDebit * 100) - Math.round(totalCredit * 100)) / 100;
    if (diff >= 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Voucher is unbalanced! Total Debits (₹${totalDebit.toFixed(2)}) must equal Total Credits (₹${totalCredit.toFixed(2)}). Discrepancy: ₹${diff.toFixed(2)}`,
        path: ["lines"],
      });
    }
  });

export type CreateVoucherInput = z.infer<typeof CreateVoucherSchema>;
export type VoucherLineInput = z.infer<typeof VoucherLineSchema>;
