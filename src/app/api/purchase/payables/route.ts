import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface VendorPayableBucket {
  supplierName: string;
  supplierGstin?: string | null;
  totalPayable: number;
  current0to30: number;
  days31to60: number;
  days61to90: number;
  days90Plus: number;
  billsCount: number;
  oldestBillDate: string | null;
  bills: Array<{
    id: string;
    billNumber: string;
    billDate: string;
    totalAmount: number;
    paymentTerms?: string | null;
  }>;
}

// GET /api/purchase/payables - Compute live Creditors Accounts Payable Aging
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    const purchaseBills = await prisma.purchaseBill.findMany({
      where: {
        tenantId,
      },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        supplierName: true,
        supplierGstin: true,
        paymentTerms: true,
        totalAmount: true,
      },
      orderBy: { billDate: "asc" },
    });

    const now = new Date();
    const vendorMap = new Map<string, VendorPayableBucket>();

    for (const bill of purchaseBills) {
      const sName = bill.supplierName?.trim() || "Unknown Supplier";
      let entry = vendorMap.get(sName);
      if (!entry) {
        entry = {
          supplierName: sName,
          supplierGstin: bill.supplierGstin,
          totalPayable: 0,
          current0to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90Plus: 0,
          billsCount: 0,
          oldestBillDate: null,
          bills: [],
        };
        vendorMap.set(sName, entry);
      }

      const amount = Number(bill.totalAmount || 0);
      entry.totalPayable += amount;
      entry.billsCount += 1;

      const bDate = new Date(bill.billDate);
      if (!entry.oldestBillDate || bDate < new Date(entry.oldestBillDate)) {
        entry.oldestBillDate = bDate.toISOString();
      }

      const diffMs = now.getTime() - bDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (diffDays <= 30) {
        entry.current0to30 += amount;
      } else if (diffDays <= 60) {
        entry.days31to60 += amount;
      } else if (diffDays <= 90) {
        entry.days61to90 += amount;
      } else {
        entry.days90Plus += amount;
      }

      entry.bills.push({
        id: bill.id,
        billNumber: bill.billNumber,
        billDate: bill.billDate.toISOString(),
        totalAmount: amount,
        paymentTerms: bill.paymentTerms,
      });
    }

    const rows: VendorPayableBucket[] = [];
    let grandTotal = 0;
    let total0to30 = 0;
    let total31to60 = 0;
    let total61to90 = 0;
    let total90Plus = 0;

    Array.from(vendorMap.values()).forEach((entry) => {
      grandTotal += entry.totalPayable;
      total0to30 += entry.current0to30;
      total31to60 += entry.days31to60;
      total61to90 += entry.days61to90;
      total90Plus += entry.days90Plus;

      rows.push(entry);
    });

    // Sort descending by highest payable amount
    rows.sort((a, b) => b.totalPayable - a.totalPayable);

    return NextResponse.json({
      success: true,
      summary: {
        grandTotal: Math.round(grandTotal * 100) / 100,
        total0to30: Math.round(total0to30 * 100) / 100,
        total31to60: Math.round(total31to60 * 100) / 100,
        total61to90: Math.round(total61to90 * 100) / 100,
        total90Plus: Math.round(total90Plus * 100) / 100,
        supplierCount: rows.length,
        criticalOverdue: Math.round((total61to90 + total90Plus) * 100) / 100,
      },
      rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Vendor Payables Error:", error);
    return NextResponse.json({ error: error.message || "Failed to compute vendor payables" }, { status: 500 });
  }
}
