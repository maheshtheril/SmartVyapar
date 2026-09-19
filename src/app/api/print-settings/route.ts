import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { BUILT_IN_PRESETS, PrintDocType } from "@/lib/print/template-presets";

export const dynamic = "force-dynamic";

// GET /api/print-settings - Fetch all templates for tenant, auto-seeding defaults if empty
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;

    let templates = await prisma.printTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ docType: "asc" }, { isDefault: "desc" }, { createdAt: "asc" }],
    });

    // Auto-seed default templates for this tenant if not seeded yet
    if (templates.length === 0) {
      const seedOperations = BUILT_IN_PRESETS.map((preset) =>
        prisma.printTemplate.create({
          data: {
            tenantId,
            name: preset.name,
            docType: preset.docType,
            paperSize: preset.paperSize,
            brand: preset.brand as any,
            sections: preset.sections as any,
            automation: preset.automation as any,
            isDefault:
              preset.id === "classic_gst_a4" ||
              preset.id === "thermal_roll_80mm" ||
              preset.id === "auto_workshop_master" ||
              preset.id === "kot_kitchen_ticket",
            isActive: true,
          },
        })
      );

      await prisma.$transaction(seedOperations);

      templates = await prisma.printTemplate.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ docType: "asc" }, { isDefault: "desc" }, { createdAt: "asc" }],
      });
    }

    // Group by docType
    const grouped: Record<string, typeof templates> = {};
    const allDocTypes: PrintDocType[] = [
      "sale_bill",
      "pos_bill",
      "auto_workshop",
      "kot",
      "credit_note",
      "challan",
    ];

    for (const dt of allDocTypes) {
      grouped[dt] = [];
    }

    for (const tpl of templates) {
      if (!grouped[tpl.docType]) {
        grouped[tpl.docType] = [];
      }
      grouped[tpl.docType].push(tpl);
    }

    return NextResponse.json({
      success: true,
      templates: grouped,
      all: templates,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching print settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/print-settings - Create a new print template (OWNER/MANAGER)
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;
    const body = await req.json();

    const { name, docType, paperSize, brand, sections, automation, isDefault } = body;

    if (!name || !docType) {
      return NextResponse.json(
        { error: "Template name and document type are required" },
        { status: 400 }
      );
    }

    const template = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        // Demote previous default
        await tx.printTemplate.updateMany({
          where: { tenantId, docType },
          data: { isDefault: false },
        });
      }

      return tx.printTemplate.create({
        data: {
          tenantId,
          name: name.trim(),
          docType,
          paperSize: paperSize || "a4",
          brand: brand || {},
          sections: sections || {},
          automation: automation || {},
          isDefault: Boolean(isDefault),
          isActive: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError" || error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating print template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
