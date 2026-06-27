/**
 * Prisma Client Singleton
 *
 * Uses the globalThis pattern to prevent instantiating too many PrismaClient
 * instances during Next.js hot-reloading in development mode. In production,
 * a single instance is created and reused across all requests.
 *
 * @module lib/prisma
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Shared PrismaClient instance. Reused across hot-reloads in dev mode.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
