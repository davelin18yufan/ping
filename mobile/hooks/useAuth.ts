/**
 * Authentication hooks for Better Auth + Expo
 * Provides session management, sign in, and sign out functionality
 *
 * Wraps Better Auth client hooks with additional helpers
 * for Apollo Client and Socket.io integration
 */

import { useEffect } from "react"
import { authClient } from "@/lib/auth"
import { setAuthToken, removeAuthToken } from "@/lib/apollo"
import { reconnectSocket, disconnectSocket } from "@/lib/socket"

/**
 * Auth hook with Apollo and Socket.io integration
 * Syncs auth token to Apollo Client and Socket.io when session changes
 */
export function useAuth() {
    const { data: session, isPending, error } = authClient.useSession()

    // Sync auth token to Apollo Client and Socket.io when session changes
    useEffect(() => {
        const syncAuthToken = async () => {
            if (session?.session?.token) {
                // User is authenticated, update token
                await setAuthToken(session.session.token)
                await reconnectSocket()
            } else {
                // User is not authenticated, clear token
                await removeAuthToken()
                disconnectSocket()
            }
        }

        syncAuthToken()
    }, [session])

    return {
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        isPending,
        error: error?.message ?? null,
        session,
    }
}

/**
 * Session hook
 * Direct re-export of Better Auth session hook
 */
export function useSession() {
    return authClient.useSession()
}

/**
 * Sign in hook
 * Provides methods for OAuth and Magic Link sign in
 */
export function useSignIn() {
    const { isPending, error } = authClient.useSession()

    /**
     * Sign in with OAuth provider (Google, GitHub, etc.)
     */
    const signInWithOAuth = async (provider: "google" | "github") => {
        try {
            // Trigger OAuth flow via Better Auth
            // The expoClient plugin handles WebBrowser and deep linking
            const result = await authClient.signIn.social({
                provider,
                callbackURL: `${process.env.EXPO_PUBLIC_APP_SCHEME || "ping"}://auth/callback`,
            })

            return result
        } catch (err) {
            console.error(`OAuth sign in with ${provider} failed:`, err)
            throw err
        }
    }

    /**
     * Sign in with Magic Link (email-based)
     * Note: Magic Link may not be supported by all Better Auth configurations
     */
    const signInWithMagicLink = async (_email: string) => {
        try {
            // TODO: Magic Link functionality requires additional setup on the server
            // For now, throw an error indicating it's not implemented
            throw new Error(
                "Magic Link authentication is not currently implemented"
            )
        } catch (err) {
            console.error("Magic Link sign in failed:", err)
            throw err
        }
    }

    return {
        signInWithOAuth,
        signInWithMagicLink,
        isPending,
        error: error?.message ?? null,
    }
}

/**
 * Sign out hook
 * Handles user logout and session cleanup
 */
export function useSignOut() {
    const { isPending, error } = authClient.useSession()

    const signOut = async () => {
        try {
            // Sign out via Better Auth
            await authClient.signOut()

            // Clear Apollo Client token and disconnect Socket.io
            await removeAuthToken()
            disconnectSocket()
        } catch (err) {
            console.error("Sign out failed:", err)
            throw err
        }
    }

    return {
        signOut,
        isPending,
        error: error?.message ?? null,
    }
}
