/**
 * Friends Integration Tests (Feature 1.2.1)
 *
 * Tests GraphQL resolvers for friend search and friend request management.
 *
 * TC-B-01: searchUsers returns matching users by name
 * TC-B-02: searchUsers returns matching users by email
 * TC-B-03: searchUsers excludes the current user from results
 * TC-B-04: searchUsers returns empty array for query shorter than 2 chars
 * TC-B-05: sendFriendRequest creates a PENDING friendship record
 * TC-B-06: sendFriendRequest returns CONFLICT error when request already exists
 * TC-B-07: sendFriendRequest returns BAD_REQUEST when sending to self
 * TC-B-08: acceptFriendRequest updates status to ACCEPTED and returns Friendship
 * TC-B-09: acceptFriendRequest returns FORBIDDEN when requester tries to accept own request
 * TC-B-10: rejectFriendRequest returns true and sets status to REJECTED
 * TC-B-11: cancelFriendRequest deletes the PENDING record and returns true
 * TC-B-12: friends query returns only ACCEPTED friendships
 * TC-B-13: pendingFriendRequests and sentFriendRequests return separate sets
 * TC-B-14: friends query returns UNAUTHENTICATED error when no session
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { PrismaClient } from "@generated/prisma/client"
import { createTestPrismaClient } from "@tests/fixtures/prisma"
import { executeGraphQL, parseGraphQLResponse } from "@tests/fixtures/graphql"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ALICE = { id: "user-alice", email: "alice@test.com", name: "Alice Chen" }
const USER_BOB = { id: "user-bob", email: "bob@test.com", name: "Bob Wang" }
const USER_CAROL = { id: "user-carol", email: "carol@test.com", name: "Carol Lin" }

/** Create a session token for a user and persist it to the DB. */
async function createSession(prisma: PrismaClient, userId: string): Promise<string> {
    const token = `session-${userId}-${Date.now()}`
    await prisma.session.create({
        data: {
            userId,
            sessionToken: token,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
    })
    return token
}

/** Seed the three test users. */
async function seedUsers(prisma: PrismaClient): Promise<void> {
    for (const u of [USER_ALICE, USER_BOB, USER_CAROL]) {
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

/** Create a PENDING friendship (sender sends to receiver). */
async function createPendingFriendship(
    prisma: PrismaClient,
    senderId: string,
    receiverId: string
): Promise<{ id: string }> {
    const [userId1, userId2] =
        senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId]

    return prisma.friendship.create({
        data: {
            userId1,
            userId2,
            status: "PENDING",
            requestedBy: senderId,
        },
    })
}

/** Create an ACCEPTED friendship. */
async function createAcceptedFriendship(
    prisma: PrismaClient,
    userAId: string,
    userBId: string
): Promise<{ id: string }> {
    const [userId1, userId2] =
        userAId < userBId ? [userAId, userBId] : [userBId, userAId]

    return prisma.friendship.create({
        data: {
            userId1,
            userId2,
            status: "ACCEPTED",
            requestedBy: userAId,
        },
    })
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

async function mutation(gql: string, variables: Record<string, unknown>, token?: string): Promise<GQLResult> {
    const res = await executeGraphQL(gql, variables, token)
    return parseGraphQLResponse(res) as Promise<GQLResult>
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Feature 1.2.1 - Friends (Backend)", () => {
    let prisma: PrismaClient

    beforeEach(async () => {
        prisma = createTestPrismaClient()
        await seedUsers(prisma)
    })

    afterEach(async () => {
        // Clean up in FK-safe order
        await prisma.friendship.deleteMany()
        await prisma.session.deleteMany()
        await prisma.account.deleteMany()
        await prisma.verification.deleteMany()
        await prisma.user.deleteMany({
            where: { id: { in: [USER_ALICE.id, USER_BOB.id, USER_CAROL.id] } },
        })
        await prisma.$disconnect()
    })

    // -----------------------------------------------------------------------
    // TC-B-01: searchUsers by name
    // -----------------------------------------------------------------------
    test("TC-B-01: searchUsers returns matching users by name", async () => {
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await query(
            `query { searchUsers(query: "Bob") { id name email } }`,
            token
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.searchUsers).toBeDefined()
        const users = result.data?.searchUsers as Array<{ id: string; name: string }>
        expect(users).toHaveLength(1)
        expect(users[0].name).toBe("Bob Wang")
        expect(users[0].id).toBe(USER_BOB.id)
    })

    // -----------------------------------------------------------------------
    // TC-B-02: searchUsers by email
    // -----------------------------------------------------------------------
    test("TC-B-02: searchUsers returns matching users by email", async () => {
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await query(
            `query { searchUsers(query: "carol@test") { id name email } }`,
            token
        )

        expect(result.errors).toBeUndefined()
        const users = result.data?.searchUsers as Array<{ email: string }>
        expect(users).toHaveLength(1)
        expect(users[0].email).toBe("carol@test.com")
    })

    // -----------------------------------------------------------------------
    // TC-B-03: searchUsers excludes self
    // -----------------------------------------------------------------------
    test("TC-B-03: searchUsers excludes the current user from results", async () => {
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await query(
            `query { searchUsers(query: "alice") { id name } }`,
            token
        )

        expect(result.errors).toBeUndefined()
        const users = result.data?.searchUsers as unknown[]
        expect(users).toHaveLength(0)
    })

    // -----------------------------------------------------------------------
    // TC-B-04: searchUsers returns [] for short query
    // -----------------------------------------------------------------------
    test("TC-B-04: searchUsers returns empty array for query shorter than 2 chars", async () => {
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await query(
            `query { searchUsers(query: "a") { id } }`,
            token
        )

        expect(result.errors).toBeUndefined()
        const users = result.data?.searchUsers as unknown[]
        expect(users).toHaveLength(0)
    })

    // -----------------------------------------------------------------------
    // TC-B-05: sendFriendRequest creates PENDING record
    // -----------------------------------------------------------------------
    test("TC-B-05: sendFriendRequest creates a PENDING friendship record", async () => {
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await mutation(
            `mutation SendReq($userId: ID!) {
              sendFriendRequest(userId: $userId) {
                id
                status
                sender { id name }
                receiver { id name }
              }
            }`,
            { userId: USER_BOB.id },
            token
        )

        expect(result.errors).toBeUndefined()
        const req = result.data?.sendFriendRequest as {
            id: string
            status: string
            sender: { id: string }
            receiver: { id: string }
        }
        expect(req.status).toBe("PENDING")
        expect(req.sender.id).toBe(USER_ALICE.id)
        expect(req.receiver.id).toBe(USER_BOB.id)

        const friendship = await prisma.friendship.findFirst({
            where: { requestedBy: USER_ALICE.id, status: "PENDING" },
        })
        expect(friendship).not.toBeNull()
    })

    // -----------------------------------------------------------------------
    // TC-B-06: sendFriendRequest duplicate → CONFLICT
    // -----------------------------------------------------------------------
    test("TC-B-06: sendFriendRequest returns CONFLICT error when request already exists", async () => {
        await createPendingFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await mutation(
            `mutation { sendFriendRequest(userId: "${USER_BOB.id}") { id } }`,
            {},
            token
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0].extensions?.code).toBe("CONFLICT")
        expect(result.errors![0].extensions?.status).toBe(409)
    })

    // -----------------------------------------------------------------------
    // TC-B-07: sendFriendRequest to self → BAD_REQUEST
    // -----------------------------------------------------------------------
    test("TC-B-07: sendFriendRequest returns BAD_REQUEST when sending to self", async () => {
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await mutation(
            `mutation { sendFriendRequest(userId: "${USER_ALICE.id}") { id } }`,
            {},
            token
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0].extensions?.code).toBe("BAD_REQUEST")
        expect(result.errors![0].extensions?.status).toBe(400)
    })

    // -----------------------------------------------------------------------
    // TC-B-08: acceptFriendRequest → ACCEPTED
    // -----------------------------------------------------------------------
    test("TC-B-08: acceptFriendRequest updates status to ACCEPTED and returns Friendship", async () => {
        const friendship = await createPendingFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const token = await createSession(prisma, USER_BOB.id)

        const result = await mutation(
            `mutation AcceptReq($requestId: ID!) {
              acceptFriendRequest(requestId: $requestId) {
                id
                friend { id name }
                since
              }
            }`,
            { requestId: friendship.id },
            token
        )

        expect(result.errors).toBeUndefined()
        const accepted = result.data?.acceptFriendRequest as { friend: { id: string }; since: string }
        expect(accepted.friend.id).toBe(USER_ALICE.id)

        const updated = await prisma.friendship.findUnique({ where: { id: friendship.id } })
        expect(updated?.status).toBe("ACCEPTED")
    })

    // -----------------------------------------------------------------------
    // TC-B-09: acceptFriendRequest by sender → FORBIDDEN
    // -----------------------------------------------------------------------
    test("TC-B-09: acceptFriendRequest returns FORBIDDEN when requester tries to accept own request", async () => {
        const friendship = await createPendingFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await mutation(
            `mutation { acceptFriendRequest(requestId: "${friendship.id}") { id } }`,
            {},
            token
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0].extensions?.code).toBe("FORBIDDEN")
        expect(result.errors![0].extensions?.status).toBe(403)
    })

    // -----------------------------------------------------------------------
    // TC-B-10: rejectFriendRequest → REJECTED
    // -----------------------------------------------------------------------
    test("TC-B-10: rejectFriendRequest returns true and sets status to REJECTED", async () => {
        const friendship = await createPendingFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const token = await createSession(prisma, USER_BOB.id)

        const result = await mutation(
            `mutation { rejectFriendRequest(requestId: "${friendship.id}") }`,
            {},
            token
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.rejectFriendRequest).toBe(true)

        const updated = await prisma.friendship.findUnique({ where: { id: friendship.id } })
        expect(updated?.status).toBe("REJECTED")
    })

    // -----------------------------------------------------------------------
    // TC-B-11: cancelFriendRequest → deleted
    // -----------------------------------------------------------------------
    test("TC-B-11: cancelFriendRequest deletes the PENDING record and returns true", async () => {
        const friendship = await createPendingFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await mutation(
            `mutation { cancelFriendRequest(requestId: "${friendship.id}") }`,
            {},
            token
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.cancelFriendRequest).toBe(true)

        const deleted = await prisma.friendship.findUnique({ where: { id: friendship.id } })
        expect(deleted).toBeNull()
    })

    // -----------------------------------------------------------------------
    // TC-B-12: friends returns only ACCEPTED friendships
    // -----------------------------------------------------------------------
    test("TC-B-12: friends query returns only ACCEPTED friendships", async () => {
        await createAcceptedFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        await createPendingFriendship(prisma, USER_ALICE.id, USER_CAROL.id)
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await query(
            `query { friends { id name } }`,
            token
        )

        expect(result.errors).toBeUndefined()
        const friends = result.data?.friends as Array<{ id: string }>
        expect(friends).toHaveLength(1)
        expect(friends[0].id).toBe(USER_BOB.id)
    })

    // -----------------------------------------------------------------------
    // TC-B-13: pendingFriendRequests vs sentFriendRequests
    // -----------------------------------------------------------------------
    test("TC-B-13: pendingFriendRequests returns only received PENDING requests", async () => {
        await createPendingFriendship(prisma, USER_BOB.id, USER_ALICE.id)
        await createPendingFriendship(prisma, USER_CAROL.id, USER_ALICE.id)
        const token = await createSession(prisma, USER_ALICE.id)

        const pendingResult = await query(
            `query { pendingFriendRequests { id sender { id } } }`,
            token
        )
        expect(pendingResult.errors).toBeUndefined()
        const pending = pendingResult.data?.pendingFriendRequests as unknown[]
        expect(pending).toHaveLength(2)

        const sentResult = await query(
            `query { sentFriendRequests { id receiver { id } } }`,
            token
        )
        expect(sentResult.errors).toBeUndefined()
        const sent = sentResult.data?.sentFriendRequests as unknown[]
        expect(sent).toHaveLength(0)
    })

    // -----------------------------------------------------------------------
    // TC-B-14: unauthenticated friends → UNAUTHENTICATED
    // -----------------------------------------------------------------------
    test("TC-B-14: friends query returns UNAUTHENTICATED error when no session", async () => {
        const result = await query(`query { friends { id } }`)

        expect(result.errors).toBeDefined()
        expect(result.errors![0].extensions?.code).toBe("UNAUTHENTICATED")
        expect(result.errors![0].extensions?.status).toBe(401)
    })
})
