import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export const RESET_TOKEN_EXPIRY_MINUTES = 15;

export interface TokenVerificationResult {
  valid: boolean;
  error?: string;
  user?: {
    id: string;
    name: string;
    email: string | null;
    tenantId: string;
  };
}

/**
 * Creates a cryptographically secure, single-use password reset token
 */
export async function createPasswordResetToken(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
      isActive: true,
    },
    include: {
      tenant: true,
    },
  });

  if (!user) {
    return { found: false as const, user: null, token: null };
  }

  // Invalidate any existing unused reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Generate a high-entropy 64-character hex token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return {
    found: true as const,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantName: user.tenant.businessName,
    },
  };
}

/**
 * Verifies if a reset token is valid, unused, and within the 15-minute expiration window
 */
export async function verifyResetToken(token: string): Promise<TokenVerificationResult> {
  if (!token || typeof token !== "string" || token.length < 32) {
    return { valid: false, error: "Invalid reset token format." };
  }

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tenantId: true,
            isActive: true,
          },
        },
      },
    });

    if (!record) {
      return { valid: false, error: "Reset link is invalid or has expired." };
    }

    if (record.usedAt) {
      return {
        valid: false,
        error: "This reset link has already been used. Please request a new one.",
      };
    }

    if (new Date() > record.expiresAt) {
      return {
        valid: false,
        error: "This reset link has expired. Reset links are valid for 15 minutes.",
      };
    }

    if (!record.user.isActive) {
      return {
        valid: false,
        error: "This user account has been deactivated. Please contact your administrator.",
      };
    }

    return {
      valid: true,
      user: {
        id: record.user.id,
        name: record.user.name,
        email: record.user.email,
        tenantId: record.user.tenantId,
      },
    };
  } catch (err) {
    console.error("[verifyResetToken] DB error:", err);
    return {
      valid: false,
      error: "Unable to verify reset link at this moment. Please try again.",
    };
  }
}

/**
 * Consumes a token and atomically updates the user's password hash
 */
export async function consumeResetToken(token: string, newPassword: string) {
  const verification = await verifyResetToken(token);
  if (!verification.valid || !verification.user) {
    throw new Error(verification.error || "Invalid or expired token.");
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const user = verification.user;
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Execute password update and token consumption in an atomic transaction
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  });

  // Record audit log for security & MCA compliance
  try {
    await recordAuditLog({
      tenantId: user.tenantId,
      userId: user.id,
      userName: user.name,
      entityType: "User",
      entityId: user.id,
      action: "UPDATE",
      details: {
        event: "PASSWORD_RESET",
        targetEmail: user.email,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[AuditLog] Failed to record password reset:", err);
  }

  return { success: true, email: user.email };
}
