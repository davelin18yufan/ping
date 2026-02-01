/**
 * TanStack Router Authentication Guards
 *
 * Reusable beforeLoad functions for route-level authentication.
 * Uses Better Auth's getSession() to check auth state before component renders.
 *
 * Benefits:
 * - No loading flicker (checks before render)
 * - No component-level useSession rerenders on window focus
 * - Type-safe route protection
 *
 * Usage:
 * ```typescript
 * export const Route = createFileRoute('/protected')({
 *   beforeLoad: requireAuth,
 *   component: ProtectedPage,
 * })
 * ```
 */

import { redirect } from "@tanstack/react-router"

import { getSession } from "@/lib/auth-client"

/**
 * Require authentication - redirect to /auth if not logged in
 *
 * Use for protected routes that require a logged-in user.
 *
 * @example
 * ```typescript
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: requireAuth,
 * })
 * ```
 */
export async function requireAuth() {
    const session = await getSession()

    if (!session.data?.user) {
        throw redirect({
            to: "/auth",
            search: {
                // Save intended destination for post-login redirect
                redirect: globalThis.location?.pathname || "/",
            },
        })
    }

    return { session: session.data }
}

/**
 * Require guest (not authenticated) - redirect to / if already logged in
 *
 * Use for auth pages (login, signup) to prevent logged-in users from accessing them.
 *
 * @example
 * ```typescript
 * export const Route = createFileRoute('/auth/')({
 *   beforeLoad: requireGuest,
 * })
 * ```
 */
export async function requireGuest() {
    const session = await getSession()

    if (session.data?.user) {
        throw redirect({ to: "/" })
    }
}

/**
 * Optional authentication - fetch session without redirecting
 *
 * Use for pages that work for both logged-in and guest users.
 *
 * @example
 * ```typescript
 * export const Route = createFileRoute('/')({
 *   beforeLoad: optionalAuth,
 * })
 *
 * function HomePage() {
 *   const { session } = Route.useLoaderData()
 *   return session ? <Welcome user={session.user} /> : <GuestView />
 * }
 * ```
 */
export async function optionalAuth() {
    const session = await getSession()
    return { session: session.data }
}
