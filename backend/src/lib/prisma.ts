/**
 * Prisma Client Instance
 *
 * Factory function pattern to ensure proper singleton management
 * and test isolation.
 */

import { PrismaClient } from "@generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Module-level singleton instance
 * Managed via getPrisma() factory function
 */
let prismaInstance: PrismaClient | undefined;

/**
 * Create new Prisma Client instance with PostgreSQL adapter
 *
 * @returns New PrismaClient instance
 * @throws Error if DATABASE_URL is not defined
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined");
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  return new PrismaClient({
    adapter,
  });
}

/**
 * Get or create Prisma Client singleton instance
 *
 * Factory function that manages singleton instance creation.
 * Safe for production and development (hot reload).
 *
 * @returns PrismaClient singleton instance
 *
 * @example
 * ```typescript
 * import { getPrisma } from '@/lib/prisma';
 *
 * const prisma = getPrisma();
 * const users = await prisma.user.findMany();
 * ```
 */
export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }
  return prismaInstance;
}

/**
 * Reset Prisma Client instance
 *
 * Disconnects current instance and clears singleton.
 * **Only use in tests for test isolation.**
 *
 * @example
 * ```typescript
 * import { resetPrisma } from '@/lib/prisma';
 *
 * afterEach(async () => {
 *   await resetPrisma();
 * });
 * ```
 */
export async function resetPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = undefined;
  }
}

/**
 * Graceful shutdown - disconnect Prisma on app termination
 */
process.on("beforeExit", async () => {
  await resetPrisma();
});
