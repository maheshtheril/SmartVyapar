import { z } from "zod";

// Indian 10-digit mobile number (accepts all 10-digit formats for testing & production)
export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/\D/g, "")) // strip spaces, hyphens, +91 prefix
  .transform((val) => (val.startsWith("91") && val.length === 12 ? val.slice(2) : val))
  .refine((val) => /^\d{10}$/.test(val), {
    message: "Must be a valid 10-digit mobile number",
  });

// Indian 15-character GSTIN format: e.g. "32AAAAA0000A1Z5"
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Invalid GSTIN format (must be 15-character alphanumeric format: 2-digit state + 10-char PAN + entity code + Z + checksum)"
  )
  .optional()
  .nullable()
  .or(z.literal(""));

// 2-digit Indian GST State Code (e.g. "32" for Kerala, "27" for Maharashtra)
export const stateCodeSchema = z
  .string()
  .trim()
  .regex(/^[0-3][0-9]|97|99$/, "Must be a valid 2-digit Indian GST state/UT code");

// Common HSN/SAC Code
export const hsnCodeSchema = z
  .string()
  .trim()
  .min(2, "HSN code too short")
  .max(8, "HSN code too long")
  .default("9983");
