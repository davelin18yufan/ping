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
import { createMiddleware } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

import { auth } from "@/lib/auth"

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
 * @throws Redirect to /auth if not authenticated
 */
export const requireAuthServer = createMiddleware().server(async ({ next, request }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    // Redirect to login if no valid session
    if (!session?.user) {
        // Get current pathname for post-login redirect from request URL
        const url = new URL(request.url)
        const currentPath = url.pathname

        throw redirect({
            to: "/auth",
            search: {
                redirect: currentPath,
            },
        })
    }

    return next({
        context: {
            session,
        },
    })
})

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
export const requireGuestServer = createMiddleware().server(async ({ next }) => {
    // Get request headers (contains cookies)
    const headers = getRequestHeaders()

    // Check if user is already logged in
    const session = await auth.api.getSession({ headers })

    // Redirect authenticated users to home
    if (session?.user) {
        throw redirect({
            to: "/",
        })
    }

    return next({
        context: {
            session: null,
        },
    })
})

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
export const optionalAuthServer = createMiddleware().server(async ({ next }) => {
    // Get request headers (contains cookies)
    const headers = getRequestHeaders()

    // Fetch session (may be null)
    const session = await auth.api.getSession({ headers })

    return next({
        context: {
            session,
        },
    })
})
