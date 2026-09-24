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

/**
 * Retries a transaction block automatically on optimistic concurrency control (OCC) failures.
 * This is crucial for multi-tenant serverless environments handling simultaneous writes.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      // Check if it's our explicit concurrency error or a Prisma serialization failure
      const isConcurrencyError = 
        error.message?.includes("Concurrency error") ||
        error.code === "P2034" || // Prisma transaction conflict
        error.code === "P2025";   // Prisma record not found (often OCC mismatch)

      if (!isConcurrencyError || attempt >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 50;
      console.warn(`Concurrency conflict detected. Retrying transaction (attempt ${attempt}/${maxRetries}) in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
