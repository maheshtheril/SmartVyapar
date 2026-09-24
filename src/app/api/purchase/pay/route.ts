import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/purchase/pay
 * Records a payment to a supplier, settling outstanding purchase bills (FIFO).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const body = await req.json();
    const supplierName = body.supplierName?.trim();
    const amount = Number(body.amount);
    const mode: string = body.mode || "BANK";
    const notes: string = body.notes || "";

    if (!supplierName) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
    }

    const appliedAmount = await prisma.$transaction(async (tx) => {
      // Fetch unpaid bills for this supplier INSIDE the transaction
      const unpaidBills = await tx.purchaseBill.findMany({
        where: {
          tenantId,
          supplierName,
          paymentStatus: { in: ["UNPAID", "PARTIAL"] },
        },
        orderBy: { billDate: "asc" },
      });

      if (unpaidBills.length === 0) {
        throw new Error("No outstanding bills for this supplier");
      }

      let remaining = amount;
      let appliedAmount = 0;

      // Apply payment across bills (oldest first)
      for (const bill of unpaidBills) {
        if (remaining <= 0) break;
        const due = Number(bill.dueAmount || 0);
        if (due <= 0) continue;

        const applyToThis = Math.min(remaining, due);
        const newPaid = Number(bill.paidAmount || 0) + applyToThis;
        const newDue = Math.max(0, due - applyToThis);
        const newStatus = newDue < 0.01 ? "PAID" : "PARTIAL";

        const result = await tx.purchaseBill.updateMany({
          where: { id: bill.id, dueAmount: due },
          data: {
            paidAmount: newPaid,
            dueAmount: newDue,
            paymentStatus: newStatus as any,
            notes: notes
              ? `${bill.notes ? bill.notes + " | " : ""}Supplier payment ₹${applyToThis.toFixed(2)} via ${mode}`
              : bill.notes,
          },
        });

        if (result.count === 0) {
          throw new Error("Concurrency error: Bill balance changed while processing payment");
        }

        remaining -= applyToThis;
        appliedAmount += applyToThis;
      }

      // Automated Double-Entry Accounting
      const { postSupplierPaymentJournalEntry } = await import("@/lib/accounting-mapper");
      await postSupplierPaymentJournalEntry(tx, tenantId, supplierName, appliedAmount, mode);

      // Audit log
      await recordAuditLog(
        {
          tenantId,
          userId: session.userId,
          action: AuditAction.UPDATE,
          entityType: "PURCHASE_BILL",
          entityId: unpaidBills[0].id,
          details: {
            event: "SUPPLIER_PAYMENT",
            amount: appliedAmount,
            mode,
            notes,
            supplierName,
          },
        },
        tx
      );
      
      return appliedAmount;
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      applied: appliedAmount,
      message: `₹${appliedAmount.toFixed(2)} recorded as ${mode} payment to ${supplierName}`,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Supplier payment error:", err);
    return NextResponse.json({ error: err.message || "Failed to record payment" }, { status: 500 });
  }
}
