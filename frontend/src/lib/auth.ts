/**
 * Better Auth Server Configuration
 *
 * This is the server-side auth instance for TanStack Start.
 * - Uses tanstackStartCookies plugin for seamless cookie handling in SSR
 * - Configured to communicate with backend auth API
 *
 * IMPORTANT: This is for server-side session validation only.
 * Use @/lib/auth-client for client-side authentication (signIn, signOut, etc.)
 *
 * @see https://www.better-auth.com/docs/integrations/tanstack
 */

import { betterAuth } from "better-auth"
import { tanstackStartCookies } from "better-auth/tanstack-start"

/**
 * Server-side Better Auth instance
 *
 * Configuration:
 * - baseURL: Points to backend auth endpoints
 * - tanstackStartCookies: Enables server-side cookie reading in TanStack Start
 *
 * Usage:
 * - auth.api.getSession({ headers }) - Verify session server-side
 *
 * Note: This must match the backend auth configuration
 */
export const auth = betterAuth({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",

    // IMPORTANT: tanstackStartCookies must be the last plugin
    plugins: [tanstackStartCookies()],
})

/**
 * Type-safe session types
 */
export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = AuthSession["user"]
