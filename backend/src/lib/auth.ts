/**
 * Better Auth Configuration
 *
 * Initializes Better Auth with:
 * - Prisma adapter for database integration
 * - OAuth providers (Google, GitHub, Apple)
 * - Session management with secure cookies
 */

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

// Validate required environment variables
const requiredEnvVars = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"] as const

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(
            `Missing required environment variable: ${envVar}. Please check your .env file.`
        )
    }
}

// Check if any OAuth providers are configured
const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
const hasGitHubOAuth = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET

if (!hasGoogleOAuth && !hasGitHubOAuth) {
    console.warn(
        "No OAuth providers configured. At least Google or GitHub OAuth is required for authentication."
    )
}

/**
 * Better Auth Client Instance
 *
 * Configured with:
 * - Prisma adapter for User, Session, Account, Verification tables
 * - OAuth providers (Google, GitHub, Apple)
 * - Secure session cookies (httpOnly, sameSite, secure in production)
 * - 7-day session expiration
 */
export const auth = betterAuth({
    // Database adapter
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),

    // Base URL for auth endpoints
    baseURL: process.env.BETTER_AUTH_URL,

    // Secret for signing tokens and cookies
    secret: process.env.BETTER_AUTH_SECRET,

    // Email and password authentication (disabled for MVP)
    emailAndPassword: {
        enabled: false,
    },

    // OAuth social providers
    socialProviders: {
        google: hasGoogleOAuth
            ? {
                  clientId: process.env.GOOGLE_CLIENT_ID as string,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
              }
            : undefined,
        github: hasGitHubOAuth
            ? {
                  clientId: process.env.GITHUB_CLIENT_ID as string,
                  clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
              }
            : undefined,
    },

    // Session configuration
    session: {
        // Session expiration: 7 days
        expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds

        // Update session activity on every request
        updateAge: 60 * 60 * 24, // 1 day in seconds

        // Cookie configuration
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
        },
    },

    // Advanced options
    advanced: {
        // Use secure cookies in production
        useSecureCookies: process.env.NODE_ENV === "production",

        // Cross-site request settings
        crossSubDomainCookies: {
            enabled: false,
        },
    },

    // Trust proxy in production (for secure cookies behind reverse proxy)
    trustedOrigins:
        process.env.NODE_ENV === "production"
            ? [
                  process.env.BETTER_AUTH_URL ?? "",

                  //* mobile
                  "ping://",

                  // Production & staging schemes
                  "ping-prod://",
                  "ping-staging://",

                  // Wildcard support for all paths following the scheme
                  "ping://*",
              ]
            : // Development mode - Expo's exp:// scheme + ping:// scheme with local IP ranges
              [
                  "ping://", // Trust ping:// scheme for OAuth callbacks
                  "ping://*", // Trust all ping:// URLs
                  "exp://", // Trust all Expo URLs (prefix matching)
                  "exp://**", // Trust all Expo URLs (wildcard matching)
                  "exp://192.168.*.*:*/**", // Trust 192.168.x.x IP range with any port and path
              ],
})

/**
 * Type-safe auth client with all methods
 */
export type Auth = typeof auth
export type AuthUser = typeof auth.$Infer.Session.user | null
export type AuthSession = typeof auth.$Infer.Session.session | null

/**
 * Export auth handler for Hono integration
 */
export const authHandler = auth.handler

/**
 * Helper function to verify session from request
 *
 * @param request - Hono request object
 * @returns Session identity (userId + sessionId) if session is valid, null otherwise
 */
export async function verifySession(
    request: Request
): Promise<{ userId: string; sessionId: string } | null> {
    try {
        // Get session from cookie
        const cookieHeader = request.headers.get("cookie")
        if (!cookieHeader) {
            return null
        }

        // Parse session token from cookie
        const sessionToken = parseCookie(cookieHeader, "better-auth.session_token")
        if (!sessionToken) {
            return null
        }

        // In test environment, verify session directly via Prisma
        // This allows tests to create sessions without Better Auth OAuth flow
        if (process.env.NODE_ENV === "test") {
            const session = await prisma.session.findUnique({
                where: {
                    sessionToken: sessionToken,
                },
                include: {
                    user: true,
                },
            })

            // Check if session exists and is not expired
            if (!session || session.expires < new Date()) {
                return null
            }

            return { userId: session.userId, sessionId: session.id }
        }

        // In production/development, verify session with Better Auth
        const sessionData = await auth.api.getSession({
            headers: request.headers,
        })

        if (!sessionData?.user?.id || !sessionData?.session?.id) {
            return null
        }

        return { userId: sessionData.user.id, sessionId: sessionData.session.id }
    } catch (error) {
        console.error("Session verification failed:", error)
        return null
    }
}

/**
 * Helper function to parse cookie value
 *
 * @param cookieHeader - Cookie header string
 * @param name - Cookie name to extract
 * @returns Cookie value or null if not found
 */
export function parseCookie(cookieHeader: string, name: string): string | null {
    const cookies = cookieHeader.split(";")
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split("=")
        if (cookieName === name) {
            return cookieValue ?? null
        }
    }
    return null
}

/**
 * Verify session from cookie string (for Socket.io middleware)
 *
 * This function verifies Better Auth session directly from cookie header
 * without requiring a Request object, suitable for WebSocket authentication.
 *
 * @param cookieHeader - Cookie header string from WebSocket handshake
 * @returns User ID if session is valid, null otherwise
 */
export async function verifySessionFromCookie(cookieHeader: string): Promise<string | null> {
    try {
        // Parse session token from cookie
        const sessionToken = parseCookie(cookieHeader, "better-auth.session_token")
        if (!sessionToken) {
            return null
        }

        // In test environment, verify session directly via Prisma
        // This allows tests to create sessions without Better Auth OAuth flow
        if (process.env.NODE_ENV === "test") {
            const session = await prisma.session.findUnique({
                where: {
                    sessionToken: sessionToken,
                },
                include: {
                    user: true,
                },
            })

            // Check if session exists and is not expired
            if (!session || session.expires < new Date()) {
                return null
            }

            return session.userId
        }

        // In production/development, verify session with Better Auth
        // Create minimal Headers object for Better Auth API
        const headers = new Headers()
        headers.set("cookie", cookieHeader)

        const session = await auth.api.getSession({
            headers: headers,
        })

        if (!session?.user?.id) {
            return null
        }

        return session.user.id
    } catch (error) {
        console.error("Session verification from cookie failed:", error)
        return null
    }
}
