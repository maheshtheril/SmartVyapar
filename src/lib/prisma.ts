import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Standard robust transaction options for Neon Serverless PostgreSQL.
 * Overrides Prisma's 5-second default timeout to prevent closed transaction errors.
 */
export const DEFAULT_TX_OPTIONS = {
  maxWait: 10000, // 10s wait for connection
  timeout: 30000, // 30s timeout for complex operations
} as const;
