/**
 * Prisma Test Fixtures
 *
 * Provides isolated Prisma Client instances for testing.
 * Ensures test isolation by using separate instances and cleanup.
 */

import { PrismaClient } from "@generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

/**
 * Create test Prisma Client instance
 *
 * Creates a new Prisma Client instance for testing, using
 * TEST_DATABASE_URL if available, otherwise DATABASE_URL.
 *
 * @returns New PrismaClient instance for testing
 * @throws Error if no database URL is configured
 *
 * @example
 * ```typescript
 * import { createTestPrismaClient } from '@/tests/fixtures/prisma';
 *
 * const testPrisma = createTestPrismaClient();
 * // Use in tests...
 * await cleanupTestPrisma(testPrisma);
 * ```
 */
export function createTestPrismaClient(): PrismaClient {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

    if (!testDatabaseUrl) {
        throw new Error("TEST_DATABASE_URL or DATABASE_URL environment variable is not configured")
    }

    const adapter = new PrismaPg({
        connectionString: testDatabaseUrl,
    })

    return new PrismaClient({
        adapter,
    })
}

/**
 * Cleanup test Prisma Client
 *
 * Cleans up test data and disconnects Prisma Client.
 * **Should be called in afterEach() or afterAll().**
 *
 * Cleanup order (foreign key constraints):
 * 1. Session (depends on User)
 * 2. Account (depends on User)
 * 3. Verification (depends on User)
 * 4. User (root table)
 *
 * @param prisma - Test PrismaClient instance to cleanup
 *
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await cleanupTestPrisma(testPrisma);
 * });
 * ```
 */
export async function cleanupTestPrisma(prisma: PrismaClient): Promise<void> {
    try {
        // Delete in order respecting foreign key constraints
        await prisma.session.deleteMany()
        await prisma.account.deleteMany()
        await prisma.verification.deleteMany()
        await prisma.user.deleteMany()

        // Disconnect Prisma Client
        await prisma.$disconnect()
    } catch (error) {
        console.error("Error during test cleanup:", error)
        // Always try to disconnect even if cleanup fails
        await prisma.$disconnect()
        throw error
    }
}
