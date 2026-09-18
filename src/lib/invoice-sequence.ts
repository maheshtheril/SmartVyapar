import { Prisma } from "@prisma/client";

/**
 * Calculates Indian Financial Year according to GST rules (April 1 to March 31).
 * Example:
 *   September 18, 2026 -> full: "2026-27", compact: "2627"
 *   January 15, 2027   -> full: "2026-27", compact: "2627"
 *   April 1, 2027      -> full: "2027-28", compact: "2728"
 */
export function getIndianFinancialYear(date: Date = new Date()): {
  full: string;
  compact: string;
  startYear: number;
  endYear: number;
} {
  // Convert date to Indian Standard Time (UTC+05:30) so servers in US/EU calculate IST FY correctly
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const istDate = new Date(utcTime + istOffsetMs);

  const month = istDate.getMonth(); // 0 = Jan, 3 = Apr, 11 = Dec in IST
  const year = istDate.getFullYear();

  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  const startYear2d = String(startYear).slice(-2);
  const endYear2d = String(endYear).slice(-2);

  return {
    full: `${startYear}-${endYear2d}`,
    compact: `${startYear2d}${endYear2d}`,
    startYear,
    endYear,
  };
}

export interface NextInvoiceNumberOptions {
  tenantId: string;
  prefix?: string;
  date?: Date;
}

export interface NextInvoiceNumberResult {
  invoiceNumber: string;
  sequenceNumber: number;
  financialYear: string;
}

/**
 * Atomically generates the next consecutive, unique GST Tax Invoice Number.
 * Must be executed inside a Prisma interactive transaction client (`tx`).
 *
 * Utilizes PostgreSQL row-level locking via atomic upsert with `increment: 1`
 * on the `invoice_sequences` table. Guaranteed race-condition safe across concurrent checkouts.
 */
export async function generateNextInvoiceNumber(
  tx: Prisma.TransactionClient,
  options: NextInvoiceNumberOptions
): Promise<NextInvoiceNumberResult> {
  const { tenantId, prefix = "INV", date = new Date() } = options;
  const fy = getIndianFinancialYear(date);

  // Atomic row-level increment on (tenantId, financialYear, prefix)
  const sequence = await tx.invoiceSequence.upsert({
    where: {
      tenantId_financialYear_prefix: {
        tenantId,
        financialYear: fy.full,
        prefix,
      },
    },
    create: {
      tenantId,
      financialYear: fy.full,
      prefix,
      lastNumber: 1,
    },
    update: {
      lastNumber: { increment: 1 },
    },
  });

  const paddedSerial = sequence.lastNumber.toString().padStart(4, "0");
  const invoiceNumber = `${prefix}-${fy.compact}-${paddedSerial}`;

  return {
    invoiceNumber,
    sequenceNumber: sequence.lastNumber,
    financialYear: fy.full,
  };
}
