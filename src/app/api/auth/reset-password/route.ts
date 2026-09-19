import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyResetToken, consumeResetToken } from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limiter";

const ResetPasswordSchema = z
  .object({
    token: z.string().min(32, "Invalid token format."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/**
 * Validates whether a given reset token is still active and valid
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, error: "Missing reset token." }, { status: 400 });
    }

    const verification = await verifyResetToken(token);
    if (!verification.valid) {
      return NextResponse.json({ valid: false, error: verification.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      user: {
        name: verification.user?.name,
        email: verification.user?.email,
      },
    });
  } catch (error) {
    console.error("[ResetPassword] GET verification error:", error);
    return NextResponse.json({ valid: false, error: "Internal server error." }, { status: 500 });
  }
}

/**
 * Consumes the token and sets the new user password
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown-ip";

    // Rate limit: 10 reset attempts per 15 minutes per IP
    const rateLimit = checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many password reset attempts. Please try again after 15 minutes.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    const body = await req.json();
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    await consumeResetToken(token, password);

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully updated. You can now sign in with your new credentials.",
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to reset password.";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
