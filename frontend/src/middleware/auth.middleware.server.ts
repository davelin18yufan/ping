/**
 * TanStack Start Server-Side Authentication Guards
 *
 * This module provides server-side authentication guards using Better Auth
 * and TanStack Start's server functions.
 *
 * Key Features:
 * - Server-side session validation (no client-side hydration issues)
 * - Uses Better Auth's auth.api.getSession() with request headers
 * - Type-safe session data returned to routes
 * - Can be used in beforeLoad for route protection
 *
 * Architecture:
 * - Server-side guards (this file): Uses auth.api.getSession() + getWebHeaders()
 * - Client-side auth (auth-client.ts): Uses client SDK for signIn/signOut
 *
 * @see https://www.better-auth.com/docs/integrations/tanstack
 * @see https://tanstack.com/router/latest/docs/framework/react/guide/authentication
 */

import { redirect } from "@tanstack/react-router"

import { auth, type AuthSession } from "@/lib/auth"

/**
 * Get request headers in a universal way
 * Works in both server and client contexts
 */
function getWebHeaders(): HeadersInit {
    if (typeof window === "undefined") {
        // Server-side: import dynamically to avoid bundling in client
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { getRequestHeaders } = require("@tanstack/react-start/server")
            return getRequestHeaders()
        } catch {
            return new Headers()
        }
    }

    // Client-side: use empty headers (Better Auth client will use cookies)
    return new Headers()
}

/**
 * Session data type for authenticated routes
 */
interface RequireAuthContext {
    session: NonNullable<AuthSession>
}

/**
 * Optional session context for public routes
 */
interface OptionalAuthContext {
    session: AuthSession | null
}

/**
 * Server-side guard: Require authentication
 *
 * This function runs on the server (when used in beforeLoad).
 * - Retrieves session using Better Auth's server API
 * - Redirects to /auth if session is invalid
 * - Returns session data to route context
 *
 * Usage:
 * ```typescript
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: requireAuthServer,
 *   component: DashboardPage,
 * })
 *
 * function DashboardPage() {
 *   const { session } = Route.useRouteContext()
 *   // session.user is guaranteed to exist
 * }
 * ```
 *
 * @returns Session data if authenticated
 * @throws Redirect to /auth if not authenticated
 */
export async function requireAuthServer(): Promise<RequireAuthContext> {
    // Get request headers (contains cookies)
    const headers = getWebHeaders()

    // Validate session server-side using Better Auth API
    const session = await auth.api.getSession({ headers })

    // Redirect to login if no valid session
    if (!session?.user) {
        // Get current pathname for post-login redirect
        const currentPath = globalThis.location?.pathname || "/"

        throw redirect({
            to: "/auth",
            search: {
                redirect: currentPath,
            },
        })
    }

    // Return session data
    return { session }
}

/**
 * Server-side guard: Require guest (not authenticated)
 *
 * This function ensures only unauthenticated users can access the route.
 * - Redirects authenticated users to home page
 * - Used for login/signup pages to prevent duplicate login
 *
 * Usage:
 * ```typescript
 * export const Route = createFileRoute('/auth/')({
 *   beforeLoad: requireGuestServer,
 *   component: LoginPage,
 * })
 * ```
 *
 * @throws Redirect to / if already authenticated
 */
export async function requireGuestServer(): Promise<void> {
    // Get request headers (contains cookies)
    const headers = getWebHeaders()

    // Check if user is already logged in
    const session = await auth.api.getSession({ headers })

    // Redirect authenticated users to home
    if (session?.user) {
        throw redirect({
            to: "/",
        })
    }
}

/**
 * Server-side guard: Optional authentication
 *
 * This function fetches session data without enforcing authentication.
 * - Works for both authenticated and guest users
 * - Returns session data (or null) to route context
 * - No redirects occur
 *
 * Usage:
 * ```typescript
 * export const Route = createFileRoute('/')({
 *   beforeLoad: optionalAuthServer,
 *   component: HomePage,
 * })
 *
 * function HomePage() {
 *   const { session } = Route.useRouteContext()
 *
 *   if (session?.user) {
 *     return <AuthenticatedView user={session.user} />
 *   }
 *
 *   return <GuestView />
 * }
 * ```
 *
 * @returns Session data (or null)
 */
export async function optionalAuthServer(): Promise<OptionalAuthContext> {
    // Get request headers (contains cookies)
    const headers = getWebHeaders()

    // Fetch session (may be null)
    const session = await auth.api.getSession({ headers })

    // Return session (or null)
    return { session: session || null }
}
