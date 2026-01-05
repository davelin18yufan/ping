/**
 * Authentication Middleware
 *
 * Provides session verification and user context injection for:
 * - GraphQL resolvers
 * - Protected API routes
 * - WebSocket connections
 */

import type { Context, Next } from "hono";
import { verifySession } from "./lib/auth";

/**
 * Extended Hono context with user authentication
 */
export interface AuthContext {
  userId: string | null;
  isAuthenticated: boolean;
}

/**
 * Session verification middleware
 *
 * Verifies the Better Auth session from cookie and injects
 * userId into Hono context for downstream use.
 *
 * Usage:
 * ```typescript
 * app.use('/graphql', sessionMiddleware);
 * app.use('/api/protected/*', sessionMiddleware);
 * ```
 */
export async function sessionMiddleware(c: Context, next: Next) {
  try {
    // Verify session from request cookies
    const userId = await verifySession(c.req.raw);

    // Inject auth context into Hono context
    c.set("userId", userId);
    c.set("isAuthenticated", userId !== null);

    await next();
  } catch (error) {
    console.error("Session middleware error:", error);

    // Set unauthenticated context on error
    c.set("userId", null);
    c.set("isAuthenticated", false);

    await next();
  }
}

/**
 * Require authentication middleware
 *
 * Blocks unauthenticated requests with 401 Unauthorized.
 * Must be used AFTER sessionMiddleware.
 *
 * Usage:
 * ```typescript
 * app.use('/api/protected/*', sessionMiddleware, requireAuth);
 * ```
 */
export async function requireAuth(c: Context, next: Next) {
  const isAuthenticated = c.get("isAuthenticated");

  if (!isAuthenticated) {
    return c.json(
      {
        error: "Unauthorized",
        message: "You must be logged in to access this resource",
      },
      401,
    );
  }

  await next();
}

/**
 * Get authenticated user ID from context
 *
 * Helper function for use in route handlers and resolvers.
 *
 * @param c - Hono context
 * @returns User ID if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * const userId = getAuthUserId(c);
 * if (!userId) {
 *   return c.json({ error: "Unauthorized" }, 401);
 * }
 * ```
 */
export function getAuthUserId(c: Context): string | null {
  return c.get("userId") ?? null;
}

/**
 * Require authenticated user ID
 *
 * Throws error if user is not authenticated.
 * Use in route handlers when authentication is required.
 *
 * @param c - Hono context
 * @returns User ID (guaranteed to be non-null)
 * @throws Error if user is not authenticated
 *
 * @example
 * ```typescript
 * const userId = requireAuthUserId(c);
 * // userId is guaranteed to be string here
 * ```
 */
export function requireAuthUserId(c: Context): string {
  const userId = c.get("userId");

  if (!userId) {
    throw new Error("User not authenticated");
  }

  return userId;
}
