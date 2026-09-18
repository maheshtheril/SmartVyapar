import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

export interface FormattedError {
  field: string;
  message: string;
}

export function formatZodErrors(error: ZodError): FormattedError[] {
  return error.issues.map((e) => ({
    field: e.path.length > 0 ? e.path.join(".") : "body",
    message: e.message,
  }));
}

/**
 * Validates request payload against a Zod schema.
 * If valid: returns `{ success: true, data: T }`.
 * If invalid: returns `{ success: false, response: NextResponse }` with HTTP 400 and structured error details.
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = formatZodErrors(result.error);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Validation failed",
          message: details.map((d) => `${d.field}: ${d.message}`).join("; "),
          details,
        },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
