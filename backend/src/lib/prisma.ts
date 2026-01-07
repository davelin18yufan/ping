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
import type { Context, Next } from "hono"

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
 * Type definition for Hono context with Prisma
 *
 * Extend your Hono app context with this type to get full TypeScript support.
 *
 * @example
 * ```typescript
 * import type { ContextWithPrisma } from '@/lib/prisma';
 *
 * type AppContext = ContextWithPrisma & {
 *   Variables: {
 *     userId: string | null;
 *     // ... other context variables
 *   };
 * };
 *
 * const app = new Hono<AppContext>();
 * ```
 */
export type ContextWithPrisma = {
    Variables: {
        prisma: PrismaClient
    }
}

/**
 * Prisma middleware for Hono
 *
 * Injects Prisma client into Hono context, making it available in all route handlers.
 *
 * @param c - Hono context
 * @param next - Next middleware function
 *
 * @example
 * ```typescript
 * import { withPrisma } from '@/lib/prisma';
 *
 * // Apply globally to all routes
 * app.use('*', withPrisma);
 *
 * // Or apply to specific routes
 * app.get('/users', withPrisma, async (c) => {
 *   const prisma = c.get('prisma');
 *   const users = await prisma.user.findMany();
 *   return c.json({ users });
 * });
 * ```
 */
export function withPrisma(c: Context, next: Next) {
    if (!c.get("prisma")) {
        c.set("prisma", prisma)
    }
    return next()
}

/**
 * Graceful shutdown
 *
 * Disconnects Prisma client when the application terminates.
 */
process.on("beforeExit", async () => {
    await prisma.$disconnect()
})
