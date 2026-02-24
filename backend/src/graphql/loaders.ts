/**
 * GraphQL DataLoaders
 *
 * Prevents N+1 queries by batching database lookups within a single request.
 * Each request gets a fresh set of loaders (loaders are per-request, not global).
 *
 * Usage in resolvers:
 *   const user = await context.loaders.user.load(userId)
 *
 * All user.load() calls within the same event loop tick are batched into
 * a single SELECT ... WHERE id IN (...) query.
 */

import DataLoader from "dataloader"
import type { PrismaClient } from "@generated/prisma/client"

// ---------------------------------------------------------------------------
// User Loader
// ---------------------------------------------------------------------------

type UserRecord = {
    id: string
    email: string
    emailVerified: string | null
    name: string | null
    image: string | null
    createdAt: string
    updatedAt: string
}

/**
 * Create a DataLoader that batches User lookups by ID.
 *
 * Given N calls to loader.load(userId) in the same tick, this fires
 * one single SELECT * FROM "User" WHERE id IN (...).
 */
function createUserLoader(prisma: PrismaClient): DataLoader<string, UserRecord | null> {
    return new DataLoader<string, UserRecord | null>(
        async (ids) => {
            const users = await prisma.user.findMany({
                where: { id: { in: ids as string[] } },
                select: {
                    id: true,
                    email: true,
                    emailVerified: true,
                    name: true,
                    image: true,
                    createdAt: true,
                    updatedAt: true,
                },
            })

            // Build a map for O(1) lookup and preserve order
            const userMap = new Map(users.map((u) => [u.id, u]))

            // Return serialized records in the same order as ids
            return ids.map((id) => {
                const u = userMap.get(id)
                if (!u) return null
                return {
                    ...u,
                    emailVerified: u.emailVerified ? u.emailVerified.toISOString() : null,
                    createdAt: u.createdAt.toISOString(),
                    updatedAt: u.updatedAt.toISOString(),
                }
            })
        },
        {
            // Cache within the same request (default: true)
            cache: true,
        }
    )
}

// ---------------------------------------------------------------------------
// Loaders factory
// ---------------------------------------------------------------------------

export type GraphQLLoaders = {
    user: DataLoader<string, UserRecord | null>
}

/**
 * Create a fresh set of DataLoaders for each GraphQL request.
 * Must be called once per request in the context builder.
 */
export function createLoaders(prisma: PrismaClient): GraphQLLoaders {
    return {
        user: createUserLoader(prisma),
    }
}
