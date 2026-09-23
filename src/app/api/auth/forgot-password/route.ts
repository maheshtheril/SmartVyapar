import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken, RESET_TOKEN_EXPIRY_MINUTES } from "@/lib/password-reset";
import { sendEmail, buildPasswordResetEmailHtml } from "@/lib/mail";
import { checkRateLimit } from "@/lib/rate-limiter";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown-ip";

    // Rate limit: 5 requests per 15 minutes per IP
    const rateLimit = checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many password reset requests. Please try again after 15 minutes.",
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
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const result = await createPasswordResetToken(email);

    let devResetUrl: string | undefined;

    if (result.found && result.token && result.user) {
      // Determine origin from request
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3005";
      const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      const resetUrl = `${proto}://${host}/reset-password?token=${result.token}`;

      devResetUrl = resetUrl;

      const html = buildPasswordResetEmailHtml({
        userName: result.user.name,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES,
      });

      const text = `Hello ${result.user.name},\n\nYou requested a password reset for Ziona POS.\nReset your password here: ${resetUrl}\n\nThis link is valid for ${RESET_TOKEN_EXPIRY_MINUTES} minutes.\nIf you did not request this, please ignore this email.`;

      // Dispatch email asynchronously
      await sendEmail({
        to: email,
        subject: "Reset your Ziona POS password",
        html,
        text,
      });
    }

    // Always respond with a uniform success response to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If an account is associated with this email address, you will receive a password reset link shortly.",
      // In local development, provide the link directly in the payload for friction-free developer experience
      ...(process.env.NODE_ENV !== "production" && devResetUrl ? { devResetUrl } : {}),
    });
  } catch (error) {
    console.error("[ForgotPassword] Error handling reset request:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
