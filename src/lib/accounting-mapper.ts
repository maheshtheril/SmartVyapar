import { VoucherType, AccountClassification } from "@prisma/client";
import { generateVoucherNumber, computeAccountBalanceDelta } from "@/lib/accounting-voucher";

export async function postJournalEntry(
  tx: any,
  tenantId: string,
  voucherType: VoucherType,
  date: Date,
  narration: string,
  referenceNo: string | null,
  lines: Array<{ accountCode: string; debit: number; credit: number; narration?: string }>
) {
  // Fetch accounts by code for this tenant
  const accountCodes = Array.from(new Set(lines.map((l) => l.accountCode)));
  const accounts = await tx.account.findMany({
    where: { tenantId, code: { in: accountCodes } },
  });

  const accountMap = new Map(accounts.map((a: any) => [a.code, a]));

  const missing = accountCodes.filter((c) => !accountMap.has(c));
  if (missing.length > 0) {
    throw new Error(`Missing ledger accounts for automated posting: ${missing.join(", ")}`);
  }

  // Calculate total amount from debits
  const totalAmount = lines.reduce((sum, l) => sum + l.debit, 0);

  // Generate voucher number inside the transaction manually or via utility
  // Note: generateVoucherNumber in accounting-voucher.ts uses prisma directly. 
  // We should do a raw count here to be transaction safe.
  // Generate voucher number atomically inside the transaction using VoucherSequence
  const voucherNumber = await generateVoucherNumber(tenantId, voucherType, tx);

  // 1. Create the Journal Entry header with lines
  const journalEntry = await tx.journalEntry.create({
    data: {
      tenantId,
      voucherNumber,
      voucherType,
      date,
      narration,
      referenceNo,
      totalAmount,
      lines: {
        create: lines.map((line) => {
          const acc = accountMap.get(line.accountCode) as any;
          return {
            accountId: acc!.id,
            debit: line.debit,
            credit: line.credit,
            narration: line.narration || null,
          };
        }),
      },
    },
  });

  // 2. Update each affected ledger account's balance
  for (const line of lines) {
    const acc = accountMap.get(line.accountCode) as any;
    const delta = computeAccountBalanceDelta(acc!.classification as AccountClassification, line.debit, line.credit);

    await tx.account.update({
      where: { id: acc!.id },
      data: {
        balance: {
          increment: delta,
        },
      },
    });
  }

  // 3. Record Audit Log
  await tx.auditLog.create({
    data: {
      tenantId,
      action: "ACCOUNTING_VOUCHER_CREATED",
      entityType: "ACCOUNTING_VOUCHER",
      entityId: journalEntry.id,
      details: {
        voucherNumber,
        voucherType,
        totalAmount,
        lineCount: lines.length,
        referenceNo,
        automated: true
      },
    },
  });

  return journalEntry;
}

/**
 * Automatically posts a Journal Entry for a new Sales Invoice.
 */
export async function postInvoiceJournalEntry(tx: any, tenantId: string, invoice: any) {
  const lines: any[] = [];
  
  // Debit: Accounts Receivable (1200) or Cash/Bank if paid
  // ZionaPOS usually tracks via AR (dueAmount) and payments come in separately, 
  // but if paid amount > 0 on invoice creation, we should split it.
  const paid = Number(invoice.paidAmount || 0);
  const due = Number(invoice.dueAmount || 0);
  
  if (paid > 0) {
    let cashAccountCode = "1000"; // CASH
    if (invoice.paymentMode === "UPI") cashAccountCode = "1020";
    else if (invoice.paymentMode === "CARD") cashAccountCode = "1030";
    else if (invoice.paymentMode === "BANK") cashAccountCode = "1010";
    lines.push({ accountCode: cashAccountCode, debit: paid, credit: 0, narration: "Payment received on invoice" });
  }
  
  if (due > 0) {
    lines.push({ accountCode: "1200", debit: due, credit: 0, narration: "Amount due from customer" });
  }

  // Credit: Sales Revenue (4000)
  const subtotal = Number(invoice.subtotal);
  if (subtotal > 0) {
    lines.push({ accountCode: "4000", debit: 0, credit: subtotal, narration: `Sales Revenue` });
  }

  // Credit: GST Payables (2200, 2201, 2202)
  const cgst = Number(invoice.cgstAmount || 0);
  const sgst = Number(invoice.sgstAmount || 0);
  const igst = Number(invoice.igstAmount || 0);
  
  if (cgst > 0) lines.push({ accountCode: "2200", debit: 0, credit: cgst, narration: "Output CGST" });
  if (sgst > 0) lines.push({ accountCode: "2201", debit: 0, credit: sgst, narration: "Output SGST" });
  if (igst > 0) lines.push({ accountCode: "2202", debit: 0, credit: igst, narration: "Output IGST" });

  // COGS & Inventory Asset (Perpetual Inventory System)
  // We need the total cost value of the items sold to debit COGS and credit Inventory
  let totalCost = 0;
  if (invoice.items) {
    for (const item of invoice.items) {
      let costPerBaseUnit = 0;
      
      if (item.batchId) {
        const batch = await tx.batch.findUnique({ where: { id: item.batchId }});
        if (batch) {
          costPerBaseUnit = Number(batch.costPrice);
        }
      }

      if (!costPerBaseUnit) {
        const product = await tx.product.findUnique({ where: { id: item.productId }});
        if (product) {
          costPerBaseUnit = Number(product.purchasePrice);
        }
      }

      totalCost += costPerBaseUnit * Number(item.baseQuantity);
    }
  }

  if (totalCost > 0) {
    lines.push({ accountCode: "5000", debit: totalCost, credit: 0, narration: "Cost of Goods Sold" });
    lines.push({ accountCode: "1300", debit: 0, credit: totalCost, narration: "Inventory deduction" });
  }

  await postJournalEntry(
    tx, 
    tenantId, 
    "JOURNAL", 
    new Date(), 
    `Automated entry for Sales Invoice #${invoice.invoiceNumber}`,
    invoice.invoiceNumber,
    lines
  );
}

/**
 * Automatically posts a Journal Entry for a Purchase Bill.
 */
export async function postPurchaseJournalEntry(tx: any, tenantId: string, purchaseBill: any) {
  const lines: any[] = [];
  
  const subtotal = Number(purchaseBill.totalTaxable);
  const cgst = Number(purchaseBill.cgstAmount || 0);
  const sgst = Number(purchaseBill.sgstAmount || 0);
  const igst = Number(purchaseBill.igstAmount || 0);
  const total = Number(purchaseBill.totalAmount);

  // Debit: Inventory Asset (1300)
  if (subtotal > 0) {
    lines.push({ accountCode: "1300", debit: subtotal, credit: 0, narration: `Inventory Purchase` });
  }

  // Debit: Input Tax Credit Asset (1410, 1420, 1430)
  if (cgst > 0) lines.push({ accountCode: "1410", debit: cgst, credit: 0, narration: "Input CGST" });
  if (sgst > 0) lines.push({ accountCode: "1420", debit: sgst, credit: 0, narration: "Input SGST" });
  if (igst > 0) lines.push({ accountCode: "1430", debit: igst, credit: 0, narration: "Input IGST" });

  // Credit: Accounts Payable (2000) or Cash/Bank
  let payAccount = "2000"; // CREDIT
  if (purchaseBill.paymentTerms === "CASH") payAccount = "1000";
  else if (purchaseBill.paymentTerms === "UPI") payAccount = "1020";
  else if (purchaseBill.paymentTerms === "CARD") payAccount = "1030";
  else if (purchaseBill.paymentTerms === "BANK") payAccount = "1010";

  if (total > 0) {
    lines.push({ accountCode: payAccount, debit: 0, credit: total, narration: "Purchase liability/payment" });
  }

  await postJournalEntry(
    tx, 
    tenantId, 
    "JOURNAL", 
    new Date(), 
    `Automated entry for Purchase Bill #${purchaseBill.billNumber}`,
    purchaseBill.billNumber,
    lines
  );
}

/**
 * Automatically posts a Journal Entry for a Credit Note (Sales Return).
 */
export async function postCreditNoteJournalEntry(tx: any, tenantId: string, creditNote: any) {
  const lines: any[] = [];
  
  const subtotal = Number(creditNote.subtotal);
  const cgst = Number(creditNote.cgstAmount || 0);
  const sgst = Number(creditNote.sgstAmount || 0);
  const igst = Number(creditNote.igstAmount || 0);
  const total = Number(creditNote.totalAmount);

  // Debit: Sales Revenue (4000)
  if (subtotal > 0) {
    lines.push({ accountCode: "4000", debit: subtotal, credit: 0, narration: `Sales Return` });
  }

  // Debit: GST Payables (reversing output tax)
  if (cgst > 0) lines.push({ accountCode: "2200", debit: cgst, credit: 0, narration: "Reversal of Output CGST" });
  if (sgst > 0) lines.push({ accountCode: "2201", debit: sgst, credit: 0, narration: "Reversal of Output SGST" });
  if (igst > 0) lines.push({ accountCode: "2202", debit: igst, credit: 0, narration: "Reversal of Output IGST" });

  // Credit: Accounts Receivable (1200) or Cash if refund was immediate
  let payAccount = "1200"; // CREDIT
  if (creditNote.refundMode === "CASH") payAccount = "1000";
  else if (creditNote.refundMode === "UPI") payAccount = "1020";
  else if (creditNote.refundMode === "CARD") payAccount = "1030";
  else if (creditNote.refundMode === "BANK") payAccount = "1010";

  if (total > 0) {
    lines.push({ accountCode: payAccount, debit: 0, credit: total, narration: "Refund/Credit given to customer" });
  }

  // Reverse COGS & Inventory Asset
  let totalCost = 0;
  if (creditNote.items) {
    for (const item of creditNote.items) {
      if (item.restock) {
        let costPerBaseUnit = 0;
        
        if (item.batchId) {
          const batch = await tx.batch.findUnique({ where: { id: item.batchId }});
          if (batch) {
            costPerBaseUnit = Number(batch.costPrice);
          }
        }
  
        if (!costPerBaseUnit) {
          const product = await tx.product.findUnique({ where: { id: item.productId }});
          if (product) {
            costPerBaseUnit = Number(product.purchasePrice);
          }
        }
  
        totalCost += costPerBaseUnit * Number(item.baseQuantity);
      }
    }
  }

  if (totalCost > 0) {
    lines.push({ accountCode: "1300", debit: totalCost, credit: 0, narration: "Inventory restored" });
    lines.push({ accountCode: "5000", debit: 0, credit: totalCost, narration: "Reversal of COGS" });
  }

  await postJournalEntry(
    tx, 
    tenantId, 
    "JOURNAL", 
    new Date(), 
    `Automated entry for Credit Note #${creditNote.creditNoteNumber}`,
    creditNote.creditNoteNumber,
    lines
  );
}

/**
 * Automatically posts a Journal Entry for a Customer Khata Payment.
 */
export async function postCustomerPaymentJournalEntry(tx: any, tenantId: string, customerId: string, amount: number, mode: string) {
  const lines: any[] = [];
  
  let cashAccountCode = "1000"; // CASH
  if (mode === "UPI") cashAccountCode = "1020";
  else if (mode === "CARD") cashAccountCode = "1030";
  else if (mode === "BANK") cashAccountCode = "1010";

  // Debit: Cash/Bank
  lines.push({ accountCode: cashAccountCode, debit: amount, credit: 0, narration: "Customer payment received" });
  
  // Credit: Accounts Receivable (1200)
  lines.push({ accountCode: "1200", debit: 0, credit: amount, narration: "Reduction in customer credit" });

  await postJournalEntry(
    tx, 
    tenantId, 
    "RECEIPT", 
    new Date(), 
    `Automated receipt for Customer Payment`,
    null,
    lines
  );
}

/**
 * Automatically posts a Journal Entry for a Supplier Payment.
 */
export async function postSupplierPaymentJournalEntry(tx: any, tenantId: string, supplierName: string, amount: number, mode: string) {
  const lines: any[] = [];
  
  let cashAccountCode = "1000"; // CASH
  if (mode === "UPI") cashAccountCode = "1020";
  else if (mode === "CARD") cashAccountCode = "1030";
  else if (mode === "BANK") cashAccountCode = "1010";

  // Debit: Accounts Payable (2000)
  lines.push({ accountCode: "2000", debit: amount, credit: 0, narration: `Supplier payment to ${supplierName}` });
  
  // Credit: Cash/Bank
  lines.push({ accountCode: cashAccountCode, debit: 0, credit: amount, narration: "Payment made" });

  await postJournalEntry(
    tx, 
    tenantId, 
    "PAYMENT", 
    new Date(), 
    `Automated payment for Supplier: ${supplierName}`,
    null,
    lines
  );
}
