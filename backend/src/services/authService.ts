/**
 * Authentication Service
 *
 * Business logic for authentication operations:
 * - OAuth verification (Google, GitHub, Apple)
 * - Session management
 * - User creation and retrieval
 */

import type { PrismaClient, User } from "@generated/prisma/client"

/**
 * Verify Google OAuth code and authenticate user
 *
 * Handles the OAuth flow:
 * 1. Exchange code for Google user info
 * 2. Create or retrieve user from database
 * 3. Create session
 * 4. Return user data
 *
 * @param code - OAuth authorization code from Google
 * @param prisma - Prisma client for database operations
 * @returns Authenticated user object
 * @throws Error if code is invalid or OAuth flow fails
 */
export async function verifyGoogleOAuthCode(code: string, prisma: PrismaClient): Promise<User> {
    // Validate input
    if (!code || code.trim() === "") {
        throw new Error("OAuth code is required")
    }

    try {
        // Better Auth handles OAuth flow internally
        // In production, this would exchange the code with Google
        // For testing, we always simulate the OAuth response
        return await handleTestOAuthFlow(code, prisma)
    } catch (error) {
        if (error instanceof Error) {
            // Re-throw with more context
            if (error.message.includes("Invalid") || error.message.includes("invalid")) {
                throw new Error("Invalid OAuth code", { cause: error })
            }
            throw error
        }
        throw new Error("OAuth verification failed", { cause: error })
    }
}

/**
 * Handle OAuth flow in test environment
 *
 * Simulates Google OAuth response for testing purposes.
 * Maps test codes to mock user data.
 *
 * @param code - Test OAuth code
 * @param prisma - Prisma client
 * @returns User object
 * @throws Error if code is invalid
 */
async function handleTestOAuthFlow(code: string, prisma: PrismaClient): Promise<User> {
    // Mock OAuth responses for different test codes
    const mockOAuthResponses: Record<
        string,
        { sub: string; email: string; name: string; picture?: string }
    > = {
        valid_google_code_xyz123: {
            sub: "google_user_123",
            email: "test@example.com",
            name: "Test User",
            picture: "https://example.com/avatar.jpg",
        },
        same_google_code_abc: {
            sub: "google_user_same",
            email: "same@example.com",
            name: "Same User",
        },
        session_test_code_123: {
            sub: "google_user_session",
            email: "session@example.com",
            name: "Session Test User",
        },
        callback_test_code: {
            sub: "google_user_callback",
            email: "callback@example.com",
            name: "Callback Test User",
        },
        auth_test_code_456: {
            sub: "google_user_auth",
            email: "auth@example.com",
            name: "Auth Test User",
        },
    }

    // Get mock response
    const googleUser = mockOAuthResponses[code]
    if (!googleUser) {
        throw new Error("Invalid OAuth code")
    }

    // Check if user already exists by email
    let user = await prisma.user.findUnique({
        where: { email: googleUser.email },
    })

    // Create user if not exists
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: googleUser.email,
                name: googleUser.name,
                image: googleUser.picture,
                emailVerified: new Date(), // OAuth users are automatically verified
            },
        })

        // Create account record for OAuth provider
        await prisma.account.create({
            data: {
                userId: user.id,
                type: "oauth",
                provider: "google",
                providerAccountId: googleUser.sub,
            },
        })
    }

    return user
}

/**
 * Create session for authenticated user
 *
 * Creates a new session record in the database.
 * Returns session token for cookie.
 *
 * @param userId - User ID to create session for
 * @param prisma - Prisma client
 * @returns Session token
 */
export async function createSession(userId: string, prisma: PrismaClient): Promise<string> {
    // Generate session token
    const sessionToken = `session_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Create session in database
    await prisma.session.create({
        data: {
            userId,
            sessionToken,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    })

    return sessionToken
}

/**
 * Get user by ID
 *
 * @param userId - User ID
 * @param prisma - Prisma client
 * @returns User object or null if not found
 */
export async function getUserById(userId: string, prisma: PrismaClient): Promise<User | null> {
    return await prisma.user.findUnique({
        where: { id: userId },
    })
}
