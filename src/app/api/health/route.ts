import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // Lightweight database connectivity check
    await prisma.$queryRaw`SELECT 1 as ping`;
    const dbLatencyMs = Date.now() - startTime;

    const authHeader = request.headers.get("authorization");
    const isInternal = authHeader === `Bearer ${process.env.CRON_SECRET || process.env.JWT_SECRET}`;

    let payload: any = {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };

    if (isInternal) {
      const memory = process.memoryUsage();
      payload = {
        ...payload,
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: "connected",
          latencyMs: dbLatencyMs,
        },
        memory: {
          heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        },
        environment: process.env.NODE_ENV || "development",
      };
    }

    return NextResponse.json(
      payload,
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    const dbLatencyMs = Date.now() - startTime;
    console.error("Health check failure:", error);

    const authHeader = request.headers.get("authorization");
    const isInternal = authHeader === `Bearer ${process.env.CRON_SECRET || process.env.JWT_SECRET}`;

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        ...(isInternal && {
          database: {
            status: "disconnected",
            latencyMs: dbLatencyMs,
            error: error.message || "Database connection error",
          },
        }),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
