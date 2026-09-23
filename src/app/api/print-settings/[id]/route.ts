import { NextRequest, NextResponse } from "next/server";
import { prisma, DEFAULT_TX_OPTIONS } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/print-settings/[id] - Update template or set as active default
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;
    const { id } = params;

    const existing = await prisma.printTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, paperSize, brand, sections, automation, isDefault } = body;

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        // Demote other templates of this docType
        await tx.printTemplate.updateMany({
          where: { tenantId, docType: existing.docType },
          data: { isDefault: false },
        });
      }

      return tx.printTemplate.update({
        where: { id },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(paperSize ? { paperSize } : {}),
          ...(brand ? { brand } : {}),
          ...(sections ? { sections } : {}),
          ...(automation ? { automation } : {}),
          ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
        },
      });
    }, DEFAULT_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError" || error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error updating print template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/print-settings/[id] - Delete a print template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(req, ["OWNER", "MANAGER"]);
    const tenantId = session.tenantId;
    const { id } = params;

    const existing = await prisma.printTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the active default template. Set another template as default first." },
        { status: 400 }
      );
    }

    await prisma.printTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error: any) {
    if (error.name === "ForbiddenError" || error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error deleting print template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
