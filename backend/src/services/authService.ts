/**
 * Authentication Service
 *
 * Business logic for authentication operations:
 * - Google ID token verification via Google's tokeninfo endpoint
 * - Session management
 * - User creation and retrieval
 *
 * NOTE: This service handles the GraphQL-based auth flow, used primarily
 * by mobile clients (React Native) that obtain a Google ID token from the
 * native Google Sign-In SDK. Web clients use Better Auth's REST flow
 * (/api/auth/sign-in/social) which is handled entirely by Better Auth.
 */

import type { PrismaClient, User } from "@generated/prisma/client"

/**
 * Google tokeninfo response from https://oauth2.googleapis.com/tokeninfo
 */
interface GoogleTokenInfo {
    /** The audience the token was issued for (should match GOOGLE_CLIENT_ID) */
    aud: string
    /** Google user ID (subject) */
    sub: string
    /** User's email address */
    email: string
    /** Whether the email has been verified by Google */
    email_verified: string
    /** User's display name */
    name?: string
    /** User's profile picture URL */
    picture?: string
    /** Token expiry as Unix timestamp string */
    exp: string
    /** Error field — present when tokeninfo call fails */
    error_description?: string
}

/**
 * Verify Google ID token and authenticate user
 *
 * Used by mobile clients that obtain a Google ID token via the native
 * Google Sign-In SDK. Verifies the token with Google's tokeninfo endpoint,
 * then finds or creates the user in the database.
 *
 * For web clients, use Better Auth's REST flow (/api/auth/sign-in/social)
 * instead.
 *
 * @param idToken - Google ID token from native Google Sign-In SDK
 * @param prisma - Prisma client for database operations
 * @returns Authenticated user object
 * @throws Error if token is invalid, expired, or belongs to wrong audience
 */
export async function verifyGoogleOAuthCode(idToken: string, prisma: PrismaClient): Promise<User> {
    if (!idToken || idToken.trim() === "") {
        throw new Error("OAuth code is required")
    }

    // In test environment, use mock data to avoid real Google API calls
    if (process.env.NODE_ENV === "test") {
        return verifyGoogleOAuthCodeTest(idToken, prisma)
    }

    // Verify token with Google's tokeninfo endpoint
    const tokenInfo = await fetchGoogleTokenInfo(idToken)

    // Validate audience matches our client ID
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
        throw new Error("GOOGLE_CLIENT_ID is not configured")
    }

    if (tokenInfo.aud !== clientId) {
        throw new Error("Invalid OAuth code")
    }

    // Check token expiry
    const now = Math.floor(Date.now() / 1000)
    if (parseInt(tokenInfo.exp, 10) < now) {
        throw new Error("Invalid OAuth code")
    }

    // Require verified email from Google
    if (tokenInfo.email_verified !== "true") {
        throw new Error("Google account email is not verified")
    }

    return findOrCreateUser(
        {
            googleId: tokenInfo.sub,
            email: tokenInfo.email,
            name: tokenInfo.name,
            picture: tokenInfo.picture,
        },
        prisma
    )
}

/**
 * Fetch and validate Google tokeninfo for an ID token
 */
async function fetchGoogleTokenInfo(idToken: string): Promise<GoogleTokenInfo> {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`

    let response: Response
    try {
        response = await fetch(url)
    } catch {
        throw new Error("Failed to connect to Google authentication service")
    }

    const data = (await response.json()) as GoogleTokenInfo

    if (!response.ok || data.error_description) {
        throw new Error("Invalid OAuth code")
    }

    return data
}

/**
 * Find an existing user by Google account or email, or create a new one
 */
async function findOrCreateUser(
    googleUser: {
        googleId: string
        email: string
        name?: string
        picture?: string
    },
    prisma: PrismaClient
): Promise<User> {
    // Check if an Account record already links this Google ID to a user
    const existingAccount = await prisma.account.findFirst({
        where: {
            providerId: "google",
            accountId: googleUser.googleId,
        },
        include: { user: true },
    })

    if (existingAccount) {
        return existingAccount.user
    }

    // Check if the email is already registered (account linking)
    const existingUser = await prisma.user.findUnique({
        where: { email: googleUser.email },
    })

    if (existingUser) {
        // Link this Google account to the existing user
        await prisma.account.create({
            data: {
                userId: existingUser.id,
                providerId: "google",
                accountId: googleUser.googleId,
            },
        })
        return existingUser
    }

    // Create a new user and link the Google account
    const newUser = await prisma.user.create({
        data: {
            email: googleUser.email,
            name: googleUser.name ?? googleUser.email.split("@")[0],
            image: googleUser.picture ?? null,
            emailVerified: true,
        },
    })

    await prisma.account.create({
        data: {
            userId: newUser.id,
            providerId: "google",
            accountId: googleUser.googleId,
        },
    })

    return newUser
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
    const sessionToken = `session_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`

    await prisma.session.create({
        data: {
            userId,
            token: sessionToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

// ─── Test-only helpers ───────────────────────────────────────────────────────

/**
 * Test-environment mock for Google ID token verification.
 * Maps well-known test codes to fixed user identities so that integration
 * tests can exercise the auth flow without hitting real Google APIs.
 *
 * Only active when NODE_ENV === "test".
 */
async function verifyGoogleOAuthCodeTest(code: string, prisma: PrismaClient): Promise<User> {
    const mockUsers: Record<string, { googleId: string; email: string; name: string; picture?: string }> = {
        valid_google_code_xyz123: {
            googleId: "google_user_123",
            email: "test@example.com",
            name: "Test User",
            picture: "https://example.com/avatar.jpg",
        },
        same_google_code_abc: {
            googleId: "google_user_same",
            email: "same@example.com",
            name: "Same User",
        },
        session_test_code_123: {
            googleId: "google_user_session",
            email: "session@example.com",
            name: "Session Test User",
        },
        callback_test_code: {
            googleId: "google_user_callback",
            email: "callback@example.com",
            name: "Callback Test User",
        },
        auth_test_code_456: {
            googleId: "google_user_auth",
            email: "auth@example.com",
            name: "Auth Test User",
        },
    }

    const mockUser = mockUsers[code]
    if (!mockUser) {
        throw new Error("Invalid OAuth code")
    }

    return findOrCreateUser(mockUser, prisma)
}
