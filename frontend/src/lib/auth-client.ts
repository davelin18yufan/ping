/**
 * Better Auth Client Configuration
 *
 * Initializes Better Auth client with baseURL and OAuth providers
 */

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
export const { signIn, signOut, useSession } = authClient
