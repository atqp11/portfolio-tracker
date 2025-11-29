/**
 * This module provides a singleton instance of the PrismaClient to interact with the database.
 *
 * The singleton pattern ensures that only one instance of PrismaClient is created during the application's lifecycle,
 * which is especially important in development environments to prevent multiple connections to the database.
 *
 * For more information, see: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 *
 * Usage Notes:
 * - This module provides a singleton instance of the PrismaClient for database interactions.
 * - The `prisma` instance is used extensively across the codebase, including:
 *   - `lib/db_old.ts` for legacy database operations.
 *   - `server/repositories` for repository patterns.
 *   - `scripts/check-cost-basis.ts` for script-based database tasks.
 * - Referenced in `docs/TECHNICAL_ARCHITECTURE_OVERVIEW.md` as the central Prisma Client.
 * - Environment-Specific Behavior:
 *   - Development: Uses a global instance to prevent multiple connections during hot-reloading.
 *   - Production: Creates a new instance for each application lifecycle.
 */


import { PrismaClient } from '@prisma/client';

/**
 * A global object to store the PrismaClient instance in development mode.
 * This prevents multiple instances of PrismaClient from being created during hot-reloading in development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * The PrismaClient instance used to interact with the database.
 *
 * - In development mode, the instance is stored globally to avoid creating multiple instances during hot-reloading.
 * - In production mode, a new instance is created.
 *
 * Logging:
 * - In development, logs queries, errors, and warnings.
 * - In production, logs only errors.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

