import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "sv_token";
const TOKEN_EXPIRY = "8h";

export interface SessionPayload extends JWTPayload {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  name: string;
  role: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

/** Sign a JWT and return it as a string */
export async function signToken(payload: Omit<SessionPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret());
}

/** Verify a JWT string. Returns the payload or null if invalid/expired. */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Read & verify the session cookie from a NextRequest.
 * Returns the session payload, or null if missing / invalid.
 */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export class AuthError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Use inside API route handlers to enforce role-based access control (RBAC).
 * Throws AuthError if unauthenticated, or ForbiddenError if role is not permitted.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<SessionPayload> {
  const session = await requireSession(req);
  if (session.role !== 'OWNER' && !allowedRoles.includes(session.role)) {
    throw new ForbiddenError(
      `Forbidden: Role '${session.role}' is not authorized to perform this operation`
    );
  }
  return session;
}

/**
 * Use inside API route handlers.
 * Returns the session payload, or throws an AuthError.
 * Reads from verified JWT cookie.
 */
export async function requireSession(req: NextRequest): Promise<SessionPayload> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    throw new AuthError("Unauthorized");
  }
  return session;
}

/** Build a Set-Cookie response header value for the session token */
export function buildSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${8 * 60 * 60}${secure}`;
}

/** Build a Set-Cookie header that clears the session */
export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}
