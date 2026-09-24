import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/customers/[id]/payment
 * Records a Khata (credit) payment against a customer's outstanding balance.
 * Applies the payment to the oldest unpaid invoices first (FIFO).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const { id: customerId } = await params;

    const body = await req.json();
    const amount = Number(body.amount);
    const mode: string = body.mode || "CASH";
    const notes: string = body.notes || "";

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
    }

    // Verify customer belongs to this tenant
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true, outstandingBalance: true, tenantId: true },
    });

    if (!customer || customer.tenantId !== tenantId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const currentBalance = Number(customer.outstandingBalance || 0);
    if (currentBalance <= 0) {
      return NextResponse.json({ error: "No outstanding balance for this customer" }, { status: 400 });
    }

    const paymentToApply = Math.min(amount, currentBalance);

    await prisma.$transaction(async (tx) => {
      // Fetch oldest unpaid/partial invoices for this customer (FIFO) INSIDE the transaction
      const unpaidInvoices = await tx.invoice.findMany({
        where: {
          tenantId,
          customerId,
          paymentStatus: { in: ["UNPAID", "PARTIAL"] },
        },
        orderBy: { invoiceDate: "asc" },
      });

      let remaining = paymentToApply;

      // Apply payment across invoices (oldest first)
      for (const inv of unpaidInvoices) {
        if (remaining <= 0) break;
        const due = Number(inv.dueAmount || 0);
        if (due <= 0) continue;

        const applyToThis = Math.min(remaining, due);
        const newPaid = Number(inv.paidAmount || 0) + applyToThis;
        const newDue = Math.max(0, due - applyToThis);
        const newStatus = newDue < 0.01 ? "PAID" : "PARTIAL";

        const result = await tx.invoice.updateMany({
          where: { id: inv.id, dueAmount: due },
          data: {
            paidAmount: newPaid,
            dueAmount: newDue,
            paymentStatus: newStatus as any,
            notes: notes
              ? `${inv.notes ? inv.notes + " | " : ""}Khata payment ₹${applyToThis.toFixed(2)} via ${mode}`
              : inv.notes,
          },
        });

        if (result.count === 0) {
          throw new Error("Concurrency error: Invoice balance changed while processing payment");
        }

        remaining -= applyToThis;
      }

      // Deduct from customer outstanding balance
      const newBalance = Math.max(0, currentBalance - paymentToApply);
      const custResult = await tx.customer.updateMany({
        where: { id: customerId, outstandingBalance: currentBalance },
        data: { outstandingBalance: newBalance },
      });

      if (custResult.count === 0) {
        throw new Error("Concurrency error: Customer balance changed while processing payment");
      }

      // Audit log
      await recordAuditLog(
        {
          tenantId,
          userId: session.userId,
          action: AuditAction.UPDATE,
          entityType: "CUSTOMER",
          entityId: customerId,
          details: {
            event: "KHATA_PAYMENT",
            amount: paymentToApply,
            mode,
            notes,
            previousBalance: currentBalance,
            newBalance,
          },
        },
        tx
      );

      // Automated Double-Entry Accounting
      const { postCustomerPaymentJournalEntry } = await import("@/lib/accounting-mapper");
      await postCustomerPaymentJournalEntry(tx, tenantId, customerId, paymentToApply, mode);
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      applied: paymentToApply,
      newBalance: Math.max(0, currentBalance - paymentToApply),
      message: `₹${paymentToApply.toFixed(2)} recorded as ${mode} payment for ${customer.name}`,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Khata payment error:", err);
    return NextResponse.json({ error: err.message || "Failed to record payment" }, { status: 500 });
  }
}
