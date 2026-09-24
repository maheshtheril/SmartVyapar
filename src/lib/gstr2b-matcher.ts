/**
 * SmartVyapar GSTR-2B vs. Purchase Register ITC Reconciliation Engine
 * Complies with GST Section 16(2)(aa) & Rule 36(4) of CGST Rules.
 * Cross-matches GST Portal GSTR-2B JSON against Books Purchase Bills.
 */

export interface Gstr2bRawItem {
  num?: number;
  rt: number; // Tax Rate %
  txval: number; // Taxable Value
  iamt?: number; // IGST
  camt?: number; // CGST
  samt?: number; // SGST
  csamt?: number; // Cess
}

export interface Gstr2bRawInvoice {
  inum: string; // Invoice Number
  idt: string; // Invoice Date (DD-MM-YYYY)
  val: number; // Invoice Total Value
  pos?: string; // Place of supply
  rev?: string; // Reverse Charge ("Y" | "N")
  itcavl?: string; // ITC Available ("Y" | "N")
  diffprcnt?: number;
  items?: Gstr2bRawItem[];
}

export interface Gstr2bSupplierB2B {
  ctin: string; // Supplier GSTIN
  cfs?: string; // Supplier Filing Status ("Y" | "N")
  cname?: string; // Supplier Trade/Legal Name
  inv: Gstr2bRawInvoice[];
}

export interface Gstr2bPortalJson {
  gstin?: string;
  fp?: string; // Return period MMYYYY e.g. "082026"
  data?: {
    b2b?: Gstr2bSupplierB2B[];
    b2ba?: Gstr2bSupplierB2B[];
    cdnr?: Array<{
      ctin: string;
      cname?: string;
      nt: Array<{
        ntnum: string;
        ntdt: string;
        val: number;
        items?: Gstr2bRawItem[];
      }>;
    }>;
  };
}

export interface NormalizedGstr2bRecord {
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  normalizedInvoiceNum: string;
  invoiceDate: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
  itcAvailable: boolean;
  supplierFiled: boolean;
}

export interface BooksPurchaseRecord {
  id: string;
  billNumber: string;
  normalizedBillNum: string;
  billDate: string;
  supplierName: string;
  supplierGstin?: string | null;
  supplierPhone?: string | null;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
}

export type MatchStatus =
  | "MATCHED"
  | "VALUE_MISMATCH"
  | "MISSING_IN_2B"
  | "MISSING_IN_BOOKS";

export interface ReconciledRow {
  id: string;
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: MatchStatus;
  statusLabel: string;
  statusDesc: string;
  
  // Amounts in Books
  booksTaxable?: number;
  booksTax?: number;
  booksTotal?: number;
  booksBillId?: string;

  // Amounts in GSTR-2B
  gstr2bTaxable?: number;
  gstr2bTax?: number;
  gstr2bIgst?: number;
  gstr2bCgst?: number;
  gstr2bSgst?: number;
  gstr2bTotal?: number;
  itcAvailable?: boolean;
  supplierFiled?: boolean;

  // Differences
  taxableDiff: number;
  taxDiff: number;

  // 1-Click WhatsApp Follow-up URL for Supplier
  whatsappUrl?: string;
  whatsappMessage?: string;
}

export interface ReconciliationReport {
  returnPeriod: string;
  financialYear: string;
  buyerGstin: string;
  summary: {
    total2bInvoices: number;
    totalBooksInvoices: number;
    matchedCount: number;
    mismatchedCount: number;
    missingIn2bCount: number;
    missingInBooksCount: number;
    matchedItc: number;
    pendingItc: number; // At risk of rejection
    ineligibleItc: number;
  };
  rows: ReconciledRow[];
}

/**
 * Normalizes invoice string for fuzzy comparison
 * Strips non-alphanumerics, ignores leading zeroes
 */
export function normalizeInvoiceNumber(inv: string): string {
  if (!inv) return "";
  const clean = inv.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.replace(/^0+/, "");
}

/**
 * Parses official GST Portal GSTR-2B JSON payload into flat normalized records
 */
export function parseGstr2bJson(jsonPayload: any): {
  buyerGstin: string;
  returnPeriod: string;
  records: NormalizedGstr2bRecord[];
} {
  const buyerGstin = jsonPayload.gstin || "UNKNOWN";
  const returnPeriod = jsonPayload.fp || "CURRENT";

  const records: NormalizedGstr2bRecord[] = [];
  const b2bList = jsonPayload.data?.b2b || [];

  for (const sup of b2bList) {
    const supplierGstin = (sup.ctin || "").trim().toUpperCase();
    const supplierName = sup.cname || `Supplier (${supplierGstin})`;
    const supplierFiled = sup.cfs === "Y";

    const invList = sup.inv || [];
    for (const inv of invList) {
      const invoiceNumber = (inv.inum || "").trim();
      const invoiceDate = inv.idt || "";
      const totalAmount = Number(inv.val || 0);
      const itcAvailable = inv.itcavl !== "N";

      let taxableValue = 0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (Array.isArray(inv.items)) {
        for (const item of inv.items) {
          taxableValue += Number(item.txval || 0);
          cgst += Number(item.camt || 0);
          sgst += Number(item.samt || 0);
          igst += Number(item.iamt || 0);
        }
      }

      const totalTax = cgst + sgst + igst;

      records.push({
        supplierGstin,
        supplierName,
        invoiceNumber,
        normalizedInvoiceNum: normalizeInvoiceNumber(invoiceNumber),
        invoiceDate,
        taxableValue,
        cgst,
        sgst,
        igst,
        totalTax,
        totalAmount,
        itcAvailable,
        supplierFiled,
      });
    }
  }

  return { buyerGstin, returnPeriod, records };
}

/**
 * Generates WhatsApp reminder message for supplier whose bill is missing in GSTR-2B
 */
export function generateSupplierWhatsAppNotice(
  businessName: string,
  supplierName: string,
  supplierPhone: string | null | undefined,
  billNumber: string,
  billDate: string,
  amount: number,
  tax: number,
  period: string
): { url: string; message: string } {
  const formattedDate = new Date(billDate).toLocaleDateString("en-IN");
  const monthName = formatPeriodName(period);

  const message =
    `*TAX NOTICE: GSTR-1 FILING REMINDER*\n\n` +
    `Dear *${supplierName.toUpperCase()}*,\n` +
    `Greetings from *${businessName.toUpperCase()}*.\n\n` +
    `During our statutory monthly GST audit for *${monthName}*, we noticed that the following purchase bill is *MISSING from our GSTR-2B* on the GST Portal:\n\n` +
    `📄 *Invoice No:* ${billNumber}\n` +
    `📅 *Invoice Date:* ${formattedDate}\n` +
    `💰 *Total Amount:* ₹${amount.toFixed(2)}\n` +
    `⚖️ *GST Tax Credit:* ₹${tax.toFixed(2)}\n\n` +
    `As per GST Rule 36(4), we are unable to claim our Input Tax Credit (ITC) until this invoice is reported in your GSTR-1 return.\n\n` +
    `Kindly confirm when this invoice will be uploaded/amended in your GST portal filing.\n\n` +
    `Thank you,\n*${businessName}* (Accounts & GST Dept)`;

  const cleanPhone = (supplierPhone || "").replace(/\D/g, "");
  const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encoded = encodeURIComponent(message);
  const url = phoneParam ? `https://wa.me/${phoneParam}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

  return { url, message };
}

export function formatPeriodName(fp: string): string {
  if (!fp || fp.length !== 6) return "Current Period";
  const mm = fp.substring(0, 2);
  const yyyy = fp.substring(2);
  const monthNames: Record<string, string> = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  };
  return `${monthNames[mm] || mm} ${yyyy}`;
}

/**
 * Cross-matches GSTR-2B against Books Purchase Register
 */
export function reconcileGstr2bWithBooks(
  buyerBusinessName: string,
  buyerGstin: string,
  returnPeriod: string,
  gstr2bList: NormalizedGstr2bRecord[],
  booksList: BooksPurchaseRecord[],
  tolerance: number = 2.0
): ReconciliationReport {
  const rows: ReconciledRow[] = [];
  const matchedBooksIds = new Set<string>();
  const matchedGstr2bIndices = new Set<number>();

  let matchedItc = 0;
  let pendingItc = 0;
  let ineligibleItc = 0;

  // 1. Match from GSTR-2B perspective
  gstr2bList.forEach((g2b, gIdx) => {
    // Find matching record in books: match on normalized invoice number and supplier GSTIN/name
    const bookMatch = booksList.find((b) => {
      if (matchedBooksIds.has(b.id)) return false;

      // Primary check: exact or normalized invoice number
      const numMatches =
        b.billNumber.trim().toUpperCase() === g2b.invoiceNumber.trim().toUpperCase() ||
        b.normalizedBillNum === g2b.normalizedInvoiceNum;

      if (!numMatches) return false;

      // Secondary check: GSTIN match if available in books, otherwise supplier name similarity
      if (b.supplierGstin && g2b.supplierGstin) {
        return b.supplierGstin.trim().toUpperCase() === g2b.supplierGstin.trim().toUpperCase();
      }

      // If no GSTIN in books, accept invoice number match
      return true;
    });

    if (bookMatch) {
      matchedBooksIds.add(bookMatch.id);
      matchedGstr2bIndices.add(gIdx);

      const taxableDiff = Math.abs(bookMatch.taxableValue - g2b.taxableValue);
      const taxDiff = Math.abs(bookMatch.totalTax - g2b.totalTax);

      const isExactMatch = taxableDiff <= tolerance && taxDiff <= tolerance;

      if (isExactMatch) {
        if (g2b.itcAvailable) {
          matchedItc += g2b.totalTax;
        } else {
          ineligibleItc += g2b.totalTax;
        }

        rows.push({
          id: `match_${bookMatch.id}_${gIdx}`,
          supplierGstin: g2b.supplierGstin,
          supplierName: bookMatch.supplierName || g2b.supplierName,
          invoiceNumber: g2b.invoiceNumber,
          invoiceDate: g2b.invoiceDate,
          status: "MATCHED",
          statusLabel: "Matched (100% Eligible)",
          statusDesc: "Exact match in GSTR-2B & Books. Ready to claim in GSTR-3B Table 4(A)(5).",
          booksTaxable: bookMatch.taxableValue,
          booksTax: bookMatch.totalTax,
          booksTotal: bookMatch.totalAmount,
          booksBillId: bookMatch.id,
          gstr2bTaxable: g2b.taxableValue,
          gstr2bTax: g2b.totalTax,
          gstr2bIgst: g2b.igst,
          gstr2bCgst: g2b.cgst,
          gstr2bSgst: g2b.sgst,
          gstr2bTotal: g2b.totalAmount,
          itcAvailable: g2b.itcAvailable,
          supplierFiled: g2b.supplierFiled,
          taxableDiff: 0,
          taxDiff: 0,
        });
      } else {
        // Value Mismatch
        matchedItc += Math.min(bookMatch.totalTax, g2b.totalTax);

        rows.push({
          id: `mismatch_${bookMatch.id}_${gIdx}`,
          supplierGstin: g2b.supplierGstin,
          supplierName: bookMatch.supplierName || g2b.supplierName,
          invoiceNumber: g2b.invoiceNumber,
          invoiceDate: g2b.invoiceDate,
          status: "VALUE_MISMATCH",
          statusLabel: "Value / Tax Mismatch",
          statusDesc: `Taxable diff: ₹${taxableDiff.toFixed(2)}, Tax diff: ₹${taxDiff.toFixed(2)}. Verify physical bill.`,
          booksTaxable: bookMatch.taxableValue,
          booksTax: bookMatch.totalTax,
          booksTotal: bookMatch.totalAmount,
          booksBillId: bookMatch.id,
          gstr2bTaxable: g2b.taxableValue,
          gstr2bTax: g2b.totalTax,
          gstr2bTotal: g2b.totalAmount,
          itcAvailable: g2b.itcAvailable,
          supplierFiled: g2b.supplierFiled,
          taxableDiff,
          taxDiff,
        });
      }
    } else {
      // In 2B but missing in books
      rows.push({
        id: `missing_books_${gIdx}`,
        supplierGstin: g2b.supplierGstin,
        supplierName: g2b.supplierName,
        invoiceNumber: g2b.invoiceNumber,
        invoiceDate: g2b.invoiceDate,
        status: "MISSING_IN_BOOKS",
        statusLabel: "Missing in Books (Unclaimed ITC)",
        statusDesc: "Reported by supplier on GST portal, but no purchase bill or GRN found in SmartVyapar.",
        gstr2bTaxable: g2b.taxableValue,
        gstr2bTax: g2b.totalTax,
        gstr2bTotal: g2b.totalAmount,
        itcAvailable: g2b.itcAvailable,
        supplierFiled: g2b.supplierFiled,
        taxableDiff: g2b.taxableValue,
        taxDiff: g2b.totalTax,
      });
    }
  });

  // 2. Identify remaining books purchases that were NOT found in GSTR-2B (Missing in 2B!)
  booksList.forEach((b) => {
    if (!matchedBooksIds.has(b.id)) {
      pendingItc += b.totalTax;

      const { url, message } = generateSupplierWhatsAppNotice(
        buyerBusinessName,
        b.supplierName,
        b.supplierPhone,
        b.billNumber,
        b.billDate,
        b.totalAmount,
        b.totalTax,
        returnPeriod
      );

      rows.push({
        id: `missing_2b_${b.id}`,
        supplierGstin: b.supplierGstin || "UNREGISTERED",
        supplierName: b.supplierName,
        invoiceNumber: b.billNumber,
        invoiceDate: new Date(b.billDate).toLocaleDateString("en-IN"),
        status: "MISSING_IN_2B",
        statusLabel: "Missing in 2B (ITC At Risk!)",
        statusDesc: "Recorded in your books, but supplier has not filed GSTR-1. You cannot claim this ITC.",
        booksTaxable: b.taxableValue,
        booksTax: b.totalTax,
        booksTotal: b.totalAmount,
        booksBillId: b.id,
        taxableDiff: b.taxableValue,
        taxDiff: b.totalTax,
        whatsappUrl: url,
        whatsappMessage: message,
      });
    }
  });

  const matchedCount = rows.filter((r) => r.status === "MATCHED").length;
  const mismatchedCount = rows.filter((r) => r.status === "VALUE_MISMATCH").length;
  const missingIn2bCount = rows.filter((r) => r.status === "MISSING_IN_2B").length;
  const missingInBooksCount = rows.filter((r) => r.status === "MISSING_IN_BOOKS").length;

  return {
    returnPeriod,
    financialYear: "2026-2027",
    buyerGstin,
    summary: {
      total2bInvoices: gstr2bList.length,
      totalBooksInvoices: booksList.length,
      matchedCount,
      mismatchedCount,
      missingIn2bCount,
      missingInBooksCount,
      matchedItc,
      pendingItc,
      ineligibleItc,
    },
    rows,
  };
}

/**
 * Realistic Sample GSTR-2B JSON for Indian Auto Spares & Retail Merchants
 */
export function getSampleGstr2bJson(buyerGstin: string = "32AAAAA0000A1Z5", period: string = "082026"): Gstr2bPortalJson {
  return {
    gstin: buyerGstin,
    fp: period,
    data: {
      b2b: [
        {
          ctin: "32AAACB2150P1Z1",
          cname: "BOSCH AUTOMOTIVE AFTERMARKET LTD",
          cfs: "Y",
          inv: [
            {
              inum: "BOS-INV-2026-8801",
              idt: "05-08-2026",
              val: 28320.0,
              pos: "32",
              rev: "N",
              itcavl: "Y",
              items: [{ num: 1, rt: 18.0, txval: 24000.0, camt: 2160.0, samt: 2160.0, iamt: 0.0 }],
            },
            {
              inum: "BOS-INV-2026-8899",
              idt: "18-08-2026",
              val: 14160.0,
              pos: "32",
              rev: "N",
              itcavl: "Y",
              items: [{ num: 1, rt: 18.0, txval: 12000.0, camt: 1080.0, samt: 1080.0, iamt: 0.0 }],
            },
          ],
        },
        {
          ctin: "27AAACC4451N1Z3",
          cname: "CASTROL INDIA LUBRICANTS LIMITED",
          cfs: "Y",
          inv: [
            {
              inum: "CST-MUM-44021",
              idt: "11-08-2026",
              val: 47200.0,
              pos: "32",
              rev: "N",
              itcavl: "Y",
              items: [{ num: 1, rt: 18.0, txval: 40000.0, camt: 0.0, samt: 0.0, iamt: 7200.0 }],
            },
          ],
        },
        {
          ctin: "33AAACL9902M1Z8",
          cname: "LUMAX AUTO TECHNOLOGIES LIMITED",
          cfs: "Y",
          inv: [
            {
              inum: "LMX-CHE-9011",
              idt: "22-08-2026",
              val: 8260.0,
              pos: "32",
              rev: "N",
              itcavl: "Y",
              items: [{ num: 1, rt: 18.0, txval: 7000.0, camt: 0.0, samt: 0.0, iamt: 1260.0 }],
            },
          ],
        },
      ],
    },
  };
}
