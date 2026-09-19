import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Paths that never require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/health",
  "/register",
  "/api/auth/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/contact",
  "/pricing",
  "/api/whatsapp/webhook",
  "/api/admin/backup",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths through unconditionally
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    // API routes return 401 JSON; page routes redirect to /login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward tenant context as request headers so API routes don't need a DB lookup
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-id", session.tenantId);
  requestHeaders.set("x-tenant-slug", session.tenantSlug);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-user-name", session.name);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
