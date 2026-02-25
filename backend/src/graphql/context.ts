/**
 * GraphQL Context Builder
 *
 * Defines the context available to all GraphQL resolvers.
 * Extracts authentication and Prisma client from Hono context.
 * Creates per-request DataLoaders to prevent N+1 queries.
 */

import type { PrismaClient } from "@generated/prisma/client"
import type { YogaInitialContext } from "graphql-yoga"
import { createLoaders, type GraphQLLoaders } from "./loaders"

/**
 * GraphQL Context Interface
 *
 * Available in all resolvers via the `context` parameter.
 *
 * Authentication fields:
 *  - userId:    Current user's ID. Null when unauthenticated.
 *               Use `requireAuth(context)` (from resolvers/utils.ts) to guard
 *               resolvers — it throws UNAUTHENTICATED if userId is null.
 *
 *  - sessionId: The session token from the incoming cookie.
 *               Distinct from userId: used by the sessions resolver to mark
 *               which session is "current" so it can warn before self-revoke.
 *               Null when unauthenticated.
 *
 * Note: There is no `isAuthenticated` field — it would be redundant with
 * `userId !== null`. Use `userId` (or `requireAuth`) directly.
 */
export interface GraphQLContext {
    /**
     * Current authenticated user ID.
     * Null if the request carries no valid session.
     */
    userId: string | null

    /**
     * Current session ID (the session from the incoming cookie).
     * Used by session management resolvers to determine which session is
     * "current" so users can identify their own active device.
     * Null if the request carries no valid session.
     */
    sessionId: string | null

    /**
     * Prisma client for database operations.
     * Injected from Hono context via withPrisma middleware.
     */
    prisma: PrismaClient

    /**
     * Per-request DataLoaders for batching and caching database lookups.
     * Prevents N+1 queries in type-level field resolvers.
     *
     * Note: friendshipStatus loader is viewer-dependent — it uses the current
     * userId to check friendship status. It must not be shared across requests.
     */
    loaders: GraphQLLoaders
}

/**
 * Build GraphQL context from request
 *
 * Extracts authentication data attached to the request object.
 * The Hono sessionMiddleware attaches _userId and _sessionId
 * to the request before passing it to GraphQL Yoga.
 *
 * @param yogaContext - GraphQL Yoga initial context (contains request)
 * @returns GraphQL context with auth, Prisma, and DataLoaders
 */
export function buildGraphQLContext(yogaContext: YogaInitialContext): GraphQLContext {
    const request = yogaContext.request as Request & {
        _userId?: string | null
        _sessionId?: string | null
        _prisma?: PrismaClient
    }

    const prisma = request._prisma! // oxlint-disable-line typescript/no-non-null-assertion
    const userId = request._userId ?? null

    return {
        userId,
        sessionId: request._sessionId ?? null,
        prisma,
        // Pass viewerUserId so friendshipStatus loader can compute isFriend correctly
        loaders: createLoaders(prisma, userId),
    }
}
