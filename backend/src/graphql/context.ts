/**
 * GraphQL Context Builder
 *
 * Defines the context available to all GraphQL resolvers.
 * Extracts authentication and Prisma client from Hono context.
 */

import type { PrismaClient } from "@generated/prisma/client";
import type { YogaInitialContext } from "graphql-yoga";

/**
 * GraphQL Context Interface
 *
 * Available in all resolvers via the `context` parameter.
 * Provides:
 * - userId: Current authenticated user ID (null if not authenticated)
 * - isAuthenticated: Boolean flag for authentication status
 * - prisma: Prisma client for database operations
 */
export interface GraphQLContext {
  /**
   * Current authenticated user ID
   * Null if user is not authenticated
   */
  userId: string | null;

  /**
   * Authentication status flag
   * True if user has valid session
   */
  isAuthenticated: boolean;

  /**
   * Prisma client for database operations
   * Injected from Hono context via withPrisma middleware
   */
  prisma: PrismaClient;
}

/**
 * Build GraphQL context from request
 *
 * Extracts authentication data attached to the request object.
 * The Hono sessionMiddleware attaches _userId and _isAuthenticated
 * to the request before passing it to GraphQL Yoga.
 *
 * @param yogaContext - GraphQL Yoga initial context (contains request)
 * @returns GraphQL context with auth and Prisma
 */
export function buildGraphQLContext(
  yogaContext: YogaInitialContext,
): GraphQLContext {
  const request = yogaContext.request as Request & {
    _userId?: string | null;
    _isAuthenticated?: boolean;
    _prisma?: PrismaClient;
  };

  return {
    userId: request._userId ?? null,
    isAuthenticated: request._isAuthenticated ?? false,
    prisma: request._prisma!,
  };
}
