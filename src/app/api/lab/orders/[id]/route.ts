import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const order = await prisma.labOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            test: {
              include: {
                parameters: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
        results: {
          orderBy: { orderIndex: "asc" },
        },
        referringDoctor: true,
        tenant: {
          select: {
            businessName: true,
            legalName: true,
            address: true,
            phone: true,
            email: true,
            gstin: true,
            labAccreditationNo: true,
            labPathologistName: true,
            labPathologistRegNo: true,
            labPathologistDegree: true,
            labPathologistSignatureUrl: true,
          },
        },
      },
    });

    if (!order || order.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Error in GET /api/lab/orders/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { action } = body;

    const existingOrder = await prisma.labOrder.findUnique({
      where: { id },
    });

    if (!existingOrder || existingOrder.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 1. Phlebotomy Collection
    if (action === "COLLECT_SAMPLE") {
      const { phlebotomistName, sampleType } = body;
      const updated = await prisma.labOrder.update({
        where: { id },
        data: {
          status: "SAMPLE_COLLECTED",
          collectedAt: new Date(),
          collectedBy: phlebotomistName?.trim() || session.name || "Phlebotomist",
          sampleType: sampleType || existingOrder.sampleType,
        },
      });
      return NextResponse.json({ success: true, order: updated });
    }

    // 2. Mark Testing in Progress
    if (action === "START_TESTING") {
      const updated = await prisma.labOrder.update({
        where: { id },
        data: {
          status: "IN_TESTING",
          receivedAt: new Date(),
          testedBy: session.name,
        },
      });
      return NextResponse.json({ success: true, order: updated });
    }

    // 3. Save Diagnostic Results & Formulate Abnormal Flags
    if (action === "SAVE_RESULTS" || action === "VERIFY_AND_SIGN") {
      const { results = [], pathologistRemarks, isVerified } = body;

      // Delete existing results and re-insert updated values
      await prisma.labOrderResult.deleteMany({
        where: { labOrderId: id },
      });

      let hasCriticalAlert = false;
      let criticalNotes = "";

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.flag === "CRITICAL_HIGH" || r.flag === "CRITICAL_LOW") {
          hasCriticalAlert = true;
          criticalNotes += `${r.parameterName}: ${r.resultValue} ${r.unit || ""} (${r.flag.replace("_", " ")}); `;
        }

        await prisma.labOrderResult.create({
          data: {
            labOrderId: id,
            parameterId: r.parameterId || null,
            testName: r.testName,
            parameterName: r.parameterName,
            parameterCode: r.parameterCode || null,
            resultValue: String(r.resultValue ?? "").trim(),
            numericValue: r.numericValue !== null && r.numericValue !== undefined && !isNaN(Number(r.numericValue)) ? Number(r.numericValue) : null,
            unit: r.unit || null,
            referenceInterval: r.referenceInterval || null,
            flag: r.flag || "NORMAL",
            remarks: r.remarks || null,
            orderIndex: i + 1,
          },
        });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
      });

      const shouldVerify = action === "VERIFY_AND_SIGN" || isVerified;
      const updateData: any = {
        pathologistRemarks: pathologistRemarks?.trim() || existingOrder.pathologistRemarks,
        hasCriticalAlert,
        criticalAlertNotes: criticalNotes || existingOrder.criticalAlertNotes,
        status: shouldVerify ? "VERIFIED" : "RESULTS_ENTERED",
        testedAt: existingOrder.testedAt || new Date(),
        testedBy: existingOrder.testedBy || session.name,
      };

      if (shouldVerify) {
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = tenant?.labPathologistName || session.name;
        updateData.pathologistSignatureUrl = tenant?.labPathologistSignatureUrl || null;
      }

      const updated = await prisma.labOrder.update({
        where: { id },
        data: updateData,
        include: {
          results: { orderBy: { orderIndex: "asc" } },
        },
      });

      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in PATCH /api/lab/orders/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
