/**
 * Better Auth Client Configuration
 *
 * Initializes Better Auth client with baseURL and OAuth providers
 */

import { queryOptions } from "@tanstack/react-query"
import { createAuthClient as betterAuthCreateClient } from "better-auth/react"

/**
 * Create Better Auth client instance
 *
 * @returns Better Auth client configured with API endpoint
 */
export function createAuthClient() {
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000"

    const client = betterAuthCreateClient({
        baseURL,
    })

    return client
}

/**
 * Default Better Auth client instance
 * Used across the application
 */
export const authClient = createAuthClient()

/**
 * Export Better Auth hooks and methods for use in components
 */
export const { signIn, signOut, useSession, getSession } = authClient

/**
 * TanStack Query options for session fetching.
 *
 * Replaces direct useSession() calls so that auth errors (404, network failures)
 * are captured as TanStack Query error state instead of propagating to React
 * error boundaries via Better Auth's internal reactive system.
 *
 * - throwOnError: false (default for useQuery) — errors never reach error boundary
 * - retry: false — do not retry auth failures (404 / connection refused)
 * - Returns null for any error, treating backend unavailability as "no session"
 */
export const sessionQueryOptions = queryOptions({
    queryKey: ["auth", "session"] as const,
    queryFn: async () => {
        const result = await authClient.getSession()
        if (result.error) return null
        return result.data ?? null
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    retry: false,
})
