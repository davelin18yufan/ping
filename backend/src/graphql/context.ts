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
 * Provides:
 * - userId: Current authenticated user ID (null if not authenticated)
 * - sessionId: Current session ID (null if not authenticated)
 * - isAuthenticated: Boolean flag for authentication status
 * - prisma: Prisma client for database operations
 * - loaders: Per-request DataLoaders for N+1 prevention
 */
export interface GraphQLContext {
    /**
     * Current authenticated user ID
     * Null if user is not authenticated
     */
    userId: string | null

    /**
     * Current session ID (the session from the incoming cookie)
     * Used by session management resolvers to determine which session is "current"
     * Null if user is not authenticated
     */
    sessionId: string | null

    /**
     * Authentication status flag
     * True if user has valid session
     */
    isAuthenticated: boolean

    /**
     * Prisma client for database operations
     * Injected from Hono context via withPrisma middleware
     */
    prisma: PrismaClient

    /**
     * Per-request DataLoaders for batching and caching database lookups.
     * Prevents N+1 queries in type-level field resolvers.
     */
    loaders: GraphQLLoaders
}

/**
 * Build GraphQL context from request
 *
 * Extracts authentication data attached to the request object.
 * The Hono sessionMiddleware attaches _userId and _isAuthenticated
 * to the request before passing it to GraphQL Yoga.
 *
 * @param yogaContext - GraphQL Yoga initial context (contains request)
 * @returns GraphQL context with auth, Prisma, and DataLoaders
 */
export function buildGraphQLContext(yogaContext: YogaInitialContext): GraphQLContext {
    const request = yogaContext.request as Request & {
        _userId?: string | null
        _sessionId?: string | null
        _isAuthenticated?: boolean
        _prisma?: PrismaClient
    }

    const prisma = request._prisma! // oxlint-disable-line typescript/no-non-null-assertion

    return {
        userId: request._userId ?? null,
        sessionId: request._sessionId ?? null,
        isAuthenticated: request._isAuthenticated ?? false,
        prisma,
        loaders: createLoaders(prisma),
    }
}
