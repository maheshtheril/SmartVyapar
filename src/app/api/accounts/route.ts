import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { AccountClassification } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/accounts - Fetch Chart of Accounts from Neon DB (OWNER/MANAGER only)
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const classification = searchParams.get("classification")?.toUpperCase();

    const where: any = {
      tenantId,
      isActive: true,
    };

    if (classification && classification in AccountClassification) {
      where.classification = classification as AccountClassification;
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { code: "asc" },
    });

    // Compute totals per classification
    const summary = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0,
    };

    for (const acc of accounts) {
      const b = Number(acc.balance);
      if (acc.classification === "ASSET") summary.totalAssets += b;
      if (acc.classification === "LIABILITY") summary.totalLiabilities += b;
      if (acc.classification === "EQUITY") summary.totalEquity += b;
      if (acc.classification === "REVENUE") summary.totalRevenue += b;
      if (acc.classification === "EXPENSE") summary.totalExpenses += b;
    }

    return NextResponse.json({
      success: true,
      accounts,
      summary,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/accounts - Create new account in Neon DB (OWNER/MANAGER only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      code,
      name,
      classification,
      balance = 0,
    } = body;

    const account = await prisma.account.create({
      data: {
        tenantId,
        code,
        name,
        classification: classification as AccountClassification,
        balance: Number(balance),
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error creating account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
