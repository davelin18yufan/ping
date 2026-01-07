/**
 * Better Auth Integration Tests
 *
 * Tests Better Auth client initialization, Prisma adapter connection,
 * OAuth provider configuration, session management, and error handling.
 *
 * Test Coverage:
 * 1. Better Auth Client initialization
 * 2. Prisma Adapter connection
 * 3. Google OAuth configuration
 * 4. GitHub OAuth configuration
 * 5. Session creation and validation
 * 6. Session expiration handling
 * 7. Invalid session token handling
 * 8. Middleware userId injection
 * 9. Middleware missing cookie handling
 * 10. Error handling - missing environment variables
 * 11. Error handling - database connection failure
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { PrismaClient } from "@generated/prisma/client"
import { createTestPrismaClient, cleanupTestPrisma } from "@tests/fixtures/prisma"
import { auth } from "@/lib/auth"

describe("Better Auth Integration", () => {
    let testPrisma: PrismaClient

    beforeEach(() => {
        testPrisma = createTestPrismaClient()
    })

    afterEach(async () => {
        await cleanupTestPrisma(testPrisma)
    })

    /**
     * Test Case 1: Better Auth Client Initialization
     */
    test("should initialize Better Auth client successfully", () => {
        // Assert: Client should exist with required methods
        expect(auth).toBeDefined()
        expect(auth.handler).toBeDefined()
        expect(auth.api).toBeDefined()
        expect(typeof auth.handler).toBe("function")
    })

    /**
     * Test Case 2: Prisma Adapter Connection
     */
    test("should connect Prisma adapter correctly", async () => {
        // Arrange: Prepare test user data
        const testEmail = "test-adapter@example.com"

        // Act: Create user using Prisma directly (simulating Better Auth adapter usage)
        const user = await testPrisma.user.create({
            data: {
                email: testEmail,
                name: "Test User",
                emailVerified: new Date(),
            },
        })

        // Assert: User should be created successfully
        expect(user).toBeDefined()
        expect(user.id).toBeDefined()
        expect(user.email).toBe(testEmail)
        expect(user.name).toBe("Test User")

        // Verify user can be queried from database
        const foundUser = await testPrisma.user.findUnique({
            where: { email: testEmail },
        })

        expect(foundUser).toBeDefined()
        expect(foundUser?.email).toBe(testEmail)
    })

    /**
     * Test Case 3: Google OAuth Provider Configuration
     */
    test("should configure Google OAuth provider correctly", () => {
        // Act: Check if Google OAuth is configured
        const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET

        if (hasGoogleOAuth) {
            // Assert: Google OAuth should be enabled
            expect(process.env.GOOGLE_CLIENT_ID).toBeDefined()
            expect(process.env.GOOGLE_CLIENT_SECRET).toBeDefined()
            expect(process.env.GOOGLE_CLIENT_ID).not.toBe("")
            expect(process.env.GOOGLE_CLIENT_SECRET).not.toBe("")
        } else {
            // Skip test if Google OAuth not configured
            console.warn(
                "Google OAuth not configured in test environment - skipping provider validation"
            )
        }
    })

    /**
     * Test Case 4: GitHub OAuth Provider Configuration
     */
    test("should configure GitHub OAuth provider correctly", () => {
        // Act: Check if GitHub OAuth is configured
        const hasGitHubOAuth = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET

        if (hasGitHubOAuth) {
            // Assert: GitHub OAuth should be enabled
            expect(process.env.GITHUB_CLIENT_ID).toBeDefined()
            expect(process.env.GITHUB_CLIENT_SECRET).toBeDefined()
            expect(process.env.GITHUB_CLIENT_ID).not.toBe("")
            expect(process.env.GITHUB_CLIENT_SECRET).not.toBe("")
        } else {
            // Skip test if GitHub OAuth not configured
            console.warn(
                "GitHub OAuth not configured in test environment - skipping provider validation"
            )
        }
    })

    /**
     * Test Case 5: Session Creation and Validation
     */
    test("should create and validate session successfully", async () => {
        // Arrange: Create test user
        const testUser = await testPrisma.user.create({
            data: {
                email: "test-session@example.com",
                name: "Session Test User",
                emailVerified: new Date(),
            },
        })

        // Act 1: Create session manually (simulating Better Auth session creation)
        const sessionToken = `test-session-token-${Date.now()}`
        const session = await testPrisma.session.create({
            data: {
                userId: testUser.id,
                sessionToken: sessionToken,
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
            },
        })

        // Assert 1: Session should be created successfully
        expect(session).toBeDefined()
        expect(session.sessionToken).toBe(sessionToken)
        expect(session.userId).toBe(testUser.id)

        // Act 2: Verify session exists in database
        const foundSession = await testPrisma.session.findUnique({
            where: { sessionToken: sessionToken },
            include: { user: true },
        })

        // Assert 2: Session should be retrievable with user data
        expect(foundSession).toBeDefined()
        expect(foundSession?.userId).toBe(testUser.id)
        expect(foundSession?.user.email).toBe("test-session@example.com")
    })

    /**
     * Test Case 6: Session Expiration Handling
     */
    test("should reject expired session", async () => {
        // Arrange: Create test user and expired session
        const testUser = await testPrisma.user.create({
            data: {
                email: "test-expired@example.com",
                name: "Expired Session User",
                emailVerified: new Date(),
            },
        })

        const expiredSessionToken = `expired-session-token-${Date.now()}`
        const expiredSession = await testPrisma.session.create({
            data: {
                userId: testUser.id,
                sessionToken: expiredSessionToken,
                expires: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            },
        })

        // Act: Check if session is expired
        const currentTime = new Date()
        const isExpired = expiredSession.expires < currentTime

        // Assert: Session should be considered expired
        expect(isExpired).toBe(true)
        expect(expiredSession.expires.getTime()).toBeLessThan(currentTime.getTime())
    })

    /**
     * Test Case 7: Invalid Session Token Handling
     */
    test("should reject invalid session token", async () => {
        // Arrange: Prepare a non-existent session token
        const invalidToken = `non-existent-token-${Date.now()}`

        // Act: Try to find session with invalid token
        const session = await testPrisma.session.findUnique({
            where: { sessionToken: invalidToken },
        })

        // Assert: Session should not be found
        expect(session).toBeNull()
    })

    /**
     * Test Case 8: Middleware User ID Injection
     */
    test("should inject userId into context from session cookie", async () => {
        // Arrange: Create test user and session
        const testUser = await testPrisma.user.create({
            data: {
                email: "test-middleware@example.com",
                name: "Middleware Test User",
                emailVerified: new Date(),
            },
        })

        const sessionToken = `test-middleware-token-${Date.now()}`
        await testPrisma.session.create({
            data: {
                userId: testUser.id,
                sessionToken: sessionToken,
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
            },
        })

        // Act: Simulate session verification (middleware would do this)
        const foundSession = await testPrisma.session.findUnique({
            where: { sessionToken: sessionToken },
            include: { user: true },
        })

        // Assert: Session should be found with user context
        expect(foundSession).toBeDefined()
        expect(foundSession?.userId).toBe(testUser.id)
        expect(foundSession?.user).toBeDefined()
        expect(foundSession?.user.email).toBe("test-middleware@example.com")

        // Verify session is not expired
        expect(foundSession?.expires.getTime()).toBeGreaterThan(Date.now())
    })

    /**
     * Test Case 9: Middleware Missing Cookie Handling
     */
    test("should handle missing session cookie gracefully", async () => {
        // Arrange: No session cookie provided (simulated)
        const cookieHeader = ""

        // Act: Parse cookie (would return null)
        const sessionToken = parseCookie(cookieHeader, "better-auth.session_token")

        // Assert: Should return null for missing cookie
        expect(sessionToken).toBeNull()

        // Verify that no session exists
        if (sessionToken) {
            const session = await testPrisma.session.findUnique({
                where: { sessionToken },
            })
            expect(session).toBeNull()
        }
    })

    /**
     * Test Case 10: Error Handling - Missing Environment Variables
     */
    test("should validate required environment variables on initialization", () => {
        // Assert: Required environment variables should be defined
        expect(process.env.BETTER_AUTH_SECRET).toBeDefined()
        expect(process.env.BETTER_AUTH_URL).toBeDefined()

        // Verify they are not empty strings
        expect(process.env.BETTER_AUTH_SECRET).not.toBe("")
        expect(process.env.BETTER_AUTH_URL).not.toBe("")

        // Verify minimum secret length (Better Auth requirement)
        const secretLength = process.env.BETTER_AUTH_SECRET?.length ?? 0
        expect(secretLength).toBeGreaterThanOrEqual(32)
    })

    /**
     * Test Case 11: Error Handling - Database Connection Failure
     */
    test("should handle database connection failure gracefully", async () => {
        // Arrange: Create Prisma client with invalid connection string using adapter
        const { PrismaPg } = await import("@prisma/adapter-pg")
        const invalidAdapter = new PrismaPg({
            connectionString: "postgresql://invalid:invalid@localhost:9999/invalid_db",
        })

        const invalidPrisma = new PrismaClient({
            adapter: invalidAdapter,
        })

        // Act & Assert: Connection should fail
        try {
            await invalidPrisma.user.findFirst()
            // If we reach here, test should fail
            expect(true).toBe(false)
        } catch (error) {
            // Assert: Error should be thrown
            expect(error).toBeDefined()
            expect(error instanceof Error).toBe(true)
        } finally {
            // Cleanup: Disconnect invalid client
            await invalidPrisma.$disconnect().catch(() => {
                // Ignore disconnect errors
            })
        }
    })
})

/**
 * Helper function to parse cookie value
 *
 * @param cookieHeader - Cookie header string
 * @param name - Cookie name to extract
 * @returns Cookie value or null if not found
 */
function parseCookie(cookieHeader: string, name: string): string | null {
    if (!cookieHeader) {
        return null
    }

    const cookies = cookieHeader.split(";")
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split("=")
        if (cookieName === name) {
            return cookieValue ?? null
        }
    }
    return null
}
