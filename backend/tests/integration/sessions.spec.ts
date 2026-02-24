/**
 * Sessions Integration Tests (Feature 1.1.2)
 *
 * Tests GraphQL resolvers for session management.
 *
 * TC-B-01: sessions query returns all active sessions for the current user
 * TC-B-02: sessions query returns UNAUTHENTICATED when not logged in
 * TC-B-03: revokeSession deletes the specified session and returns true
 * TC-B-04: revokeSession returns FORBIDDEN when trying to revoke own current session
 * TC-B-05: revokeAllSessions deletes all sessions except the current one
 * TC-B-06: sessions query excludes expired sessions
 * TC-B-07: revokeSession returns NOT_FOUND for non-existent session
 * TC-B-08: sessions query returns only the current user sessions, not other users
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { PrismaClient } from "@generated/prisma/client"
import { createTestPrismaClient } from "@tests/fixtures/prisma"
import { executeGraphQL, parseGraphQLResponse } from "@tests/fixtures/graphql"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ALICE = { id: "user-alice-sess", email: "alice-sess@test.com", name: "Alice Chen" }
const USER_BOB = { id: "user-bob-sess", email: "bob-sess@test.com", name: "Bob Wang" }

/** Seed the test users. */
async function seedUsers(prisma: PrismaClient): Promise<void> {
    for (const u of [USER_ALICE, USER_BOB]) {
        await prisma.user.upsert({
            where: { id: u.id },
            update: {},
            create: {
                id: u.id,
                email: u.email,
                name: u.name,
                emailVerified: new Date(),
            },
        })
    }
}

/**
 * Create an active session (expires 7 days from now).
 * Returns the raw token string for use as a cookie.
 */
async function createSession(prisma: PrismaClient, userId: string): Promise<string> {
    const token = `session-${userId}-${Date.now()}-${Math.random()}`
    await prisma.session.create({
        data: {
            userId,
            sessionToken: token,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
    })
    return token
}

/**
 * Create an active session and return the full record (for accessing session.id).
 */
async function createSessionRecord(
    prisma: PrismaClient,
    userId: string
): Promise<{ id: string; sessionToken: string }> {
    const token = `session-${userId}-${Date.now()}-${Math.random()}`
    return prisma.session.create({
        data: {
            userId,
            sessionToken: token,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
    })
}

/** Create an already-expired session. */
async function createExpiredSession(prisma: PrismaClient, userId: string): Promise<string> {
    const token = `expired-${userId}-${Date.now()}`
    await prisma.session.create({
        data: {
            userId,
            sessionToken: token,
            expires: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        },
    })
    return token
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GQLResult = {
    data?: Record<string, unknown>
    errors?: Array<{ message: string; extensions?: Record<string, unknown> }>
}

async function query(gql: string, token?: string): Promise<GQLResult> {
    const res = await executeGraphQL(gql, undefined, token)
    return parseGraphQLResponse(res) as Promise<GQLResult>
}

async function mutation(
    gql: string,
    variables: Record<string, unknown>,
    token?: string
): Promise<GQLResult> {
    const res = await executeGraphQL(gql, variables, token)
    return parseGraphQLResponse(res) as Promise<GQLResult>
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Feature 1.1.2 - Session Management (Backend)", () => {
    let prisma: PrismaClient

    beforeEach(async () => {
        prisma = createTestPrismaClient()
        await seedUsers(prisma)
    })

    afterEach(async () => {
        await prisma.session.deleteMany({
            where: {
                userId: { in: [USER_ALICE.id, USER_BOB.id] },
            },
        })
        await prisma.account.deleteMany()
        await prisma.user.deleteMany({
            where: { id: { in: [USER_ALICE.id, USER_BOB.id] } },
        })
        await prisma.$disconnect()
    })

    // -----------------------------------------------------------------------
    // TC-B-01: sessions returns all active sessions
    // -----------------------------------------------------------------------
    test("TC-B-01: sessions query returns all active sessions for the current user", async () => {
        const currentToken = await createSession(prisma, USER_ALICE.id)
        await createSession(prisma, USER_ALICE.id) // second device

        const result = await query(`query { sessions { id expiresAt isCurrent } }`, currentToken)

        expect(result.errors).toBeUndefined()
        const sessions = result.data?.sessions as Array<{
            id: string
            expiresAt: string
            isCurrent: boolean
        }>
        expect(sessions).toHaveLength(2)

        // Exactly one session should be current
        const currentSessions = sessions.filter((s) => s.isCurrent)
        expect(currentSessions).toHaveLength(1)

        // The other one should not be current
        const otherSessions = sessions.filter((s) => !s.isCurrent)
        expect(otherSessions).toHaveLength(1)
    })

    // -----------------------------------------------------------------------
    // TC-B-02: sessions — unauthenticated → UNAUTHENTICATED
    // -----------------------------------------------------------------------
    test("TC-B-02: sessions query returns UNAUTHENTICATED when not logged in", async () => {
        const result = await query(`query { sessions { id } }`)

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED")
        expect(result.errors?.[0]?.extensions?.status).toBe(401)
    })

    // -----------------------------------------------------------------------
    // TC-B-03: revokeSession — success
    // -----------------------------------------------------------------------
    test("TC-B-03: revokeSession deletes the specified session and returns true", async () => {
        const currentToken = await createSession(prisma, USER_ALICE.id)
        const otherSession = await createSessionRecord(prisma, USER_ALICE.id)

        const result = await mutation(
            `mutation RevokeSession($sessionId: ID!) {
              revokeSession(sessionId: $sessionId)
            }`,
            { sessionId: otherSession.id },
            currentToken
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.revokeSession).toBe(true)

        const deleted = await prisma.session.findUnique({ where: { id: otherSession.id } })
        expect(deleted).toBeNull()
    })

    // -----------------------------------------------------------------------
    // TC-B-04: revokeSession — cannot revoke own current session
    // -----------------------------------------------------------------------
    test("TC-B-04: revokeSession returns FORBIDDEN when trying to revoke own current session", async () => {
        const currentToken = await createSession(prisma, USER_ALICE.id)
        const currentSession = await prisma.session.findUnique({
            where: { sessionToken: currentToken },
        })

        const result = await mutation(
            `mutation { revokeSession(sessionId: "${currentSession?.id}") }`,
            {},
            currentToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("FORBIDDEN")
        expect(result.errors?.[0]?.extensions?.status).toBe(403)
    })

    // -----------------------------------------------------------------------
    // TC-B-05: revokeAllSessions — keeps current, removes others
    // -----------------------------------------------------------------------
    test("TC-B-05: revokeAllSessions deletes all sessions except the current one", async () => {
        const currentToken = await createSession(prisma, USER_ALICE.id)
        await createSession(prisma, USER_ALICE.id)
        await createSession(prisma, USER_ALICE.id)

        const result = await mutation(`mutation { revokeAllSessions }`, {}, currentToken)

        expect(result.errors).toBeUndefined()
        expect(result.data?.revokeAllSessions).toBe(true)

        const remaining = await prisma.session.findMany({
            where: { userId: USER_ALICE.id },
        })
        expect(remaining).toHaveLength(1)
        expect(remaining[0]?.sessionToken).toBe(currentToken)
    })

    // -----------------------------------------------------------------------
    // TC-B-06: sessions — excludes expired sessions
    // -----------------------------------------------------------------------
    test("TC-B-06: sessions query excludes expired sessions", async () => {
        const currentToken = await createSession(prisma, USER_ALICE.id)
        await createExpiredSession(prisma, USER_ALICE.id) // should NOT appear

        const result = await query(`query { sessions { id isCurrent } }`, currentToken)

        expect(result.errors).toBeUndefined()
        const sessions = result.data?.sessions as unknown[]
        expect(sessions).toHaveLength(1)
    })

    // -----------------------------------------------------------------------
    // TC-B-07: revokeSession — non-existent session → NOT_FOUND
    // -----------------------------------------------------------------------
    test("TC-B-07: revokeSession returns NOT_FOUND for non-existent session", async () => {
        const currentToken = await createSession(prisma, USER_ALICE.id)

        const result = await mutation(
            `mutation { revokeSession(sessionId: "non-existent-session-id") }`,
            {},
            currentToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("NOT_FOUND")
        expect(result.errors?.[0]?.extensions?.status).toBe(404)
    })

    // -----------------------------------------------------------------------
    // TC-B-08: sessions — only returns current user's sessions
    // -----------------------------------------------------------------------
    test("TC-B-08: sessions query returns only the current user sessions, not other users", async () => {
        const aliceToken = await createSession(prisma, USER_ALICE.id)
        await createSession(prisma, USER_BOB.id) // Bob's session, should NOT appear for Alice

        const result = await query(`query { sessions { id } }`, aliceToken)

        expect(result.errors).toBeUndefined()
        const sessions = result.data?.sessions as unknown[]
        expect(sessions).toHaveLength(1)
    })
})
