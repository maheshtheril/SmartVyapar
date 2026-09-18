import { z } from "zod";

/**
 * Validates and cleans Indian motor vehicle registration numbers.
 * Supports standard format (e.g. KL07AB1234, DL1C1234, MH041234) and Bharat Series (e.g. 22BH1234AA).
 */
export const indianVehicleNoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((val) => val.replace(/[\s\-_]/g, "")) // Remove spaces, dashes
  .refine(
    (val) =>
      /^[A-Z]{2}\d{1,2}(?:[A-Z]{1,3})?\d{1,4}$/.test(val) ||
      /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(val),
    {
      message:
        "Invalid Indian vehicle registration number (e.g. KL07AB1234, MH12DE5678, or 22BH1234AA)",
    }
  );

export const EWayBillTransportSchema = z.object({
  transDistance: z
    .number()
    .int("Distance must be a whole number of KM")
    .min(1, "Transport distance must be at least 1 KM")
    .max(4000, "Transport distance cannot exceed statutory limit of 4000 KM"),
  transMode: z.enum(["1", "2", "3", "4"]).default("1"), // 1: Road, 2: Rail, 3: Air, 4: Ship
  transporterId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/,
      "Transporter ID must be a valid 15-character GSTIN/TRANSIN"
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  transporterName: z.string().trim().max(100).optional().nullable().or(z.literal("")),
  transDocNo: z.string().trim().max(30).optional().nullable().or(z.literal("")),
  transDocDate: z.string().trim().optional().nullable().or(z.literal("")),
  vehicleNo: z.string().trim().optional().nullable().or(z.literal("")),
  vehicleType: z.enum(["R", "O"]).default("R"), // R: Regular, O: Over Dimensional Cargo
  ewayBillNo: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "E-Way Bill Number must be exactly 12 digits")
    .optional()
    .nullable()
    .or(z.literal("")),
}).refine(
  (data) => {
    // If transport mode is Road ("1"), vehicleNo is required
    if (data.transMode === "1" && !data.vehicleNo) {
      return false;
    }
    return true;
  },
  {
    message: "Vehicle number is required for Road transport (Mode 1)",
    path: ["vehicleNo"],
  }
);

export type EWayBillTransportInput = z.infer<typeof EWayBillTransportSchema>;
