import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    
    const body = await req.json();
    const { customers } = body; 

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "No customers provided" }, { status: 400 });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const [index, row] of customers.entries()) {
      try {
        const name = row.name?.trim();
        const phone = row.phone?.trim();
        if (!name) {
          errorCount++;
          errors.push(`Row ${index + 1}: Name is required`);
          continue;
        }

        const openingBalance = parseFloat(row.openingBalance) || 0;

        await prisma.$transaction(async (tx) => {
          const arAccount = await tx.account.create({
            data: {
              tenantId,
              code: `AR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
              name: `Customer: ${name}`,
              classification: 'ASSET',
              balance: openingBalance,
            }
          });

          await tx.customer.create({
            data: {
              tenantId,
              name,
              phone: phone || null,
              email: row.email?.trim() || null,
              gstin: row.gstin?.trim() || null,
              address: row.address?.trim() || null,
              pincode: row.pincode?.trim() || null,
              stateCode: row.stateCode?.trim() || "32",
              outstandingBalance: openingBalance,
              accountId: arAccount.id
            }
          });
        });

        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(`Row ${index + 1} (${row.name}): ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      imported: successCount, 
      failed: errorCount, 
      errors 
    });

  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
