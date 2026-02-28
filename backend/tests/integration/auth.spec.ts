/**
 * Authentication Integration Tests
 *
 * Consolidated test suite covering Better Auth infrastructure, the
 * authenticateWithGoogle GraphQL mutation, and session-based request auth.
 *
 * Test Coverage:
 *
 * Infrastructure:
 *  TC-A-01: Better Auth client initializes with handler and api
 *  TC-A-02: Required environment variables are present and valid
 *  TC-A-03: Database connection failure is handled gracefully
 *
 * authenticateWithGoogle mutation:
 *  TC-A-04: Valid code returns user, sessionToken, and success:true
 *  TC-A-05: Invalid code returns INVALID_OAUTH_CODE (statusCode 401)
 *  TC-A-06: Empty string code returns BAD_REQUEST (statusCode 400)
 *  TC-A-07: Same code used twice returns same userId (idempotent upsert)
 *  TC-A-08: Successful auth persists a non-expired session row in the DB
 *
 * Session-based authentication:
 *  TC-A-09: Valid session cookie allows authenticated GraphQL queries
 *  TC-A-10: Expired session cookie is rejected — me query returns UNAUTHENTICATED
 *  TC-A-11: Non-existent session token is rejected — me query returns UNAUTHENTICATED
 *  TC-A-12: Missing session cookie is rejected — me query returns UNAUTHENTICATED
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { PrismaClient } from "@generated/prisma/client"
import { createTestPrismaClient, cleanupTestPrisma } from "@tests/fixtures/prisma"
import { executeGraphQL, parseGraphQLResponse } from "@tests/fixtures/graphql"
import { auth } from "@/lib/auth"

// ---------------------------------------------------------------------------
// Shared query / mutation strings
// ---------------------------------------------------------------------------

const AUTHENTICATE_WITH_GOOGLE = `
    mutation AuthenticateWithGoogle($code: String!) {
        authenticateWithGoogle(code: $code) {
            user { id email }
            success
            message
            sessionToken
        }
    }
`

const ME_QUERY = `query { me { id email } }`

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Authentication", () => {
    let testPrisma: PrismaClient

    beforeEach(() => {
        testPrisma = createTestPrismaClient()
    })

    afterEach(async () => {
        await cleanupTestPrisma(testPrisma)
    })

    // =========================================================================
    // Infrastructure
    // =========================================================================

    /**
     * TC-A-01: Better Auth client initializes with handler and api
     */
    test("TC-A-01: Better Auth client should initialize with handler and api", () => {
        expect(auth).toBeDefined()
        expect(auth.handler).toBeDefined()
        expect(auth.api).toBeDefined()
        expect(typeof auth.handler).toBe("function")
    })

    /**
     * TC-A-02: Required environment variables are present and valid
     *
     * BETTER_AUTH_SECRET must be at least 32 characters to satisfy Better Auth's
     * minimum entropy requirement for HMAC signing.
     */
    test("TC-A-02: required environment variables should be present and valid", () => {
        expect(process.env.BETTER_AUTH_SECRET).toBeDefined()
        expect(process.env.BETTER_AUTH_URL).toBeDefined()
        expect(process.env.BETTER_AUTH_SECRET).not.toBe("")
        expect(process.env.BETTER_AUTH_URL).not.toBe("")

        const secretLength = process.env.BETTER_AUTH_SECRET?.length ?? 0
        expect(secretLength).toBeGreaterThanOrEqual(32)
    })

    /**
     * TC-A-03: Database connection failure is handled gracefully
     *
     * Verifies that an invalid connection string throws an Error (not a silent
     * failure) so callers can catch and surface the problem correctly.
     */
    test("TC-A-03: invalid database connection should throw an error", async () => {
        const { PrismaPg } = await import("@prisma/adapter-pg")
        const invalidAdapter = new PrismaPg({
            connectionString: "postgresql://invalid:invalid@localhost:9999/invalid_db",
        })
        const invalidPrisma = new PrismaClient({ adapter: invalidAdapter })

        try {
            await invalidPrisma.user.findFirst()
            expect(true).toBe(false) // must not reach here
        } catch (error) {
            expect(error).toBeDefined()
            expect(error instanceof Error).toBe(true)
        } finally {
            await invalidPrisma.$disconnect().catch(() => {})
        }
    })

    // =========================================================================
    // authenticateWithGoogle mutation
    // =========================================================================

    /**
     * TC-A-04: Valid code returns user, sessionToken, and success:true
     */
    test("TC-A-04: valid OAuth code should return user data and sessionToken", async () => {
        const response = await executeGraphQL(AUTHENTICATE_WITH_GOOGLE, {
            code: "valid_google_code_xyz123",
        })
        const result = await parseGraphQLResponse<{
            authenticateWithGoogle: {
                user: { id: string; email: string }
                success: boolean
                message: string
                sessionToken: string
            }
        }>(response)

        expect(response.status).toBe(200)
        expect(result.errors).toBeUndefined()
        expect(result.data?.authenticateWithGoogle.success).toBe(true)
        expect(result.data?.authenticateWithGoogle.user.email).toBe("test@example.com")
        expect(result.data?.authenticateWithGoogle.sessionToken).toBeDefined()
    })

    /**
     * TC-A-05: Invalid code returns INVALID_OAUTH_CODE (statusCode 401)
     */
    test("TC-A-05: invalid OAuth code should return INVALID_OAUTH_CODE error", async () => {
        const response = await executeGraphQL(AUTHENTICATE_WITH_GOOGLE, {
            code: "invalid_code_12345",
        })
        const result = await parseGraphQLResponse(response)

        expect(result.errors).toBeDefined()
        expect(result.errors).toHaveLength(1)

        const error = result.errors?.[0]
        expect(error?.message).toContain("Invalid OAuth code")
        expect(error?.extensions?.code).toBe("INVALID_OAUTH_CODE")
        expect(error?.extensions?.statusCode).toBe(401)
    })

    /**
     * TC-A-06: Empty string code returns BAD_REQUEST (statusCode 400)
     *
     * Edge case: client sends an empty string rather than omitting the field.
     * The mutation validates non-empty before calling the service layer.
     */
    test("TC-A-06: empty code should return BAD_REQUEST error", async () => {
        const response = await executeGraphQL(AUTHENTICATE_WITH_GOOGLE, { code: "" })
        const result = await parseGraphQLResponse(response)

        expect(result.errors).toBeDefined()
        expect(result.errors).toHaveLength(1)

        const error = result.errors?.[0]
        expect(error?.extensions?.code).toBe("BAD_REQUEST")
        expect(error?.extensions?.statusCode).toBe(400)
    })

    /**
     * TC-A-07: Same code used twice returns same userId (idempotent upsert)
     *
     * The service layer looks up the user by email before creating, so a second
     * login with the same OAuth identity must not create a duplicate user row.
     */
    test("TC-A-07: repeated OAuth login with same code should return same userId", async () => {
        const query = `
            mutation AuthenticateWithGoogle($code: String!) {
                authenticateWithGoogle(code: $code) {
                    user { id }
                }
            }
        `

        const r1 = await executeGraphQL(query, { code: "same_google_code_abc" })
        const r2 = await executeGraphQL(query, { code: "same_google_code_abc" })

        const j1 = await parseGraphQLResponse<{
            authenticateWithGoogle: { user: { id: string } }
        }>(r1)
        const j2 = await parseGraphQLResponse<{
            authenticateWithGoogle: { user: { id: string } }
        }>(r2)

        expect(j1.data?.authenticateWithGoogle.user.id).toBe(
            j2.data?.authenticateWithGoogle.user.id
        )

        const users = await testPrisma.user.findMany({ where: { email: "same@example.com" } })
        expect(users).toHaveLength(1)
    })

    /**
     * TC-A-08: Successful auth persists a non-expired session row in the DB
     */
    test("TC-A-08: successful auth should persist a valid session in the database", async () => {
        const response = await executeGraphQL(AUTHENTICATE_WITH_GOOGLE, {
            code: "session_test_code_123",
        })
        const result = await parseGraphQLResponse<{
            authenticateWithGoogle: {
                user: { id: string }
                sessionToken: string
            }
        }>(response)

        const { sessionToken, user } = result.data?.authenticateWithGoogle ?? {
            sessionToken: "",
            user: { id: "" },
        }

        const session = await testPrisma.session.findUnique({ where: { sessionToken } })
        expect(session).toBeDefined()
        expect(session?.userId).toBe(user.id)
        expect(session?.expires.getTime()).toBeGreaterThan(Date.now())
    })

    // =========================================================================
    // Session-based Authentication
    // =========================================================================

    /**
     * TC-A-09: Valid session cookie allows authenticated GraphQL queries
     *
     * End-to-end path: login → get sessionToken → use as cookie → me query succeeds.
     */
    test("TC-A-09: valid session cookie should allow authenticated GraphQL queries", async () => {
        const loginResponse = await executeGraphQL(AUTHENTICATE_WITH_GOOGLE, {
            code: "auth_test_code_456",
        })
        const loginResult = await parseGraphQLResponse<{
            authenticateWithGoogle: { user: { id: string }; sessionToken: string }
        }>(loginResponse)

        const { sessionToken } = loginResult.data?.authenticateWithGoogle ?? { sessionToken: "" }

        const meResponse = await executeGraphQL(ME_QUERY, undefined, sessionToken)
        const meResult = await parseGraphQLResponse<{ me: { id: string; email: string } }>(
            meResponse
        )

        expect(meResult.errors).toBeUndefined()
        expect(meResult.data?.me.email).toBe("auth@example.com")
    })

    /**
     * TC-A-10: Expired session cookie is rejected — me query returns UNAUTHENTICATED
     *
     * verifySession checks `session.expires < new Date()` before returning userId.
     * An expired session must cause requireAuth to throw UNAUTHENTICATED.
     */
    test("TC-A-10: expired session cookie should be rejected with UNAUTHENTICATED", async () => {
        const user = await testPrisma.user.create({
            data: {
                email: `auth-expired-${Date.now()}@example.com`,
                name: "Expired Session User",
                emailVerified: new Date(),
            },
        })

        const expiredToken = `expired-session-${Date.now()}`
        await testPrisma.session.create({
            data: {
                userId: user.id,
                sessionToken: expiredToken,
                expires: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            },
        })

        const response = await executeGraphQL(ME_QUERY, undefined, expiredToken)
        const result = await parseGraphQLResponse(response)

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED")
    })

    /**
     * TC-A-11: Non-existent session token is rejected — me query returns UNAUTHENTICATED
     *
     * Verifies that a token not present in the database is treated as unauthorized
     * rather than causing a server error.
     */
    test("TC-A-11: non-existent session token should be rejected with UNAUTHENTICATED", async () => {
        const fakeToken = `fake-token-${Date.now()}`

        const response = await executeGraphQL(ME_QUERY, undefined, fakeToken)
        const result = await parseGraphQLResponse(response)

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED")
    })

    /**
     * TC-A-12: Missing session cookie is rejected — me query returns UNAUTHENTICATED
     *
     * Calling executeGraphQL without a sessionToken omits the cookie header entirely.
     * requireAuth must throw UNAUTHENTICATED when there is no session.
     */
    test("TC-A-12: missing session cookie should be rejected with UNAUTHENTICATED", async () => {
        const response = await executeGraphQL(ME_QUERY)
        const result = await parseGraphQLResponse(response)

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED")
    })
})
