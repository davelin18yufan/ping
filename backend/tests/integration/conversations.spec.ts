/**
 * Conversations Integration Tests (Feature 1.3.1)
 *
 * Tests GraphQL resolvers for conversation management, group chats, and blacklist.
 *
 * TC-B-01: getOrCreateConversation with friend creates 1-on-1 conversation
 * TC-B-02: getOrCreateConversation is idempotent (returns existing conversation)
 * TC-B-03: getOrCreateConversation with non-friend returns FORBIDDEN
 * TC-B-04: createGroupConversation succeeds with creator as OWNER
 * TC-B-05: createGroupConversation with non-friend returns FORBIDDEN
 * TC-B-06: inviteToGroup allows member to invite own friend (not creator's friend)
 * TC-B-07: inviteToGroup with non-friend returns FORBIDDEN
 * TC-B-08: inviteToGroup with onlyOwnerCanInvite=true, non-OWNER returns FORBIDDEN
 * TC-B-09: removeFromGroup - OWNER can kick a MEMBER
 * TC-B-10: removeFromGroup - kicked member can be re-invited
 * TC-B-11: removeFromGroup - non-OWNER cannot kick when onlyOwnerCanKick=true
 * TC-B-12: leaveGroup - OWNER with successor transfers ownership and leaves
 * TC-B-13: leaveGroup - OWNER without successorUserId returns BAD_REQUEST
 * TC-B-14: leaveGroup - OWNER as last member dissolves the group
 * TC-B-15: updateGroupSettings - updates name and permission settings
 * TC-B-16: pinConversation / unpinConversation toggles pinnedAt
 * TC-B-17: conversations sorted: pinned first, then by latest message time
 * TC-B-18: conversation(id) participants include viewer-dependent isFriend
 * TC-B-19: sendMessage creates message successfully
 * TC-B-20: messages returns cursor-based pagination with nextCursor
 * TC-B-21: blockUser blocks user and removes friendship
 * TC-B-22: all operations without auth return UNAUTHENTICATED
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { PrismaClient } from "@generated/prisma/client"
import { createTestPrismaClient } from "@tests/fixtures/prisma"
import { executeGraphQL, parseGraphQLResponse } from "@tests/fixtures/graphql"

// ---------------------------------------------------------------------------
// Test user fixtures
// ---------------------------------------------------------------------------

const USER_ALICE = { id: "conv-alice", email: "conv-alice@test.com", name: "Alice Chen" }
const USER_BOB = { id: "conv-bob", email: "conv-bob@test.com", name: "Bob Wang" }
const USER_CAROL = { id: "conv-carol", email: "conv-carol@test.com", name: "Carol Lin" }
const USER_DAVE = { id: "conv-dave", email: "conv-dave@test.com", name: "Dave Huang" }
const USER_EVE = { id: "conv-eve", email: "conv-eve@test.com", name: "Eve Liu" }

const ALL_USERS = [USER_ALICE, USER_BOB, USER_CAROL, USER_DAVE, USER_EVE]

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedUsers(prisma: PrismaClient): Promise<void> {
    for (const u of ALL_USERS) {
        await prisma.user.upsert({
            where: { id: u.id },
            update: {},
            create: { id: u.id, email: u.email, name: u.name, emailVerified: new Date() },
        })
    }
}

async function createSession(prisma: PrismaClient, userId: string): Promise<string> {
    const token = `conv-session-${userId}-${Date.now()}`
    await prisma.session.create({
        data: {
            userId,
            sessionToken: token,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
    })
    return token
}

async function createFriendship(
    prisma: PrismaClient,
    userAId: string,
    userBId: string
): Promise<void> {
    const [userId1, userId2] = userAId < userBId ? [userAId, userBId] : [userBId, userAId]
    await prisma.friendship.upsert({
        where: { userId1_userId2: { userId1, userId2 } },
        update: { status: "ACCEPTED" },
        create: { userId1, userId2, status: "ACCEPTED", requestedBy: userAId },
    })
}

async function createOneToOneConversation(
    prisma: PrismaClient,
    userAId: string,
    userBId: string
): Promise<string> {
    const conv = await prisma.conversation.create({
        data: {
            type: "ONE_TO_ONE",
            participants: {
                create: [
                    { userId: userAId, role: "MEMBER" },
                    { userId: userBId, role: "MEMBER" },
                ],
            },
        },
    })
    return conv.id
}

async function createGroupConversation(
    prisma: PrismaClient,
    ownerId: string,
    memberIds: string[],
    name = "Test Group"
): Promise<string> {
    const conv = await prisma.conversation.create({
        data: {
            type: "GROUP",
            name,
            participants: {
                create: [
                    { userId: ownerId, role: "OWNER" },
                    ...memberIds.map((uid) => ({ userId: uid, role: "MEMBER" as const })),
                ],
            },
        },
    })
    return conv.id
}

async function createMessage(
    prisma: PrismaClient,
    conversationId: string,
    senderId: string,
    content: string,
    createdAt?: Date
): Promise<string> {
    const msg = await prisma.message.create({
        data: {
            conversationId,
            senderId,
            content,
            messageType: "TEXT",
            createdAt: createdAt ?? new Date(),
        },
    })
    return msg.id
}

// ---------------------------------------------------------------------------
// GraphQL helpers
// ---------------------------------------------------------------------------

type GQLResult = {
    data?: Record<string, unknown>
    errors?: Array<{ message: string; extensions?: Record<string, unknown> }>
}

async function gql(query: string, token?: string): Promise<GQLResult> {
    const res = await executeGraphQL(query, undefined, token)
    return parseGraphQLResponse(res) as Promise<GQLResult>
}

async function gqlMutation(
    query: string,
    variables: Record<string, unknown>,
    token?: string
): Promise<GQLResult> {
    const res = await executeGraphQL(query, variables, token)
    return parseGraphQLResponse(res) as Promise<GQLResult>
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Feature 1.3.1 - Conversations (Backend)", () => {
    let prisma: PrismaClient

    beforeEach(async () => {
        prisma = createTestPrismaClient()
        await seedUsers(prisma)
    })

    afterEach(async () => {
        // Clean up in FK-safe order
        await prisma.blacklist.deleteMany()
        await prisma.messageStatus.deleteMany()
        await prisma.message.deleteMany()
        await prisma.conversationParticipant.deleteMany()
        await prisma.conversation.deleteMany()
        await prisma.friendship.deleteMany()
        await prisma.session.deleteMany()
        await prisma.account.deleteMany()
        await prisma.user.deleteMany({
            where: { id: { in: ALL_USERS.map((u) => u.id) } },
        })
        await prisma.$disconnect()
    })

    // -------------------------------------------------------------------------
    // TC-B-01: getOrCreateConversation with friend
    // -------------------------------------------------------------------------
    test("TC-B-01: getOrCreateConversation with friend creates 1-on-1 conversation", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation GetOrCreate($userId: ID!) {
                getOrCreateConversation(userId: $userId) {
                    id type
                    participants { user { id } role }
                }
            }`,
            { userId: USER_BOB.id },
            token
        )

        expect(result.errors).toBeUndefined()
        const conv = result.data?.getOrCreateConversation as {
            id: string
            type: string
            participants: Array<{ user: { id: string }; role: string }>
        }
        expect(conv.type).toBe("ONE_TO_ONE")
        expect(conv.participants).toHaveLength(2)
        const ids = conv.participants.map((p) => p.user.id)
        expect(ids).toContain(USER_ALICE.id)
        expect(ids).toContain(USER_BOB.id)
    })

    // -------------------------------------------------------------------------
    // TC-B-02: getOrCreateConversation idempotent
    // -------------------------------------------------------------------------
    test("TC-B-02: getOrCreateConversation is idempotent (returns existing conversation)", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const token = await createSession(prisma, USER_ALICE.id)

        const mutation = `mutation GetOrCreate($userId: ID!) {
            getOrCreateConversation(userId: $userId) { id }
        }`

        const first = await gqlMutation(mutation, { userId: USER_BOB.id }, token)
        const second = await gqlMutation(mutation, { userId: USER_BOB.id }, token)

        const firstId = (first.data!.getOrCreateConversation as { id: string }).id
        const secondId = (second.data!.getOrCreateConversation as { id: string }).id

        expect(firstId).toBe(secondId)

        // Verify only one conversation exists in DB
        const count = await prisma.conversation.count({
            where: {
                type: "ONE_TO_ONE",
                AND: [
                    { participants: { some: { userId: USER_ALICE.id } } },
                    { participants: { some: { userId: USER_BOB.id } } },
                ],
            },
        })
        expect(count).toBe(1)
    })

    // -------------------------------------------------------------------------
    // TC-B-03: getOrCreateConversation non-friend FORBIDDEN
    // -------------------------------------------------------------------------
    test("TC-B-03: getOrCreateConversation with non-friend returns FORBIDDEN", async () => {
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation { getOrCreateConversation(userId: "${USER_CAROL.id}") { id } }`,
            {},
            token
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0]!.extensions?.code).toBe("FORBIDDEN")
    })

    // -------------------------------------------------------------------------
    // TC-B-04: createGroupConversation — Creator=OWNER
    // -------------------------------------------------------------------------
    test("TC-B-04: createGroupConversation succeeds with creator as OWNER", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        await createFriendship(prisma, USER_ALICE.id, USER_CAROL.id)
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation CreateGroup($name: String!, $userIds: [ID!]!) {
                createGroupConversation(name: $name, userIds: $userIds) {
                    id type name
                    participants { user { id } role }
                }
            }`,
            { name: "Alpha Group", userIds: [USER_BOB.id, USER_CAROL.id] },
            token
        )

        expect(result.errors).toBeUndefined()
        const conv = result.data?.createGroupConversation as {
            id: string
            type: string
            name: string
            participants: Array<{ user: { id: string }; role: string }>
        }
        expect(conv.type).toBe("GROUP")
        expect(conv.name).toBe("Alpha Group")
        expect(conv.participants).toHaveLength(3)

        const aliceParticipant = conv.participants.find((p) => p.user.id === USER_ALICE.id)
        expect(aliceParticipant?.role).toBe("OWNER")

        const bobParticipant = conv.participants.find((p) => p.user.id === USER_BOB.id)
        expect(bobParticipant?.role).toBe("MEMBER")
    })

    // -------------------------------------------------------------------------
    // TC-B-05: createGroupConversation with non-friend FORBIDDEN
    // -------------------------------------------------------------------------
    test("TC-B-05: createGroupConversation with non-friend returns FORBIDDEN", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        // Dave is NOT Alice's friend
        const token = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation CreateGroup($name: String!, $userIds: [ID!]!) {
                createGroupConversation(name: $name, userIds: $userIds) { id }
            }`,
            { name: "Bad Group", userIds: [USER_BOB.id, USER_DAVE.id] },
            token
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0]!.extensions?.code).toBe("FORBIDDEN")
    })

    // -------------------------------------------------------------------------
    // TC-B-06: inviteToGroup — member can invite own friend
    // -------------------------------------------------------------------------
    test("TC-B-06: inviteToGroup allows member to invite own friend (not creator's friend)", async () => {
        // Setup: Alice ↔ Bob (friends). Bob ↔ Dave (friends). Alice and Dave NOT friends.
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        await createFriendship(prisma, USER_BOB.id, USER_DAVE.id)

        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [USER_BOB.id])

        const bobToken = await createSession(prisma, USER_BOB.id)

        const result = await gqlMutation(
            `mutation Invite($conversationId: ID!, $userId: ID!) {
                inviteToGroup(conversationId: $conversationId, userId: $userId) {
                    participants { user { id } }
                }
            }`,
            { conversationId: groupId, userId: USER_DAVE.id },
            bobToken
        )

        expect(result.errors).toBeUndefined()
        const conv = result.data?.inviteToGroup as {
            participants: Array<{ user: { id: string } }>
        }
        const participantIds = conv.participants.map((p) => p.user.id)
        expect(participantIds).toContain(USER_DAVE.id)
    })

    // -------------------------------------------------------------------------
    // TC-B-07: inviteToGroup — non-friend FORBIDDEN
    // -------------------------------------------------------------------------
    test("TC-B-07: inviteToGroup with non-friend returns FORBIDDEN", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        // Bob and Eve are NOT friends
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [USER_BOB.id])
        const bobToken = await createSession(prisma, USER_BOB.id)

        const result = await gqlMutation(
            `mutation Invite($conversationId: ID!, $userId: ID!) {
                inviteToGroup(conversationId: $conversationId, userId: $userId) { id }
            }`,
            { conversationId: groupId, userId: USER_EVE.id },
            bobToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0]!.extensions?.code).toBe("FORBIDDEN")
    })

    // -------------------------------------------------------------------------
    // TC-B-08: inviteToGroup — onlyOwnerCanInvite=true, non-OWNER FORBIDDEN
    // -------------------------------------------------------------------------
    test("TC-B-08: inviteToGroup with onlyOwnerCanInvite=true, non-OWNER returns FORBIDDEN", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        await createFriendship(prisma, USER_BOB.id, USER_DAVE.id)

        // Create group with onlyOwnerCanInvite=true
        const conv = await prisma.conversation.create({
            data: {
                type: "GROUP",
                name: "Restricted Group",
                onlyOwnerCanInvite: true,
                participants: {
                    create: [
                        { userId: USER_ALICE.id, role: "OWNER" },
                        { userId: USER_BOB.id, role: "MEMBER" },
                    ],
                },
            },
        })

        const bobToken = await createSession(prisma, USER_BOB.id)

        const result = await gqlMutation(
            `mutation Invite($conversationId: ID!, $userId: ID!) {
                inviteToGroup(conversationId: $conversationId, userId: $userId) { id }
            }`,
            { conversationId: conv.id, userId: USER_DAVE.id },
            bobToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0]!.extensions?.code).toBe("FORBIDDEN")
    })

    // -------------------------------------------------------------------------
    // TC-B-09: removeFromGroup — OWNER kicks MEMBER
    // -------------------------------------------------------------------------
    test("TC-B-09: removeFromGroup - OWNER can kick a MEMBER", async () => {
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [
            USER_BOB.id,
            USER_CAROL.id,
        ])
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation Remove($conversationId: ID!, $userId: ID!) {
                removeFromGroup(conversationId: $conversationId, userId: $userId)
            }`,
            { conversationId: groupId, userId: USER_BOB.id },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.removeFromGroup).toBe(true)

        const bobInGroup = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: { conversationId: groupId, userId: USER_BOB.id },
            },
        })
        expect(bobInGroup).toBeNull()
    })

    // -------------------------------------------------------------------------
    // TC-B-10: removeFromGroup — kicked member can be re-invited
    // -------------------------------------------------------------------------
    test("TC-B-10: removeFromGroup - kicked member can be re-invited", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [USER_BOB.id])
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        // Kick Bob
        await gqlMutation(
            `mutation { removeFromGroup(conversationId: "${groupId}", userId: "${USER_BOB.id}") }`,
            {},
            aliceToken
        )

        // Re-invite Bob
        const result = await gqlMutation(
            `mutation Invite($conversationId: ID!, $userId: ID!) {
                inviteToGroup(conversationId: $conversationId, userId: $userId) {
                    participants { user { id } }
                }
            }`,
            { conversationId: groupId, userId: USER_BOB.id },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const conv = result.data?.inviteToGroup as {
            participants: Array<{ user: { id: string } }>
        }
        expect(conv.participants.map((p) => p.user.id)).toContain(USER_BOB.id)
    })

    // -------------------------------------------------------------------------
    // TC-B-11: removeFromGroup — non-OWNER FORBIDDEN when onlyOwnerCanKick=true
    // -------------------------------------------------------------------------
    test("TC-B-11: removeFromGroup - non-OWNER cannot kick when onlyOwnerCanKick=true", async () => {
        // Default: onlyOwnerCanKick=true
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [
            USER_BOB.id,
            USER_CAROL.id,
        ])
        const bobToken = await createSession(prisma, USER_BOB.id)

        const result = await gqlMutation(
            `mutation Remove($conversationId: ID!, $userId: ID!) {
                removeFromGroup(conversationId: $conversationId, userId: $userId)
            }`,
            { conversationId: groupId, userId: USER_CAROL.id },
            bobToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0]!.extensions?.code).toBe("FORBIDDEN")
    })

    // -------------------------------------------------------------------------
    // TC-B-12: leaveGroup — OWNER transfers ownership and leaves
    // -------------------------------------------------------------------------
    test("TC-B-12: leaveGroup - OWNER with successor transfers ownership and leaves", async () => {
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [USER_BOB.id])
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation Leave($conversationId: ID!, $successorUserId: ID) {
                leaveGroup(conversationId: $conversationId, successorUserId: $successorUserId)
            }`,
            { conversationId: groupId, successorUserId: USER_BOB.id },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.leaveGroup).toBe(true)

        // Alice should be gone
        const alice = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: { conversationId: groupId, userId: USER_ALICE.id },
            },
        })
        expect(alice).toBeNull()

        // Bob should be OWNER
        const bob = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: { conversationId: groupId, userId: USER_BOB.id },
            },
        })
        expect(bob?.role).toBe("OWNER")
    })

    // -------------------------------------------------------------------------
    // TC-B-13: leaveGroup — OWNER without successorUserId returns BAD_REQUEST
    // -------------------------------------------------------------------------
    test("TC-B-13: leaveGroup - OWNER without successorUserId returns BAD_REQUEST", async () => {
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [USER_BOB.id])
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation Leave($conversationId: ID!) {
                leaveGroup(conversationId: $conversationId)
            }`,
            { conversationId: groupId },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors![0]!.extensions?.code).toBe("BAD_REQUEST")
    })

    // -------------------------------------------------------------------------
    // TC-B-14: leaveGroup — OWNER as last member dissolves group
    // -------------------------------------------------------------------------
    test("TC-B-14: leaveGroup - OWNER as last member dissolves the group", async () => {
        // Only Alice in the group
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [])
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation Leave($conversationId: ID!) {
                leaveGroup(conversationId: $conversationId)
            }`,
            { conversationId: groupId },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.leaveGroup).toBe(true)

        // Conversation should be deleted
        const conv = await prisma.conversation.findUnique({
            where: { id: groupId },
        })
        expect(conv).toBeNull()
    })

    // -------------------------------------------------------------------------
    // TC-B-15: updateGroupSettings — updates name and settings
    // -------------------------------------------------------------------------
    test("TC-B-15: updateGroupSettings - updates name and permission settings", async () => {
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [USER_BOB.id])
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation Update($conversationId: ID!, $name: String, $settings: GroupSettingsInput) {
                updateGroupSettings(conversationId: $conversationId, name: $name, settings: $settings) {
                    name
                    settings { onlyOwnerCanInvite onlyOwnerCanKick onlyOwnerCanEdit }
                }
            }`,
            {
                conversationId: groupId,
                name: "Renamed Group",
                settings: {
                    onlyOwnerCanInvite: true,
                    onlyOwnerCanKick: true,
                    onlyOwnerCanEdit: true,
                },
            },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const updated = result.data?.updateGroupSettings as {
            name: string
            settings: {
                onlyOwnerCanInvite: boolean
                onlyOwnerCanKick: boolean
                onlyOwnerCanEdit: boolean
            }
        }
        expect(updated.name).toBe("Renamed Group")
        expect(updated.settings.onlyOwnerCanInvite).toBe(true)
        expect(updated.settings.onlyOwnerCanKick).toBe(true)
        expect(updated.settings.onlyOwnerCanEdit).toBe(true)
    })

    // -------------------------------------------------------------------------
    // TC-B-16: pinConversation / unpinConversation
    // -------------------------------------------------------------------------
    test("TC-B-16: pinConversation / unpinConversation toggles pinnedAt", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const convId = await createOneToOneConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        // Pin
        const pinResult = await gqlMutation(
            `mutation Pin($conversationId: ID!) { pinConversation(conversationId: $conversationId) }`,
            { conversationId: convId },
            aliceToken
        )
        expect(pinResult.errors).toBeUndefined()
        expect(pinResult.data?.pinConversation).toBe(true)

        const pinned = await prisma.conversation.findUnique({ where: { id: convId } })
        expect(pinned?.pinnedAt).not.toBeNull()

        // Unpin
        const unpinResult = await gqlMutation(
            `mutation Unpin($conversationId: ID!) { unpinConversation(conversationId: $conversationId) }`,
            { conversationId: convId },
            aliceToken
        )
        expect(unpinResult.errors).toBeUndefined()
        expect(unpinResult.data?.unpinConversation).toBe(true)

        const unpinned = await prisma.conversation.findUnique({ where: { id: convId } })
        expect(unpinned?.pinnedAt).toBeNull()
    })

    // -------------------------------------------------------------------------
    // TC-B-17: conversations sorted: pinned first, then by latest message time
    // -------------------------------------------------------------------------
    test("TC-B-17: conversations sorted: pinned first, then by latest message time", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        await createFriendship(prisma, USER_ALICE.id, USER_CAROL.id)

        // C1: older message
        const c1 = await createOneToOneConversation(prisma, USER_ALICE.id, USER_BOB.id)
        await createMessage(prisma, c1, USER_BOB.id, "old", new Date(Date.now() - 10000))

        // C2: newer message
        const c2 = await createOneToOneConversation(prisma, USER_ALICE.id, USER_CAROL.id)
        await createMessage(prisma, c2, USER_CAROL.id, "new", new Date(Date.now() - 1000))

        // C3: pinned (no message)
        const c3 = await createGroupConversation(
            prisma,
            USER_ALICE.id,
            [USER_BOB.id],
            "Pinned Group"
        )
        await prisma.conversation.update({
            where: { id: c3 },
            data: { pinnedAt: new Date() },
        })

        const aliceToken = await createSession(prisma, USER_ALICE.id)
        const result = await gql(`query { conversations { id pinnedAt } }`, aliceToken)

        expect(result.errors).toBeUndefined()
        const convs = result.data?.conversations as Array<{ id: string; pinnedAt: string | null }>
        expect(convs[0]!.id).toBe(c3) // pinned first
        expect(convs[1]!.id).toBe(c2) // newer message second
        expect(convs[2]!.id).toBe(c1) // older message last
    })

    // -------------------------------------------------------------------------
    // TC-B-18: conversation(id) participants include isFriend flag
    // -------------------------------------------------------------------------
    test("TC-B-18: conversation(id) participants include viewer-dependent isFriend", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        // Dave is NOT Alice's friend but is in the group

        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [
            USER_BOB.id,
            USER_DAVE.id,
        ])
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `query GetConv { conversation(id: "${groupId}") {
                participants { user { id } isFriend }
            }}`,
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const conv = result.data?.conversation as {
            participants: Array<{ user: { id: string }; isFriend: boolean }>
        }

        const bobEntry = conv.participants.find((p) => p.user.id === USER_BOB.id)
        const daveEntry = conv.participants.find((p) => p.user.id === USER_DAVE.id)
        const aliceEntry = conv.participants.find((p) => p.user.id === USER_ALICE.id)

        expect(bobEntry?.isFriend).toBe(true)
        expect(daveEntry?.isFriend).toBe(false)
        expect(aliceEntry?.isFriend).toBe(false) // viewer is not a friend of themselves
    })

    // -------------------------------------------------------------------------
    // TC-B-19: sendMessage succeeds
    // -------------------------------------------------------------------------
    test("TC-B-19: sendMessage creates message successfully", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [USER_BOB.id])
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation Send($conversationId: ID!, $content: String!) {
                sendMessage(conversationId: $conversationId, content: $content) {
                    id content messageType status
                    sender { id }
                    createdAt
                }
            }`,
            { conversationId: groupId, content: "Hello world!" },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const msg = result.data?.sendMessage as {
            id: string
            content: string
            messageType: string
            status: string
            sender: { id: string }
            createdAt: string
        }
        expect(msg.content).toBe("Hello world!")
        expect(msg.messageType).toBe("TEXT")
        expect(msg.status).toBe("SENT")
        expect(msg.sender.id).toBe(USER_ALICE.id)
        expect(msg.createdAt).toBeTruthy()
    })

    // -------------------------------------------------------------------------
    // TC-B-20: messages cursor-based pagination with nextCursor
    // -------------------------------------------------------------------------
    test("TC-B-20: messages returns cursor-based pagination with nextCursor", async () => {
        const groupId = await createGroupConversation(prisma, USER_ALICE.id, [USER_BOB.id])

        // Create 25 messages with staggered timestamps
        for (let i = 0; i < 25; i++) {
            await createMessage(
                prisma,
                groupId,
                USER_ALICE.id,
                `Message ${i + 1}`,
                new Date(Date.now() - (25 - i) * 1000)
            )
        }

        const aliceToken = await createSession(prisma, USER_ALICE.id)

        // First page: 20 messages
        const page1 = await gqlMutation(
            `query Messages($conversationId: ID!, $limit: Int) {
                messages(conversationId: $conversationId, limit: $limit) {
                    messages { id content }
                    nextCursor
                }
            }`,
            { conversationId: groupId, limit: 20 },
            aliceToken
        )

        expect(page1.errors).toBeUndefined()
        const p1Data = page1.data?.messages as {
            messages: Array<{ id: string; content: string }>
            nextCursor: string | null
        }
        expect(p1Data.messages).toHaveLength(20)
        expect(p1Data.nextCursor).not.toBeNull()

        // Second page: remaining 5 messages
        const page2 = await gqlMutation(
            `query Messages($conversationId: ID!, $cursor: String, $limit: Int) {
                messages(conversationId: $conversationId, cursor: $cursor, limit: $limit) {
                    messages { id content }
                    nextCursor
                }
            }`,
            { conversationId: groupId, cursor: p1Data.nextCursor, limit: 20 },
            aliceToken
        )

        expect(page2.errors).toBeUndefined()
        const p2Data = page2.data?.messages as {
            messages: Array<{ id: string; content: string }>
            nextCursor: string | null
        }
        expect(p2Data.messages).toHaveLength(5)
        expect(p2Data.nextCursor).toBeNull()

        // No overlap between pages
        const p1Ids = new Set(p1Data.messages.map((m) => m.id))
        const p2Ids = p2Data.messages.map((m) => m.id)
        for (const id of p2Ids) {
            expect(p1Ids.has(id)).toBe(false)
        }
    })

    // -------------------------------------------------------------------------
    // TC-B-21: blockUser blocks user and removes friendship
    // -------------------------------------------------------------------------
    test("TC-B-21: blockUser blocks user and removes friendship", async () => {
        await createFriendship(prisma, USER_ALICE.id, USER_BOB.id)
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gqlMutation(
            `mutation Block($userId: ID!) { blockUser(userId: $userId) }`,
            { userId: USER_BOB.id },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.blockUser).toBe(true)

        // Blacklist entry should exist
        const [u1, u2] =
            USER_ALICE.id < USER_BOB.id
                ? [USER_ALICE.id, USER_BOB.id]
                : [USER_BOB.id, USER_ALICE.id]

        const block = await prisma.blacklist.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId: USER_ALICE.id,
                    blockedId: USER_BOB.id,
                },
            },
        })
        expect(block).not.toBeNull()

        // Friendship should be removed
        const friendship = await prisma.friendship.findUnique({
            where: { userId1_userId2: { userId1: u1, userId2: u2 } },
        })
        expect(friendship).toBeNull()

        // Verify blacklist query returns Bob
        const blacklistResult = await gql(`query { blacklist { id name } }`, aliceToken)
        expect(blacklistResult.errors).toBeUndefined()
        const blacklist = blacklistResult.data?.blacklist as Array<{ id: string; name: string }>
        expect(blacklist.some((u) => u.id === USER_BOB.id)).toBe(true)
    })

    // -------------------------------------------------------------------------
    // TC-B-22: unauthenticated operations return UNAUTHENTICATED
    // -------------------------------------------------------------------------
    test("TC-B-22: all operations without auth return UNAUTHENTICATED", async () => {
        // Test conversations query
        const queryResult = await gql(`query { conversations { id } }`)
        expect(queryResult.errors).toBeDefined()
        expect(queryResult.errors![0]!.extensions?.code).toBe("UNAUTHENTICATED")

        // Test getOrCreateConversation mutation
        const mutResult = await gqlMutation(
            `mutation { getOrCreateConversation(userId: "any-id") { id } }`,
            {}
        )
        expect(mutResult.errors).toBeDefined()
        expect(mutResult.errors![0]!.extensions?.code).toBe("UNAUTHENTICATED")
    })
})
