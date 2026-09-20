import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface CustomerAgingBucket {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGstin?: string | null;
  totalOutstanding: number;
  current0to30: number;
  days31to60: number;
  days61to90: number;
  days90Plus: number;
  oldestInvoiceDate: string | null;
  unpaidInvoiceCount: number;
  whatsappNoticeUrl: string;
}

// GET /api/customers/aging - Compute live Debtors Aging report
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const [tenant, customers, unpaidInvoices] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessName: true, phone: true, upiId: true },
      }),
      prisma.customer.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          phone: true,
          gstin: true,
          outstandingBalance: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          tenantId,
          paymentStatus: { in: ["UNPAID", "PARTIAL"] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          customerId: true,
          customerName: true,
          customerPhone: true,
          totalAmount: true,
          paidAmount: true,
          dueAmount: true,
        },
        orderBy: { invoiceDate: "asc" },
      }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const now = new Date();
    const customerMap = new Map<string, CustomerAgingBucket>();

    // Seed customerMap with all customers having positive balance or unpaid invoices
    for (const c of customers) {
      const balance = Number(c.outstandingBalance || 0);
      if (balance > 0) {
        customerMap.set(c.id, {
          customerId: c.id,
          customerName: c.name,
          customerPhone: c.phone,
          customerGstin: c.gstin,
          totalOutstanding: balance,
          current0to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90Plus: 0,
          oldestInvoiceDate: null,
          unpaidInvoiceCount: 0,
          whatsappNoticeUrl: "",
        });
      }
    }

    // Process unpaid invoices to allocate aging buckets
    for (const inv of unpaidInvoices) {
      const cId = inv.customerId || `adhoc_${inv.customerPhone}`;
      const due = Number(inv.dueAmount || (Number(inv.totalAmount) - Number(inv.paidAmount)));

      if (due <= 0) continue;

      let entry = customerMap.get(cId);
      if (!entry) {
        entry = {
          customerId: cId,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          customerGstin: null,
          totalOutstanding: 0,
          current0to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90Plus: 0,
          oldestInvoiceDate: null,
          unpaidInvoiceCount: 0,
          whatsappNoticeUrl: "",
        };
        customerMap.set(cId, entry);
      }

      entry.unpaidInvoiceCount += 1;
      const invDate = new Date(inv.invoiceDate);
      if (!entry.oldestInvoiceDate || invDate < new Date(entry.oldestInvoiceDate)) {
        entry.oldestInvoiceDate = invDate.toISOString();
      }

      const diffMs = now.getTime() - invDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (diffDays <= 30) {
        entry.current0to30 += due;
      } else if (diffDays <= 60) {
        entry.days31to60 += due;
      } else if (diffDays <= 90) {
        entry.days61to90 += due;
      } else {
        entry.days90Plus += due;
      }
    }

    // Update totalOutstanding and construct WhatsApp follow-up link
    const rows: CustomerAgingBucket[] = [];
    let grandTotal = 0;
    let total0to30 = 0;
    let total31to60 = 0;
    let total61to90 = 0;
    let total90Plus = 0;

    Array.from(customerMap.values()).forEach((entry) => {
      const bucketSum = entry.current0to30 + entry.days31to60 + entry.days61to90 + entry.days90Plus;
      if (bucketSum > 0) {
        entry.totalOutstanding = bucketSum;
      }

      if (entry.totalOutstanding <= 0) return;

      grandTotal += entry.totalOutstanding;
      total0to30 += entry.current0to30;
      total31to60 += entry.days31to60;
      total61to90 += entry.days61to90;
      total90Plus += entry.days90Plus;

      // WhatsApp dunning text
      const cleanPhone = (entry.customerPhone || "").replace(/\D/g, "");
      const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const upiPayLink = tenant.upiId
        ? `upi://pay?pa=${encodeURIComponent(tenant.upiId)}&pn=${encodeURIComponent(tenant.businessName)}&am=${entry.totalOutstanding.toFixed(2)}&cu=INR`
        : "";

      const msg =
        `*PAYMENT REMINDER / KHATA STATEMENT*\n\n` +
        `Dear *${entry.customerName}*,\n` +
        `Greetings from *${tenant.businessName}*.\n\n` +
        `This is a friendly reminder that you have an outstanding balance of *₹${entry.totalOutstanding.toFixed(2)}* across ${entry.unpaidInvoiceCount} invoice(s).\n\n` +
        (entry.days90Plus > 0 ? `⚠️ *Overdue (>90 Days):* ₹${entry.days90Plus.toFixed(2)}\n` : "") +
        (entry.days61to90 > 0 ? `⚠️ *Overdue (61-90 Days):* ₹${entry.days61to90.toFixed(2)}\n` : "") +
        (entry.days31to60 > 0 ? `• *Due (31-60 Days):* ₹${entry.days31to60.toFixed(2)}\n` : "") +
        (entry.current0to30 > 0 ? `• *Current (0-30 Days):* ₹${entry.current0to30.toFixed(2)}\n` : "") +
        `\nKindly clear the dues at your earliest convenience via UPI:\n` +
        (tenant.upiId ? `💳 *UPI ID:* ${tenant.upiId}\n` : "") +
        `\nThank you for your business!\n*${tenant.businessName}*`;

      entry.whatsappNoticeUrl = phoneParam
        ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;

      rows.push(entry);
    });

    // Sort descending by highest outstanding balance
    rows.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    return NextResponse.json({
      success: true,
      summary: {
        grandTotal: Math.round(grandTotal * 100) / 100,
        total0to30: Math.round(total0to30 * 100) / 100,
        total31to60: Math.round(total31to60 * 100) / 100,
        total61to90: Math.round(total61to90 * 100) / 100,
        total90Plus: Math.round(total90Plus * 100) / 100,
        customerCount: rows.length,
        criticalOverdue: Math.round((total61to90 + total90Plus) * 100) / 100,
      },
      rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Debtors Aging Error:", error);
    return NextResponse.json({ error: error.message || "Failed to compute aging" }, { status: 500 });
  }
}
