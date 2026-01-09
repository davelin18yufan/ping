/**
 * Prisma Client with Middleware Pattern
 *
 * Follows Prisma's official Hono integration guide.
 * Provides type-safe Prisma client access via Hono context.
 *
 * @see https://www.prisma.io/docs/guides/hono
 */

import { PrismaClient } from "@generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

/**
 * Singleton Prisma instance
 *
 * Initialized once and reused across all requests for optimal performance.
 */
const adapter = new PrismaPg({
    // oxlint-disable-next-line typescript/no-non-null-assertion
    connectionString: process.env.DATABASE_URL!,
})

export const prisma = new PrismaClient({ adapter })

/**
 * Graceful shutdown(This might not be necessary)
 *
 * Disconnects Prisma client when the application terminates.
 */
process.on("beforeExit", async () => {
    await prisma.$disconnect()
})
