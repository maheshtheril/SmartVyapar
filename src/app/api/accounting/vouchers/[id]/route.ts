import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/accounting/vouchers/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const voucher = await prisma.journalEntry.findFirst({
      where: { id: params.id, tenantId },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, classification: true } },
          },
        },
      },
    });

    if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    return NextResponse.json({ success: true, voucher });
  } catch (error: any) {
    if (error.name === "ForbiddenError") return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.name === "AuthError") return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch voucher" }, { status: 500 });
  }
}

// PUT /api/accounting/vouchers/[id] — Edit voucher: reverse old ledger entries, post new ones
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const { date, narration, referenceNo, lines } = body;

    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json({ error: "At least 2 journal lines are required" }, { status: 400 });
    }

    // Validate lines are balanced (total debits === total credits)
    const totalDebit  = lines.reduce((s: number, l: any) => s + Number(l.debit  || 0), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + Number(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Voucher is unbalanced! Debits: ₹${totalDebit.toFixed(2)}, Credits: ₹${totalCredit.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Load existing voucher with old lines
    const existing = await prisma.journalEntry.findFirst({
      where: { id: params.id, tenantId },
      include: { lines: { include: { account: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

    const updatedVoucher = await prisma.$transaction(async (tx) => {

      // ── 1. REVERSE old account balance impacts ──────────────────────────────
      for (const oldLine of existing.lines) {
        const delta = Number(oldLine.debit) - Number(oldLine.credit); // net debit impact
        if (delta !== 0) {
          await tx.account.update({
            where: { id: oldLine.accountId },
            data: { balance: { decrement: delta } }, // undo old impact
          });
        }
      }

      // ── 2. Delete old lines ─────────────────────────────────────────────────
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: params.id },
      });

      // ── 3. Update voucher header ────────────────────────────────────────────
      const voucher = await tx.journalEntry.update({
        where: { id: params.id },
        data: {
          date:        date       ? new Date(date) : existing.date,
          narration:   narration  ?? existing.narration,
          referenceNo: referenceNo ?? existing.referenceNo,
          totalAmount: totalDebit,
          lines: {
            create: lines.map((l: any) => ({
              accountId: l.accountId,
              debit:     Number(l.debit  || 0),
              credit:    Number(l.credit || 0),
              narration: l.narration || null,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });

      // ── 4. POST new account balance impacts ─────────────────────────────────
      for (const newLine of lines) {
        const delta = Number(newLine.debit || 0) - Number(newLine.credit || 0);
        if (delta !== 0) {
          await tx.account.update({
            where: { id: newLine.accountId },
            data: { balance: { increment: delta } },
          });
        }
      }

      // ── 5. Audit log ────────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          tenantId,
          userId:     session.userId,
          userName:   session.name || "Manager",
          action:     AuditAction.UPDATE,
          entityType: "JOURNAL_ENTRY",
          entityId:   voucher.id,
          details: {
            voucherNumber: voucher.voucherNumber,
            voucherType:   voucher.voucherType,
            totalAmount:   totalDebit,
            ledgerReversed: true,
          },
        },
      });

      return voucher;
    });

    return NextResponse.json({
      success: true,
      message: "Voucher updated & ledger re-posted successfully",
      voucher: updatedVoucher,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.name === "AuthError")      return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("Error updating voucher:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
