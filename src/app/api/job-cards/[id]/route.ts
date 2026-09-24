import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { JobCardStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    
    const jobCard = await prisma.jobCard.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      },
      include: {
        vehicle: {
          include: { customer: true }
        },
        items: {
          include: { product: true }
        }
      }
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    return NextResponse.json(jobCard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    const tenantId = session.tenantId;
    const body = await request.json();

    const { status, approvedEstimate, mechanicNotes, odometerReading, inspectionDetails, deliveryDetails, approvalDetails } = body;

    const existingJobCard = await prisma.jobCard.findFirst({
      where: { id: params.id, tenantId }
    });

    if (!existingJobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (status && Object.values(JobCardStatus).includes(status)) {
      // Validate transition
      const validTransitions: Record<string, string[]> = {
        OPEN: ['RECEPTION', 'CANCELLED'],
        RECEPTION: ['INSPECTION', 'CANCELLED'],
        INSPECTION: ['ESTIMATION', 'CANCELLED'],
        ESTIMATION: ['APPROVAL_PENDING', 'CANCELLED'],
        APPROVAL_PENDING: ['WORK_IN_PROGRESS', 'CANCELLED'],
        WORK_IN_PROGRESS: ['QUALITY_CHECK', 'CANCELLED'],
        QUALITY_CHECK: ['READY_FOR_DELIVERY', 'CANCELLED'],
        READY_FOR_DELIVERY: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
        COMPLETED: ['DELIVERED', 'INVOICED'],
        DELIVERED: ['INVOICED'],
        CANCELLED: [],
        INVOICED: []
      };

      const allowedNext = validTransitions[existingJobCard.status] || [];
      // Block INVOICED transition via this endpoint entirely. Must use /convert endpoint.
      if (status === 'INVOICED') {
         return NextResponse.json({ error: `Cannot transition to INVOICED via this endpoint. Use /convert instead.` }, { status: 400 });
      }

      if (status !== existingJobCard.status && !allowedNext.includes(status)) {
         return NextResponse.json({ error: `Invalid transition from ${existingJobCard.status} to ${status}` }, { status: 400 });
      }

      dataToUpdate.status = status;
    }
    
    // Optional Workflow Updates
    if (approvedEstimate !== undefined) dataToUpdate.approvedEstimate = approvedEstimate;
    if (mechanicNotes !== undefined) dataToUpdate.mechanicNotes = mechanicNotes;
    if (odometerReading !== undefined) dataToUpdate.odometerReading = Number(odometerReading);
    if (inspectionDetails !== undefined) dataToUpdate.inspectionDetails = inspectionDetails;
    if (deliveryDetails !== undefined) dataToUpdate.deliveryDetails = deliveryDetails;
    if (approvalDetails !== undefined) dataToUpdate.approvalDetails = approvalDetails;

    // If status moves to COMPLETED or DELIVERED, record completedAt / deliveredAt 
    if (status === JobCardStatus.COMPLETED && !existingJobCard.completedAt) {
      dataToUpdate.completedAt = new Date();
    }
    if (status === JobCardStatus.DELIVERED && !existingJobCard.deliveredAt) {
      dataToUpdate.deliveredAt = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Atomic conditional update
      const jc = await tx.jobCard.updateMany({
        where: { 
          id: params.id, 
          tenantId,
          status: existingJobCard.status // Ensure it hasn't changed since we read it
        },
        data: dataToUpdate
      });

      if (jc.count === 0) {
        throw new Error("Job card status was modified by another request. Please try again.");
      }

      // We need the updated record
      const fullJc = await tx.jobCard.findFirst({
        where: { id: params.id },
        include: { items: true }
      });

      if (!fullJc) throw new Error("Job card not found after update");

      // Update vehicle's service history if DELIVERED
      if (status === JobCardStatus.DELIVERED) {
        await tx.customerVehicle.update({
          where: { id: existingJobCard.vehicleId },
          data: {
            lastServiceDate: new Date(),
            lastServiceKm: fullJc.odometerReading ?? existingJobCard.odometerReading ?? undefined,
          }
        });
      }

      // Capture Tax/Commercial Snapshot when estimate is ready for approval
      if (status === JobCardStatus.APPROVAL_PENDING && existingJobCard.status !== JobCardStatus.APPROVAL_PENDING) {
        const fullJc = await tx.jobCard.findFirst({
          where: { id: params.id },
          include: { items: true }
        });
        
        if (fullJc && fullJc.items) {
          for (const item of fullJc.items) {
            let snapshotGstRate = null;
            let snapshotHsnCode = null;
            if (item.productId) {
              const p = await tx.product.findUnique({ where: { id: item.productId } });
              if (p) {
                snapshotGstRate = p.gstRate;
                snapshotHsnCode = p.hsnCode;
              }
            } else if (item.itemType === "LABOUR") {
              const svc = await tx.labourService.findFirst({ where: { name: item.name, tenantId } });
              snapshotGstRate = svc ? svc.gstRate : 18.0;
              snapshotHsnCode = svc ? svc.sacCode : "998714";
            }

            await tx.jobCardItem.update({
              where: { id: item.id },
              data: { 
                gstRateSnapshot: snapshotGstRate,
                hsnCodeSnapshot: snapshotHsnCode
              }
            });
          }
        }
      }

      // Consume inventory when moving to WORK_IN_PROGRESS
      if (status === JobCardStatus.WORK_IN_PROGRESS && existingJobCard.status !== JobCardStatus.WORK_IN_PROGRESS) {
        const fullJc = await tx.jobCard.findFirst({
          where: { id: params.id },
          include: { items: true }
        });
        
        if (fullJc && fullJc.items) {
          for (const item of fullJc.items) {
            // Mark as consumed
            await tx.jobCardItem.update({
              where: { id: item.id },
              data: { isConsumed: item.itemType === "PART" ? true : item.isConsumed }
            });

            // Check explicit idempotency marker
            if (item.itemType === "PART" && item.productId && !item.isConsumed) {
              const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
              if (!product) throw new Error(`Product ${item.productId} not found`);

              // Atomic conditional decrement for product
              const updatedProductResult = await tx.product.updateMany({
                where: { 
                  id: item.productId,
                  tenantId,
                  currentStock: { gte: Number(item.quantity) }
                },
                data: { currentStock: { decrement: Number(item.quantity) } }
              });

              if (updatedProductResult.count === 0) {
                throw new Error(`Insufficient stock for ${product.name}`);
              }

              if (item.batchId) {
                const batch = await tx.batch.findFirst({ where: { id: item.batchId, tenantId, productId: item.productId } });
                if (!batch) {
                  throw new Error(`Requested batch ${item.batchId} not found for product ${product.name}`);
                }
                
                // Atomic conditional decrement for batch
                const updatedBatchResult = await tx.batch.updateMany({
                  where: { 
                    id: item.batchId,
                    tenantId,
                    currentStock: { gte: Number(item.quantity) }
                  },
                  data: { currentStock: { decrement: Number(item.quantity) } }
                });
                
                if (updatedBatchResult.count === 0) {
                  throw new Error(`Insufficient stock in batch ${batch.batchNumber}`);
                }
              }

              // Verify strict Sub-Ledger vs Main Ledger consistency (tenant scoped)
              // Read the updated product to check consistency
              const updatedProduct = await tx.product.findUnique({ where: { id: item.productId } });
              const allBatches = await tx.batch.findMany({ where: { tenantId, productId: item.productId } });
              if (allBatches.length > 0 && updatedProduct) {
                const sumOfBatches = allBatches.reduce((acc, b) => acc + Number(b.currentStock), 0);
                if (Math.abs(sumOfBatches - Number(updatedProduct.currentStock)) > 0.01) {
                   throw new Error(`Inventory corruption detected: Product ${product.name} total stock (${updatedProduct.currentStock}) does not match the sum of its batches (${sumOfBatches}).`);
                }
              }

              // Record consumption idempotently
              await tx.stockLog.create({
                data: {
                  tenantId,
                  productId: item.productId,
                  type: 'CONSUMPTION_OUT',
                  changeQty: -Number(item.quantity),
                  referenceId: fullJc.jobCardNumber,
                  idempotencyKey: `JC:${fullJc.jobCardNumber}:ITEM:${item.id}`,
                  note: `Consumed on Job Card approval`,
                }
              });
            }
          }
        }
      }

      return fullJc;
    });

    return NextResponse.json({ success: true, jobCard: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






