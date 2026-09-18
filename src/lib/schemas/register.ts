import { z } from "zod";
import { indianPhoneSchema, gstinSchema, stateCodeSchema } from "./common";

export const INDIAN_STATES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

/**
 * Extracts 2-digit state code and name from a GSTIN.
 */
export function getStateFromGstin(gstin?: string | null): {
  stateCode: string;
  stateName: string;
} | null {
  if (!gstin || gstin.trim().length < 2) return null;
  const code = gstin.trim().slice(0, 2);
  const name = INDIAN_STATES[code];
  if (name) {
    return { stateCode: code, stateName: name };
  }
  return null;
}

/**
 * Converts a business name into a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export const RegisterTenantSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters"),
  ownerName: z
    .string()
    .trim()
    .min(2, "Owner name must be at least 2 characters"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase()),
  phone: indianPhoneSchema,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long"),
  gstin: gstinSchema,
  stateCode: stateCodeSchema.default("32"),
  stateName: z.string().optional().default("Kerala"),
  upiId: z
    .string()
    .trim()
    .min(3, "UPI ID is required for dynamic QR payments")
    .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, "Must be a valid UPI VPA format (e.g. shop@okaxis)"),
  address: z.string().trim().optional().nullable(),
  isComposition: z.boolean().default(false),
});

export type RegisterTenantInput = z.infer<typeof RegisterTenantSchema>;
