import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { CreateVoucherSchema, CreateVoucherInput } from "@/lib/schemas/voucher";
import { VoucherType, AccountClassification } from "@prisma/client";

/**
 * Returns the two-letter statutory prefix for voucher types:
 * PAYMENT -> PV
 * RECEIPT -> RV
 * CONTRA  -> CV
 * JOURNAL -> JV
 */
export function getVoucherPrefix(type: VoucherType | string): string {
  switch (type) {
    case "PAYMENT":
      return "PV";
    case "RECEIPT":
      return "RV";
    case "CONTRA":
      return "CV";
    case "JOURNAL":
    default:
      return "JV";
  }
}

/**
 * Generates the next sequential voucher number for the given tenant and voucher type:
 * Example: "PV-2026-0001", "RV-2026-0002"
 */
export async function generateVoucherNumber(
  tenantId: string,
  voucherType: VoucherType
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = getVoucherPrefix(voucherType);

  const count = await prisma.journalEntry.count({
    where: {
      tenantId,
      voucherType,
      voucherNumber: {
        startsWith: `${prefix}-${year}-`,
      },
    },
  });

  const nextSeq = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${nextSeq}`;
}

/**
 * Calculates new ledger balance based on standard accounting rules:
 * - ASSET / EXPENSE: Debit increases balance, Credit decreases balance.
 * - LIABILITY / EQUITY / REVENUE: Credit increases balance, Debit decreases balance.
 */
export function computeAccountBalanceDelta(
  classification: AccountClassification,
  debit: number,
  credit: number
): number {
  if (classification === "ASSET" || classification === "EXPENSE") {
    return debit - credit;
  } else {
    return credit - debit;
  }
}

/**
 * Executes an atomic, double-entry voucher transaction.
 * Enforces \sum(Debits) === \sum(Credits), records journal lines,
 * and updates each affected account's ledger balance.
 */
export async function createVoucherTransaction(
  tenantId: string,
  rawInput: CreateVoucherInput,
  user?: { id?: string; name?: string }
) {
  const validated = CreateVoucherSchema.parse(rawInput);
  const voucherType = validated.voucherType as VoucherType;
  const voucherNumber = await generateVoucherNumber(tenantId, voucherType);

  const totalAmount = validated.lines.reduce((sum, l) => sum + l.debit, 0);

  // Verify that all accounts exist and belong to this tenant
  const accountIds = Array.from(new Set(validated.lines.map((l) => l.accountId)));
  const existingAccounts = await prisma.account.findMany({
    where: {
      tenantId,
      id: { in: accountIds },
      isActive: true,
    },
  });

  if (existingAccounts.length !== accountIds.length) {
    throw new Error(
      `One or more ledger accounts were not found or belong to an inactive ledger.`
    );
  }

  const accountMap = new Map(existingAccounts.map((a) => [a.id, a]));

  return await prisma.$transaction(async (tx) => {
    // 1. Create the Journal Entry header with lines
    const journalEntry = await tx.journalEntry.create({
      data: {
        tenantId,
        voucherNumber,
        voucherType,
        date: validated.date ? new Date(validated.date) : new Date(),
        narration: validated.narration,
        referenceNo: validated.referenceNo || null,
        totalAmount,
        lines: {
          create: validated.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            narration: line.narration || null,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    // 2. Update each affected ledger account's balance
    for (const line of validated.lines) {
      const acc = accountMap.get(line.accountId)!;
      const delta = computeAccountBalanceDelta(acc.classification, line.debit, line.credit);

      await tx.account.update({
        where: { id: line.accountId },
        data: {
          balance: {
            increment: delta,
          },
        },
      });
    }

    // 3. Record MCA Audit Log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: user?.id || null,
        userName: user?.name || "System Accountant",
        action: "ACCOUNTING_VOUCHER_CREATED",
        entityType: "ACCOUNTING_VOUCHER",
        entityId: journalEntry.id,
        details: {
          voucherNumber,
          voucherType,
          totalAmount,
          lineCount: validated.lines.length,
          referenceNo: validated.referenceNo || null,
        },
      },
    });

    return journalEntry;
  }, DEFAULT_TX_OPTIONS);
}

/**
 * Retrieves a paginated/filtered list of vouchers for the tenant.
 */
export async function getVouchers(
  tenantId: string,
  options?: {
    voucherType?: VoucherType;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    take?: number;
    skip?: number;
  }
) {
  const where: any = { tenantId };

  if (options?.voucherType) {
    where.voucherType = options.voucherType;
  }

  if (options?.search) {
    const q = options.search.trim();
    where.OR = [
      { voucherNumber: { contains: q, mode: "insensitive" } },
      { narration: { contains: q, mode: "insensitive" } },
      { referenceNo: { contains: q, mode: "insensitive" } },
    ];
  }

  if (options?.startDate || options?.endDate) {
    where.date = {};
    if (options?.startDate) where.date.gte = options.startDate;
    if (options?.endDate) where.date.lte = options.endDate;
  }

  const [total, vouchers] = await Promise.all([
    prisma.journalEntry.count({ where }),
    prisma.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      take: options?.take || 50,
      skip: options?.skip || 0,
      include: {
        lines: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                classification: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return { total, vouchers };
}
