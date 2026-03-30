/**
 * Message Actions Integration Tests (Feature 1.3.3)
 *
 * TC-B-32: replyToMessage success — creates message with replyToId
 * TC-B-33: replyToMessage FORBIDDEN for non-participant + cross-conversation guard
 * TC-B-34: pinMessage success — sets pinnedAt and conversation.pinnedMessageId
 * TC-B-35: unpinMessage success — clears pinnedAt and conversation.pinnedMessageId
 * TC-B-36: deleteMessage(EVERYONE) — sender soft-deletes within 24 h
 * TC-B-37: deleteMessage(EVERYONE) — non-sender gets FORBIDDEN
 * TC-B-38: forwardMessage — creates new message in target conversation
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { PrismaClient } from "@generated/prisma/client"
import { createTestPrismaClient } from "@tests/fixtures/prisma"
import { executeGraphQL, parseGraphQLResponse } from "@tests/fixtures/graphql"

// ---------------------------------------------------------------------------
// Test user fixtures
// ---------------------------------------------------------------------------

const USER_ALICE = { id: "ma-alice", email: "ma-alice@test.com", name: "Alice" }
const USER_BOB = { id: "ma-bob", email: "ma-bob@test.com", name: "Bob" }
const USER_CAROL = { id: "ma-carol", email: "ma-carol@test.com", name: "Carol" }

const ALL_USERS = [USER_ALICE, USER_BOB, USER_CAROL]

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedUsers(prisma: PrismaClient): Promise<void> {
    for (const u of ALL_USERS) {
        await prisma.user.upsert({
            where: { id: u.id },
            update: {},
            create: { id: u.id, email: u.email, name: u.name, emailVerified: true },
        })
    }
}

async function createSession(prisma: PrismaClient, userId: string): Promise<string> {
    const token = `ma-session-${userId}-${Date.now()}`
    await prisma.session.create({
        data: {
            userId,
            token,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
    })
    return token
}

async function createConversation(
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

async function gql(
    query: string,
    variables?: Record<string, unknown>,
    token?: string
): Promise<GQLResult> {
    const res = await executeGraphQL(query, variables, token)
    return parseGraphQLResponse(res) as Promise<GQLResult>
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Feature 1.3.3 - Message Actions (Backend)", () => {
    let prisma: PrismaClient

    beforeEach(async () => {
        prisma = createTestPrismaClient()
        await seedUsers(prisma)
    })

    afterEach(async () => {
        await prisma.messageStatus.deleteMany()
        await prisma.message.deleteMany()
        await prisma.conversationParticipant.deleteMany()
        await prisma.conversation.deleteMany()
        await prisma.friendship.deleteMany()
        await prisma.session.deleteMany()
        await prisma.account.deleteMany()
        await prisma.user.deleteMany({ where: { id: { in: ALL_USERS.map((u) => u.id) } } })
        await prisma.$disconnect()
    })

    // -------------------------------------------------------------------------
    // TC-B-32: replyToMessage success
    // -------------------------------------------------------------------------
    test("TC-B-32: replyToMessage creates a message with replyToId set", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const originalMsgId = await createMessage(prisma, convId, USER_BOB.id, "Hello from Bob")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Reply($conversationId: ID!, $content: String!, $replyToMessageId: ID!) {
                replyToMessage(
                    conversationId: $conversationId
                    content: $content
                    replyToMessageId: $replyToMessageId
                ) {
                    id
                    content
                    replyToId
                    replyTo {
                        id
                        content
                        sender { id }
                    }
                    sender { id }
                }
            }`,
            { conversationId: convId, content: "Got it, thanks!", replyToMessageId: originalMsgId },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const msg = result.data?.replyToMessage as {
            id: string
            content: string
            replyToId: string
            replyTo: { id: string; content: string; sender: { id: string } }
            sender: { id: string }
        }
        expect(msg.content).toBe("Got it, thanks!")
        expect(msg.replyToId).toBe(originalMsgId)
        expect(msg.replyTo.id).toBe(originalMsgId)
        expect(msg.replyTo.sender.id).toBe(USER_BOB.id)
        expect(msg.sender.id).toBe(USER_ALICE.id)

        // Verify DB record
        const dbMsg = await prisma.message.findUnique({ where: { id: msg.id } })
        expect(dbMsg?.replyToId).toBe(originalMsgId)
    })

    test("TC-B-32b: replyToMessage with empty content returns BAD_USER_INPUT", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const originalMsgId = await createMessage(prisma, convId, USER_BOB.id, "Hello")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Reply($conversationId: ID!, $content: String!, $replyToMessageId: ID!) {
                replyToMessage(conversationId: $conversationId, content: $content, replyToMessageId: $replyToMessageId) { id }
            }`,
            { conversationId: convId, content: "", replyToMessageId: originalMsgId },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT")
    })

    test("TC-B-32c: replyToMessage with content over 2000 chars returns BAD_USER_INPUT", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const originalMsgId = await createMessage(prisma, convId, USER_BOB.id, "Hello")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Reply($conversationId: ID!, $content: String!, $replyToMessageId: ID!) {
                replyToMessage(conversationId: $conversationId, content: $content, replyToMessageId: $replyToMessageId) { id }
            }`,
            { conversationId: convId, content: "a".repeat(2001), replyToMessageId: originalMsgId },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT")
    })

    // -------------------------------------------------------------------------
    // TC-B-33: replyToMessage non-participant FORBIDDEN + cross-conversation guard
    // -------------------------------------------------------------------------
    test("TC-B-33: replyToMessage non-participant returns FORBIDDEN", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const originalMsgId = await createMessage(prisma, convId, USER_BOB.id, "Hello")
        const carolToken = await createSession(prisma, USER_CAROL.id)

        const result = await gql(
            `mutation Reply($conversationId: ID!, $content: String!, $replyToMessageId: ID!) {
                replyToMessage(conversationId: $conversationId, content: $content, replyToMessageId: $replyToMessageId) { id }
            }`,
            { conversationId: convId, content: "Intruder!", replyToMessageId: originalMsgId },
            carolToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("FORBIDDEN")

        // Verify no new message was created
        const count = await prisma.message.count({ where: { conversationId: convId } })
        expect(count).toBe(1) // Only the original message
    })

    test("TC-B-33b: replyToMessage cross-conversation injection returns BAD_USER_INPUT", async () => {
        // Alice-Bob conversation
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        // Alice-Carol conversation with a message from Carol
        const otherConvId = await createConversation(prisma, USER_ALICE.id, USER_CAROL.id)
        const carolMsgId = await createMessage(prisma, otherConvId, USER_CAROL.id, "Carol msg")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        // Alice tries to reply in Alice-Bob conv but reference a message from Alice-Carol conv
        const result = await gql(
            `mutation Reply($conversationId: ID!, $content: String!, $replyToMessageId: ID!) {
                replyToMessage(conversationId: $conversationId, content: $content, replyToMessageId: $replyToMessageId) { id }
            }`,
            { conversationId: convId, content: "Injected!", replyToMessageId: carolMsgId },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT")
    })

    test("TC-B-33c: replyToMessage with non-existent replyToMessageId returns NOT_FOUND", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Reply($conversationId: ID!, $content: String!, $replyToMessageId: ID!) {
                replyToMessage(conversationId: $conversationId, content: $content, replyToMessageId: $replyToMessageId) { id }
            }`,
            {
                conversationId: convId,
                content: "Hello",
                replyToMessageId: "00000000-0000-0000-0000-000000000000",
            },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("NOT_FOUND")
    })

    test("TC-B-33d: replyToMessage unauthenticated returns UNAUTHENTICATED", async () => {
        const result = await gql(
            `mutation { replyToMessage(conversationId: "x", content: "hi", replyToMessageId: "y") { id } }`,
            {}
        )
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED")
    })

    // -------------------------------------------------------------------------
    // TC-B-34: pinMessage success
    // -------------------------------------------------------------------------
    test("TC-B-34: pinMessage sets pinnedAt and conversation.pinnedMessageId", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_BOB.id, "Pin me!")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Pin($messageId: ID!) {
                pinMessage(messageId: $messageId) {
                    id
                    pinnedAt
                }
            }`,
            { messageId: msgId },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const msg = result.data?.pinMessage as { id: string; pinnedAt: string }
        expect(msg.pinnedAt).not.toBeNull()
        // Verify it's a valid ISO datetime
        expect(new Date(msg.pinnedAt).getTime()).toBeGreaterThan(0)

        // Verify DB state
        const dbConv = await prisma.conversation.findUnique({ where: { id: convId } })
        expect(dbConv?.pinnedMessageId).toBe(msgId)

        const dbMsg = await prisma.message.findUnique({ where: { id: msgId } })
        expect(dbMsg?.pinnedAt).not.toBeNull()
    })

    test("TC-B-34b: pinMessage idempotent — repeated pin keeps original pinnedAt", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_BOB.id, "Pin me!")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const first = await gql(
            `mutation Pin($messageId: ID!) { pinMessage(messageId: $messageId) { id pinnedAt } }`,
            { messageId: msgId },
            aliceToken
        )
        const firstPinnedAt = (first.data as { pinMessage: { pinnedAt: string } }).pinMessage.pinnedAt

        // Small delay to ensure timestamps would differ if not idempotent
        await new Promise((r) => setTimeout(r, 10))

        const second = await gql(
            `mutation Pin($messageId: ID!) { pinMessage(messageId: $messageId) { id pinnedAt } }`,
            { messageId: msgId },
            aliceToken
        )
        const secondPinnedAt = (second.data as { pinMessage: { pinnedAt: string } }).pinMessage.pinnedAt

        expect(secondPinnedAt).toBe(firstPinnedAt)
    })

    test("TC-B-34c: pinMessage non-participant returns FORBIDDEN", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_BOB.id, "Pin me!")
        const carolToken = await createSession(prisma, USER_CAROL.id)

        const result = await gql(
            `mutation Pin($messageId: ID!) { pinMessage(messageId: $messageId) { id pinnedAt } }`,
            { messageId: msgId },
            carolToken
        )
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("FORBIDDEN")
    })

    // -------------------------------------------------------------------------
    // TC-B-35: unpinMessage success
    // -------------------------------------------------------------------------
    test("TC-B-35: unpinMessage clears pinnedAt and conversation.pinnedMessageId", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_BOB.id, "I am pinned")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        // Pin the message first
        await gql(`mutation { pinMessage(messageId: "${msgId}") { id } }`, {}, aliceToken)

        // Verify pinned state
        const dbConvBefore = await prisma.conversation.findUnique({ where: { id: convId } })
        expect(dbConvBefore?.pinnedMessageId).toBe(msgId)

        const result = await gql(
            `mutation Unpin($messageId: ID!) {
                unpinMessage(messageId: $messageId) {
                    id
                    pinnedAt
                }
            }`,
            { messageId: msgId },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const msg = result.data?.unpinMessage as { id: string; pinnedAt: string | null }
        expect(msg.pinnedAt).toBeNull()

        // Verify DB state
        const dbConv = await prisma.conversation.findUnique({ where: { id: convId } })
        expect(dbConv?.pinnedMessageId).toBeNull()
    })

    test("TC-B-35b: unpinMessage idempotent — already unpinned returns null without error", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_BOB.id, "Not pinned")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Unpin($messageId: ID!) { unpinMessage(messageId: $messageId) { id pinnedAt } }`,
            { messageId: msgId },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const msg = result.data?.unpinMessage as { pinnedAt: string | null }
        expect(msg.pinnedAt).toBeNull()
    })

    // -------------------------------------------------------------------------
    // TC-B-36: deleteMessage(EVERYONE) — sender soft-deletes
    // -------------------------------------------------------------------------
    test("TC-B-36: deleteMessage(EVERYONE) sender soft-deletes within 24h", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_ALICE.id, "Delete this")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Delete($messageId: ID!, $scope: DeleteMessageScope!) {
                deleteMessage(messageId: $messageId, scope: $scope)
            }`,
            { messageId: msgId, scope: "EVERYONE" },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.deleteMessage).toBe(true)

        // Verify DB: deletedAt is set, content is null
        const dbMsg = await prisma.message.findUnique({ where: { id: msgId } })
        expect(dbMsg?.deletedAt).not.toBeNull()
        expect(dbMsg?.content).toBeNull()
    })

    test("TC-B-36b: deleteMessage(EVERYONE) over 24h returns FORBIDDEN", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
        const msgId = await createMessage(prisma, convId, USER_ALICE.id, "Old message", oldDate)
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Delete($messageId: ID!, $scope: DeleteMessageScope!) {
                deleteMessage(messageId: $messageId, scope: $scope)
            }`,
            { messageId: msgId, scope: "EVERYONE" },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("FORBIDDEN")

        const dbMsg = await prisma.message.findUnique({ where: { id: msgId } })
        expect(dbMsg?.deletedAt).toBeNull()
    })

    test("TC-B-36c: deleteMessage(EVERYONE) already deleted is idempotent", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_ALICE.id, "Delete this")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        // First delete
        await gql(
            `mutation Delete($messageId: ID!, $scope: DeleteMessageScope!) {
                deleteMessage(messageId: $messageId, scope: $scope)
            }`,
            { messageId: msgId, scope: "EVERYONE" },
            aliceToken
        )

        // Second delete (idempotent)
        const result = await gql(
            `mutation Delete($messageId: ID!, $scope: DeleteMessageScope!) {
                deleteMessage(messageId: $messageId, scope: $scope)
            }`,
            { messageId: msgId, scope: "EVERYONE" },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        expect(result.data?.deleteMessage).toBe(true)
    })

    // -------------------------------------------------------------------------
    // TC-B-37: deleteMessage(EVERYONE) non-sender FORBIDDEN
    // -------------------------------------------------------------------------
    test("TC-B-37: deleteMessage(EVERYONE) non-sender returns FORBIDDEN", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_BOB.id, "Bob's message")
        // Alice tries to delete Bob's message for everyone
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Delete($messageId: ID!, $scope: DeleteMessageScope!) {
                deleteMessage(messageId: $messageId, scope: $scope)
            }`,
            { messageId: msgId, scope: "EVERYONE" },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("FORBIDDEN")

        // Verify message still exists and is not deleted
        const dbMsg = await prisma.message.findUnique({ where: { id: msgId } })
        expect(dbMsg?.deletedAt).toBeNull()
    })

    test("TC-B-37b: deleteMessage(OWN) non-sender is allowed (stub)", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_BOB.id, "Bob's message")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Delete($messageId: ID!, $scope: DeleteMessageScope!) {
                deleteMessage(messageId: $messageId, scope: $scope)
            }`,
            { messageId: msgId, scope: "OWN" },
            aliceToken
        )

        // scope=OWN is a stub — just returns true
        expect(result.errors).toBeUndefined()
        expect(result.data?.deleteMessage).toBe(true)
    })

    test("TC-B-37c: deleteMessage with non-existent messageId returns NOT_FOUND", async () => {
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Delete($messageId: ID!, $scope: DeleteMessageScope!) {
                deleteMessage(messageId: $messageId, scope: $scope)
            }`,
            { messageId: "00000000-0000-0000-0000-000000000000", scope: "EVERYONE" },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("NOT_FOUND")
    })

    test("TC-B-37d: deleteMessage unauthenticated returns UNAUTHENTICATED", async () => {
        const result = await gql(`mutation { deleteMessage(messageId: "x", scope: EVERYONE) }`, {})
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED")
    })

    // -------------------------------------------------------------------------
    // TC-B-38: forwardMessage success
    // -------------------------------------------------------------------------
    test("TC-B-38: forwardMessage creates new message in target conversation", async () => {
        const srcConvId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const dstConvId = await createConversation(prisma, USER_ALICE.id, USER_CAROL.id)
        const srcMsgId = await createMessage(prisma, srcConvId, USER_BOB.id, "Hello World")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Forward($messageId: ID!, $targetConversationId: ID!) {
                forwardMessage(messageId: $messageId, targetConversationId: $targetConversationId) {
                    id
                    content
                    conversationId
                    sender { id }
                }
            }`,
            { messageId: srcMsgId, targetConversationId: dstConvId },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const msg = result.data?.forwardMessage as {
            id: string
            content: string
            conversationId: string
            sender: { id: string }
        }
        expect(msg.content).toBe("Hello World")
        expect(msg.conversationId).toBe(dstConvId)
        expect(msg.sender.id).toBe(USER_ALICE.id)

        // Verify DB: new message in dst conversation, no replyToId
        const dbMsg = await prisma.message.findUnique({ where: { id: msg.id } })
        expect(dbMsg?.conversationId).toBe(dstConvId)
        expect(dbMsg?.replyToId).toBeNull()
        expect(dbMsg?.content).toBe("Hello World")
    })

    test("TC-B-38b: forwardMessage to non-participant conversation returns FORBIDDEN", async () => {
        const srcConvId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        // Alice is NOT in this conversation
        const carolBobConvId = await createConversation(prisma, USER_BOB.id, USER_CAROL.id)
        const srcMsgId = await createMessage(prisma, srcConvId, USER_BOB.id, "Hello World")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Forward($messageId: ID!, $targetConversationId: ID!) {
                forwardMessage(messageId: $messageId, targetConversationId: $targetConversationId) { id }
            }`,
            { messageId: srcMsgId, targetConversationId: carolBobConvId },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("FORBIDDEN")
    })

    test("TC-B-38c: forwardMessage deleted message returns BAD_USER_INPUT", async () => {
        const srcConvId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const dstConvId = await createConversation(prisma, USER_ALICE.id, USER_CAROL.id)
        const srcMsgId = await createMessage(prisma, srcConvId, USER_ALICE.id, "Will be deleted")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        // Soft-delete the message first
        await prisma.message.update({
            where: { id: srcMsgId },
            data: { deletedAt: new Date(), content: null },
        })

        const result = await gql(
            `mutation Forward($messageId: ID!, $targetConversationId: ID!) {
                forwardMessage(messageId: $messageId, targetConversationId: $targetConversationId) { id }
            }`,
            { messageId: srcMsgId, targetConversationId: dstConvId },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT")
    })

    test("TC-B-38d: forwardMessage to same conversation is allowed", async () => {
        const convId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const msgId = await createMessage(prisma, convId, USER_BOB.id, "Forward to self")
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Forward($messageId: ID!, $targetConversationId: ID!) {
                forwardMessage(messageId: $messageId, targetConversationId: $targetConversationId) {
                    id content conversationId
                }
            }`,
            { messageId: msgId, targetConversationId: convId },
            aliceToken
        )

        expect(result.errors).toBeUndefined()
        const msg = result.data?.forwardMessage as { content: string; conversationId: string }
        expect(msg.content).toBe("Forward to self")
        expect(msg.conversationId).toBe(convId)
    })

    test("TC-B-38e: forwardMessage non-existent messageId returns NOT_FOUND", async () => {
        const dstConvId = await createConversation(prisma, USER_ALICE.id, USER_BOB.id)
        const aliceToken = await createSession(prisma, USER_ALICE.id)

        const result = await gql(
            `mutation Forward($messageId: ID!, $targetConversationId: ID!) {
                forwardMessage(messageId: $messageId, targetConversationId: $targetConversationId) { id }
            }`,
            { messageId: "00000000-0000-0000-0000-000000000000", targetConversationId: dstConvId },
            aliceToken
        )

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("NOT_FOUND")
    })
})
