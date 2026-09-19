import { z } from "zod";

export const CreateWarehouseSchema = z.object({
  name: z.string().trim().min(2, "Warehouse name must be at least 2 characters").max(100),
  code: z
    .string()
    .trim()
    .min(2, "Warehouse code must be at least 2 characters")
    .max(20)
    .regex(/^[A-Za-z0-9_\-]+$/, "Code must contain only letters, numbers, hyphens, and underscores"),
  address: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(50).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;

export const TransferItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().positive("Transfer quantity must be greater than zero"),
  unit: z.string().optional().default("PCS"),
});

export const CreateStockTransferSchema = z
  .object({
    fromWarehouseId: z.string().min(1, "Source warehouse is required"),
    toWarehouseId: z.string().min(1, "Destination warehouse is required"),
    vehicleNo: z.string().trim().max(30).optional().nullable(),
    driverName: z.string().trim().max(50).optional().nullable(),
    notes: z.string().trim().max(300).optional().nullable(),
    items: z.array(TransferItemSchema).min(1, "At least one item must be transferred"),
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: "Source and destination warehouses must be different",
    path: ["toWarehouseId"],
  });

export type CreateStockTransferInput = z.infer<typeof CreateStockTransferSchema>;
