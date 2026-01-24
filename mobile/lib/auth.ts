/**
 * Better Auth Client configuration for Expo
 * Provides OAuth authentication (Google, GitHub) and Magic Link
 *
 * @see https://www.better-auth.com/docs/integrations/expo
 */

import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import * as SecureStore from "expo-secure-store"

/**
 * Get Better Auth API endpoint from environment variable
 * Default to http://localhost:3000/api/auth for development
 */
const getAuthEndpoint = (): string => {
    return (
        process.env.EXPO_PUBLIC_AUTH_URL ||
        (process.env.EXPO_PUBLIC_API_URL
            ? `${process.env.EXPO_PUBLIC_API_URL}/api/auth`
            : undefined) ||
        "http://localhost:3000/api/auth"
    )
}

/**
 * Get app scheme for OAuth deep linking
 * Must match scheme in app.json
 */
const getAppScheme = (): string => {
    return process.env.EXPO_PUBLIC_APP_SCHEME || "ping"
}

/**
 * Better Auth Client instance for Expo
 * Configured with expoClient plugin for OAuth and secure storage
 *
 * The expoClient plugin automatically handles:
 * - OAuth redirect flow with expo-web-browser
 * - Secure session storage with expo-secure-store
 * - Deep linking for OAuth callbacks
 */
export const authClient = createAuthClient({
    baseURL: getAuthEndpoint(),
    plugins: [
        expoClient({
            scheme: getAppScheme(),
            storagePrefix: "ping",
            storage: SecureStore,
        }),
    ],
})
export type Session = typeof authClient.$Infer.Session
export type User = typeof authClient.$Infer.Session.user

/**
 * Get current session from SecureStore
 * Used by Apollo Client and Socket.io to include auth token
 */
export async function getSession() {
    try {
        const sessionData = await SecureStore.getItemAsync("ping.session")
        if (sessionData) {
            return JSON.parse(sessionData)
        }
        return null
    } catch (error) {
        console.error("Failed to get session from SecureStore:", error)
        return null
    }
}

/**
 * Clear session from SecureStore
 * Called on logout or authentication error
 */
export async function clearSession() {
    try {
        await SecureStore.deleteItemAsync("ping.session")
        await SecureStore.deleteItemAsync("ping.session.token")
    } catch (error) {
        console.error("Failed to clear session from SecureStore:", error)
    }
}

/**
 * Parse OAuth callback URL and extract parameters
 * Handles both success (code) and error cases
 */
export function parseOAuthCallback(url: string): {
    code?: string
    state?: string
    error?: string
    errorDescription?: string
} {
    try {
        // Native URL and URLSearchParmas behavior may differ with broswer.
        // Parse URL manually for React Native compatibility
        const queryStart = url.indexOf("?")
        if (queryStart === -1) {
            return {}
        }

        const query = url.substring(queryStart + 1)
        const params: Record<string, string> = {}

        if (query) {
            query.split("&").forEach((param: string) => {
                const [key, value] = param.split("=")
                if (key && value) {
                    // Decode URI component and replace + with space
                    params[key] = decodeURIComponent(value.replace(/\+/g, " "))
                }
            })
        }

        return {
            code: params.code ?? undefined,
            state: params.state ?? undefined,
            error: params.error ?? undefined,
            errorDescription: params.error_description ?? undefined,
        }
    } catch (error) {
        console.error("Failed to parse OAuth callback URL:", error)
        return {}
    }
}
