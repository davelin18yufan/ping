/**
 * TanStack Router Authentication Guards (Client-Side)
 *
 * DEPRECATED: This file uses client-side session checking with Better Auth's
 * getSession() method, which can cause hydration mismatches in SSR.
 *
 * RECOMMENDED APPROACH: Use server-side middleware instead:
 * @see ./auth.middleware.server.ts
 *
 * Why Server-Side Middleware is Better:
 * - True server-side validation (no client-side hydration issues)
 * - Uses auth.api.getSession() with request headers (proper SSR)
 * - No flash of unauthorized content
 * - Better security (session check happens before HTML is sent)
 *
 * Migration Guide:
 * ```typescript
 * // Before (client-side beforeLoad)
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: requireAuth,
 *   component: DashboardPage,
 * })
 *
 * // After (server-side middleware)
 * import { requireAuthMiddleware } from '@/middleware/auth.middleware.server'
 *
 * export const Route = createFileRoute('/dashboard')({
 *   component: DashboardPage,
 *   server: {
 *     middleware: [requireAuthMiddleware],
 *   },
 * })
 * ```
 *
 * @see https://www.better-auth.com/docs/integrations/tanstack
 * @see https://tanstack.com/router/latest/docs/framework/react/guide/authentication
 */

import { redirect } from "@tanstack/react-router"

import { getSession } from "@/lib/auth-client"

/**
 * Session data returned by auth guards
 */
type SessionData = Awaited<ReturnType<typeof getSession>>["data"]

/**
 * Return type for requireAuth guard
 */
interface RequireAuthContext {
    session: NonNullable<SessionData>
}

/**
 * Return type for optionalAuth guard
 */
interface OptionalAuthContext {
    session: SessionData
}

/**
 * Require authentication - redirect to /auth if not logged in
 *
 * Use for protected routes that require a logged-in user.
 * Automatically saves the intended destination URL for post-login redirect.
 *
 * Features:
 * - Server-side session validation (no client-side flicker)
 * - Preserves intended destination in search params
 * - Type-safe session return (non-nullable)
 *
 * @example
 * ```typescript
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: requireAuth,
 *   component: DashboardPage,
 * })
 *
 * function DashboardPage() {
 *   const { session } = Route.useRouteContext()
 *   // session.user is guaranteed to exist
 *   return <div>Welcome, {session.user.name}!</div>
 * }
 * ```
 */
export async function requireAuth(): Promise<RequireAuthContext> {
    const session = await getSession()

    if (!session.data?.user) {
        // Get current pathname from window.location
        const currentPath = globalThis.location?.pathname || "/"

        throw redirect({
            to: "/auth",
            search: {
                // Save intended destination for post-login redirect
                redirect: currentPath,
            },
        })
    }

    return { session: session.data }
}

/**
 * Require guest (not authenticated) - redirect to / if already logged in
 *
 * Use for auth pages (login, signup) to prevent logged-in users from accessing them.
 * If user is already logged in, redirects to home page.
 *
 * Features:
 * - Prevents duplicate login attempts
 * - Handles redirect param if present (e.g., from requireAuth)
 *
 * @example
 * ```typescript
 * export const Route = createFileRoute('/auth/')({
 *   beforeLoad: requireGuest,
 *   component: LoginPage,
 * })
 * ```
 */
export async function requireGuest(): Promise<void> {
    const session = await getSession()

    if (session.data?.user) {
        // If user is already logged in, redirect to home
        throw redirect({
            to: "/",
        })
    }
}

/**
 * Optional authentication - fetch session without redirecting
 *
 * Use for pages that work for both logged-in and guest users.
 * Session data is available in route context, but no redirect occurs.
 *
 * Features:
 * - Works for both authenticated and guest users
 * - Provides session data to components via route context
 * - No redirects or loading states
 *
 * @example
 * ```typescript
 * export const Route = createFileRoute('/')({
 *   beforeLoad: optionalAuth,
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
 */
export async function optionalAuth(): Promise<OptionalAuthContext> {
    const session = await getSession()
    return { session: session.data }
}
