/**
 * Socket.io Integration Tests
 *
 * Tests Socket.io WebSocket server, authentication middleware,
 * connection handling, Redis integration, and heartbeat/presence.
 *
 * Test Coverage:
 *  1.  Socket.io server initialization
 *  2.  Authenticated user successful connection
 *  3.  Unauthenticated user connection rejection
 *  4.  Redis userId → socketId mapping
 *  5.  Disconnect cleanup in Redis
 *  6.  Multi-device connections (same user, multiple sockets)
 *  7.  Invalid session token rejection
 *  8.  Expired session token rejection
 *
 * Heartbeat & Presence (Feature 1.4.1):
 *  9.  Connect sets user:online key with TTL ≤ 35s (not persistent)
 *  10. heartbeat event refreshes Redis TTL back to ~35s
 *  11. user:away event immediately deletes user:online key
 *  12. user:away broadcasts presence:changed { isOnline: false } to shared room
 *  13. Connect broadcasts presence:changed { isOnline: true } to shared room
 *  14. Final disconnect broadcasts presence:changed { isOnline: false }
 *  15. Disconnect with remaining socket does NOT broadcast presence:changed
 *  16. user:away does NOT affect other users' Redis keys
 *  17. presence:changed is NOT received by users sharing no conversation
 *  18. me { isOnline } returns false when user:online key absent in Redis
 *  19. me { isOnline } returns true when user:online key present in Redis
 *  20. searchUsers returns correct isOnline for each result
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from "bun:test"
import { PrismaClient } from "@generated/prisma/client"
import type { Socket } from "socket.io-client"
import { createTestPrismaClient, cleanupTestPrisma } from "@tests/fixtures/prisma"
import {
    createAuthenticatedSocketClient,
    createUnauthenticatedSocketClient,
    createTestUserForSocket,
    waitForSocketEvent,
    waitForSocketConnect,
    disconnectSocket,
} from "@tests/fixtures/socket"
import {
    executeGraphQL,
    createTestUserWithSession,
    parseGraphQLResponse,
} from "@tests/fixtures/graphql"
import { startTestServer, stopTestServer } from "@tests/fixtures/server"
import { redis } from "@/lib/redis"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers shared by Heartbeat & Presence tests
// ─────────────────────────────────────────────────────────────────────────────

/** Presence event payload emitted by `presence:changed`. */
type PresencePayload = { userId: string; isOnline: boolean; timestamp: string }

/**
 * Wait for the next `presence:changed` event on a socket.
 * Returns null if no event arrives within `timeout` ms — used to assert
 * that an event does NOT occur.
 */
function waitForPresenceOrNull(socket: Socket, timeout = 600): Promise<PresencePayload | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            socket.off("presence:changed", handler)
            resolve(null)
        }, timeout)

        const handler = (data: PresencePayload) => {
            clearTimeout(timer)
            resolve(data)
        }

        socket.once("presence:changed", handler)
    })
}

/**
 * Collect ALL `presence:changed` events on a socket for `durationMs`.
 * Useful when multiple events may arrive and we need to inspect all of them.
 */
function collectPresenceEvents(socket: Socket, durationMs: number): Promise<PresencePayload[]> {
    return new Promise((resolve) => {
        const events: PresencePayload[] = []
        const handler = (data: PresencePayload) => events.push(data)

        socket.on("presence:changed", handler)

        setTimeout(() => {
            socket.off("presence:changed", handler)
            resolve(events)
        }, durationMs)
    })
}

/**
 * Create two users sharing a ONE_TO_ONE conversation.
 * Returns both users, their session tokens, and the conversation ID.
 */
async function createTwoUsersInConversation(prisma: PrismaClient) {
    const ts = Date.now()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const userA = await prisma.user.create({
        data: {
            email: `heartbeat-a-${ts}@example.com`,
            name: "Heartbeat User A",
            emailVerified: new Date(),
        },
    })
    const userB = await prisma.user.create({
        data: {
            email: `heartbeat-b-${ts}@example.com`,
            name: "Heartbeat User B",
            emailVerified: new Date(),
        },
    })

    const tokenA = `heartbeat-sess-a-${ts}`
    const tokenB = `heartbeat-sess-b-${ts}`
    await prisma.session.createMany({
        data: [
            { userId: userA.id, sessionToken: tokenA, expires: expiresAt },
            { userId: userB.id, sessionToken: tokenB, expires: expiresAt },
        ],
    })

    const conversation = await prisma.conversation.create({
        data: {
            type: "ONE_TO_ONE",
            participants: {
                create: [
                    { userId: userA.id, role: "MEMBER" },
                    { userId: userB.id, role: "MEMBER" },
                ],
            },
        },
    })

    return { userA, userB, tokenA, tokenB, conversationId: conversation.id }
}

/** Connect a socket and wait for the `authenticated` confirmation. */
async function connectAndAuth(socket: Socket) {
    socket.connect()
    await waitForSocketConnect(socket)
    await waitForSocketEvent(socket, "authenticated")
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe("Socket.io Integration", () => {
    let testPrisma: PrismaClient
    const connectedSockets: Socket[] = []

    beforeAll(async () => {
        await startTestServer()
    })

    afterAll(async () => {
        await stopTestServer()
    })

    beforeEach(() => {
        testPrisma = createTestPrismaClient()
    })

    afterEach(async () => {
        // Disconnect all sockets
        await Promise.all(connectedSockets.map((s) => disconnectSocket(s)))
        connectedSockets.length = 0

        // Cleanup Prisma
        await cleanupTestPrisma(testPrisma)

        // Cleanup Redis test keys
        const keys = await redis.keys("user:*")
        if (keys.length > 0) {
            await redis.del(...keys)
        }
    })

    // =========================================================================
    // Connection & Authentication (TC 1–8)
    // =========================================================================

    /**
     * Test Case 1: Socket.io Server Initialization
     */
    test("should initialize Socket.io server successfully", async () => {
        const { sessionToken } = await createTestUserForSocket(testPrisma)

        const socket = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket)

        expect(socket).toBeDefined()
        expect(socket.io).toBeDefined()
    })

    /**
     * Test Case 2: Authenticated User Successful Connection
     */
    test("should connect authenticated user successfully", async () => {
        const { user, sessionToken } = await createTestUserForSocket(testPrisma)

        const socket = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket)

        socket.connect()
        await waitForSocketConnect(socket)

        const authData = await waitForSocketEvent<{
            userId: string
            socketId: string
        }>(socket, "authenticated")

        expect(authData.userId).toBe(user.id)
        expect(socket.id).toBeDefined()
        expect(authData.socketId).toBe(socket.id!) // oxlint-disable-line typescript/no-non-null-assertion
        expect(socket.connected).toBe(true)
    })

    /**
     * Test Case 3: Unauthenticated User Connection Rejection
     */
    test("should reject unauthenticated user connection", async () => {
        const socket = createUnauthenticatedSocketClient()
        connectedSockets.push(socket)

        socket.connect()

        await expect(waitForSocketConnect(socket, 2000)).rejects.toThrow()
        expect(socket.connected).toBe(false)
    })

    /**
     * Test Case 4: Redis userId → socketId Mapping
     */
    test("should map userId to socketId in Redis", async () => {
        const { user, sessionToken } = await createTestUserForSocket(testPrisma)

        const socket = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket)

        socket.connect()
        await waitForSocketConnect(socket)
        await waitForSocketEvent(socket, "authenticated")

        const socketIds = await redis.smembers(`user:sockets:${user.id}`)
        expect(socket.id).toBeDefined()
        expect(socketIds).toContain(socket.id!) // oxlint-disable-line typescript/no-non-null-assertion

        const isOnline = await redis.get(`user:online:${user.id}`)
        expect(isOnline).toBe("true")
    })

    /**
     * Test Case 5: Disconnect Cleanup in Redis
     */
    test("should cleanup Redis on disconnect", async () => {
        const { user, sessionToken } = await createTestUserForSocket(testPrisma)

        const socket = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket)

        socket.connect()
        await waitForSocketConnect(socket)
        await waitForSocketEvent(socket, "authenticated")

        const socketIdBeforeDisconnect = socket.id
        expect(socketIdBeforeDisconnect).toBeDefined()

        await disconnectSocket(socket)
        // handleDisconnect now calls broadcastPresence (extra Prisma query), allow extra time
        await new Promise((resolve) => setTimeout(resolve, 400))

        const socketIds = await redis.smembers(`user:sockets:${user.id}`)
        expect(socketIds).not.toContain(socketIdBeforeDisconnect)

        const isOnline = await redis.get(`user:online:${user.id}`)
        expect(isOnline).toBeNull()
    })

    /**
     * Test Case 6: Multi-Device Connections
     */
    test("should support multiple sockets for same user", async () => {
        const { user, sessionToken } = await createTestUserForSocket(testPrisma)

        const socket1 = createAuthenticatedSocketClient(sessionToken)
        const socket2 = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket1, socket2)

        socket1.connect()
        await waitForSocketConnect(socket1, 10000)
        await waitForSocketEvent(socket1, "authenticated", 10000)

        await new Promise((resolve) => setTimeout(resolve, 100))

        socket2.connect()
        await waitForSocketConnect(socket2, 10000)
        await waitForSocketEvent(socket2, "authenticated", 10000)

        const socketIds = await redis.smembers(`user:sockets:${user.id}`)
        expect(socket1.id).toBeDefined()
        expect(socket2.id).toBeDefined()
        expect(socketIds).toContain(socket1.id!) // oxlint-disable-line typescript/no-non-null-assertion
        expect(socketIds).toContain(socket2.id!) // oxlint-disable-line typescript/no-non-null-assertion
        expect(socketIds.length).toBe(2)

        const isOnline = await redis.get(`user:online:${user.id}`)
        expect(isOnline).toBe("true")

        const socket1Id = socket1?.id
        const socket2Id = socket2.id! // oxlint-disable-line typescript/no-non-null-assertion

        await disconnectSocket(socket1)
        await new Promise((resolve) => setTimeout(resolve, 100))

        const remainingSockets = await redis.smembers(`user:sockets:${user.id}`)
        expect(remainingSockets).not.toContain(socket1Id)
        expect(remainingSockets).toContain(socket2Id)

        const stillOnline = await redis.get(`user:online:${user.id}`)
        expect(stillOnline).toBe("true")
    })

    /**
     * Test Case 7: Invalid Session Token Rejection
     */
    test("should reject invalid session token", async () => {
        const invalidToken = `invalid-session-${Date.now()}`

        const socket = createAuthenticatedSocketClient(invalidToken)
        connectedSockets.push(socket)

        socket.connect()

        await expect(waitForSocketConnect(socket, 2000)).rejects.toThrow()
        expect(socket.connected).toBe(false)
    })

    /**
     * Test Case 8: Expired Session Token Rejection
     */
    test("should reject expired session token", async () => {
        const user = await testPrisma.user.create({
            data: {
                email: `test-expired-socket-${Date.now()}@example.com`,
                name: "Expired Socket User",
                emailVerified: new Date(),
            },
        })

        const expiredToken = `expired-socket-session-${Date.now()}`
        await testPrisma.session.create({
            data: {
                userId: user.id,
                sessionToken: expiredToken,
                expires: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            },
        })

        const socket = createAuthenticatedSocketClient(expiredToken)
        connectedSockets.push(socket)

        socket.connect()

        await expect(waitForSocketConnect(socket, 2000)).rejects.toThrow()
        expect(socket.connected).toBe(false)
    })

    // =========================================================================
    // Heartbeat & Presence — Feature 1.4.1 (TC 9–20)
    // =========================================================================

    describe("Heartbeat & Presence (Feature 1.4.1)", () => {
        /**
         * Test Case 9: Connect sets user:online key with TTL (not persistent)
         */
        test("connect should set user:online key with TTL ≤ 35s", async () => {
            const { user, sessionToken } = await createTestUserForSocket(testPrisma)

            const socket = createAuthenticatedSocketClient(sessionToken)
            connectedSockets.push(socket)
            await connectAndAuth(socket)

            const ttl = await redis.ttl(`user:online:${user.id}`)
            expect(ttl).toBeGreaterThan(0)
            expect(ttl).toBeLessThanOrEqual(35)
        })

        /**
         * Test Case 10: heartbeat refreshes Redis TTL back to ~35s
         */
        test("heartbeat event should reset user:online TTL to ~35s", async () => {
            const { user, sessionToken } = await createTestUserForSocket(testPrisma)

            const socket = createAuthenticatedSocketClient(sessionToken)
            connectedSockets.push(socket)
            await connectAndAuth(socket)

            // Simulate time passing: forcibly reduce TTL
            await redis.expire(`user:online:${user.id}`, 5)
            const ttlBefore = await redis.ttl(`user:online:${user.id}`)
            expect(ttlBefore).toBeLessThanOrEqual(5)

            socket.emit("heartbeat")
            await new Promise((resolve) => setTimeout(resolve, 150))

            const ttlAfter = await redis.ttl(`user:online:${user.id}`)
            expect(ttlAfter).toBeGreaterThan(5)
            expect(ttlAfter).toBeLessThanOrEqual(35)
        })

        /**
         * Test Case 11: user:away immediately deletes user:online key
         */
        test("user:away event should immediately delete user:online key", async () => {
            const { user, sessionToken } = await createTestUserForSocket(testPrisma)

            const socket = createAuthenticatedSocketClient(sessionToken)
            connectedSockets.push(socket)
            await connectAndAuth(socket)

            const before = await redis.get(`user:online:${user.id}`)
            expect(before).toBe("true")

            socket.emit("user:away")
            await new Promise((resolve) => setTimeout(resolve, 150))

            const after = await redis.get(`user:online:${user.id}`)
            expect(after).toBeNull()
        })

        /**
         * Test Case 12: user:away broadcasts presence:changed { isOnline: false }
         */
        test("user:away should broadcast presence:changed { isOnline: false } to shared room", async () => {
            const { userB, tokenA, tokenB } = await createTwoUsersInConversation(testPrisma)

            const socketA = createAuthenticatedSocketClient(tokenA)
            const socketB = createAuthenticatedSocketClient(tokenB)
            connectedSockets.push(socketA, socketB)

            await connectAndAuth(socketA)
            await connectAndAuth(socketB)

            // Drain the connect-broadcast (isOnline: true for B) arriving at A
            await new Promise((resolve) => setTimeout(resolve, 200))

            const awayPromise = waitForSocketEvent<PresencePayload>(
                socketA,
                "presence:changed",
                3000
            )
            socketB.emit("user:away")

            const event = await awayPromise
            expect(event.userId).toBe(userB.id)
            expect(event.isOnline).toBe(false)
            expect(event.timestamp).toBeDefined()
        })

        /**
         * Test Case 13: Connect broadcasts presence:changed { isOnline: true }
         */
        test("connect should broadcast presence:changed { isOnline: true } to shared room", async () => {
            const { userB, tokenA, tokenB } = await createTwoUsersInConversation(testPrisma)

            const socketA = createAuthenticatedSocketClient(tokenA)
            const socketB = createAuthenticatedSocketClient(tokenB)
            connectedSockets.push(socketA, socketB)

            // Connect A first, start collecting events
            await connectAndAuth(socketA)
            const collectPromise = collectPresenceEvents(socketA, 1000)

            // B connects → broadcastPresence(isOnline: true)
            await connectAndAuth(socketB)

            const events = await collectPromise
            const connectEvent = events.find((e) => e.userId === userB.id && e.isOnline === true)
            expect(connectEvent).toBeDefined()
            expect(connectEvent!.timestamp).toBeDefined() // oxlint-disable-line typescript/no-non-null-assertion
        })

        /**
         * Test Case 14: Final disconnect broadcasts presence:changed { isOnline: false }
         */
        test("final disconnect should broadcast presence:changed { isOnline: false }", async () => {
            const { userB, tokenA, tokenB } = await createTwoUsersInConversation(testPrisma)

            const socketA = createAuthenticatedSocketClient(tokenA)
            const socketB = createAuthenticatedSocketClient(tokenB)
            connectedSockets.push(socketA, socketB)

            await connectAndAuth(socketA)
            await connectAndAuth(socketB)

            // Drain the connect-broadcast
            await new Promise((resolve) => setTimeout(resolve, 200))

            const disconnectPromise = waitForSocketEvent<PresencePayload>(
                socketA,
                "presence:changed",
                3000
            )
            await disconnectSocket(socketB)

            const event = await disconnectPromise
            expect(event.userId).toBe(userB.id)
            expect(event.isOnline).toBe(false)
        })

        /**
         * Test Case 15: Disconnect with remaining socket does NOT broadcast
         */
        test("disconnect with remaining socket should NOT broadcast presence:changed", async () => {
            const { userB, tokenA, tokenB } = await createTwoUsersInConversation(testPrisma)

            const socketA = createAuthenticatedSocketClient(tokenA)
            const socketB1 = createAuthenticatedSocketClient(tokenB)
            const socketB2 = createAuthenticatedSocketClient(tokenB)
            connectedSockets.push(socketA, socketB1, socketB2)

            await connectAndAuth(socketA)
            await connectAndAuth(socketB1)
            await connectAndAuth(socketB2)

            // Drain connect-broadcasts from both B sockets
            await new Promise((resolve) => setTimeout(resolve, 300))

            // Disconnect one of B's sockets while B2 is still open
            const noEventPromise = waitForPresenceOrNull(socketA, 600)
            await disconnectSocket(socketB1)

            const event = await noEventPromise

            // If any event arrived, it must NOT be B going offline
            if (event !== null) {
                const isBOffline = event.userId === userB.id && event.isOnline === false
                expect(isBOffline).toBe(false)
            }

            // B still has an active socket → Redis key still present
            const ttl = await redis.ttl(`user:online:${userB.id}`)
            expect(ttl).toBeGreaterThan(0)
        })

        /**
         * Test Case 16: user:away on B should NOT touch user:online key for A
         */
        test("user:away should not affect other users' Redis keys", async () => {
            const { userA, tokenA, tokenB } = await createTwoUsersInConversation(testPrisma)

            const socketA = createAuthenticatedSocketClient(tokenA)
            const socketB = createAuthenticatedSocketClient(tokenB)
            connectedSockets.push(socketA, socketB)

            await connectAndAuth(socketA)
            await connectAndAuth(socketB)

            const aOnlineBefore = await redis.get(`user:online:${userA.id}`)
            expect(aOnlineBefore).toBe("true")

            socketB.emit("user:away")
            await new Promise((resolve) => setTimeout(resolve, 150))

            const aOnlineAfter = await redis.get(`user:online:${userA.id}`)
            expect(aOnlineAfter).toBe("true")
        })

        /**
         * Test Case 17: presence:changed not received by users in no shared conversation
         */
        test("presence:changed should NOT reach users sharing no conversation", async () => {
            const ts = Date.now()
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

            // Two users with NO shared conversation
            const userA = await testPrisma.user.create({
                data: {
                    email: `heartbeat-solo-a-${ts}@example.com`,
                    name: "Solo A",
                    emailVerified: new Date(),
                },
            })
            const userC = await testPrisma.user.create({
                data: {
                    email: `heartbeat-solo-c-${ts}@example.com`,
                    name: "Solo C",
                    emailVerified: new Date(),
                },
            })

            const tokenA = `heartbeat-solo-sess-a-${ts}`
            const tokenC = `heartbeat-solo-sess-c-${ts}`
            await testPrisma.session.createMany({
                data: [
                    { userId: userA.id, sessionToken: tokenA, expires: expiresAt },
                    { userId: userC.id, sessionToken: tokenC, expires: expiresAt },
                ],
            })

            const socketA = createAuthenticatedSocketClient(tokenA)
            const socketC = createAuthenticatedSocketClient(tokenC)
            connectedSockets.push(socketA, socketC)

            await connectAndAuth(socketA)

            // Start listening on A before C connects
            const noEventPromise = waitForPresenceOrNull(socketA, 700)

            // C connects — broadcastPresence runs but A shares no room with C
            await connectAndAuth(socketC)

            const event = await noEventPromise
            if (event !== null) {
                expect(event.userId).not.toBe(userC.id)
            }
        })

        /**
         * Test Case 18: me { isOnline } returns false when key absent
         */
        test("me { isOnline } returns false when user:online key is absent", async () => {
            const { user, sessionToken } = await createTestUserWithSession(testPrisma)

            await redis.del(`user:online:${user.id}`)

            const response = await executeGraphQL(
                `query { me { id isOnline } }`,
                undefined,
                sessionToken
            )
            const result = await parseGraphQLResponse(response)

            expect(result.errors).toBeUndefined()
            expect(
                (result.data as { me: { id: string; isOnline: boolean } }).me.isOnline
            ).toBe(false)
        })

        /**
         * Test Case 19: me { isOnline } returns true when key present
         */
        test("me { isOnline } returns true when user:online key is present", async () => {
            const { user, sessionToken } = await createTestUserWithSession(testPrisma)

            await redis.setex(`user:online:${user.id}`, 35, "true")

            const response = await executeGraphQL(
                `query { me { id isOnline } }`,
                undefined,
                sessionToken
            )
            const result = await parseGraphQLResponse(response)

            expect(result.errors).toBeUndefined()
            expect(
                (result.data as { me: { id: string; isOnline: boolean } }).me.isOnline
            ).toBe(true)
        })

        /**
         * Test Case 20: searchUsers returns correct isOnline per user
         */
        test("searchUsers should return isOnline reflecting each user's Redis presence", async () => {
            const ts = Date.now()
            const { sessionToken } = await createTestUserWithSession(testPrisma)

            const onlineUser = await testPrisma.user.create({
                data: {
                    email: `search-online-${ts}@example.com`,
                    name: `OnlineTarget${ts}`,
                    emailVerified: new Date(),
                },
            })
            await redis.setex(`user:online:${onlineUser.id}`, 35, "true")

            const offlineUser = await testPrisma.user.create({
                data: {
                    email: `search-offline-${ts}@example.com`,
                    name: `OfflineTarget${ts}`,
                    emailVerified: new Date(),
                },
            })
            // No Redis key → offline

            const response = await executeGraphQL(
                `query($q: String!) { searchUsers(query: $q) { id isOnline } }`,
                { q: `Target${ts}` },
                sessionToken
            )
            const result = await parseGraphQLResponse(response)
            expect(result.errors).toBeUndefined()

            const users = (
                result.data as { searchUsers: Array<{ id: string; isOnline: boolean }> }
            ).searchUsers

            const found = users.find((u) => u.id === onlineUser.id)
            const foundOffline = users.find((u) => u.id === offlineUser.id)

            expect(found).toBeDefined()
            expect(found!.isOnline).toBe(true) // oxlint-disable-line typescript/no-non-null-assertion

            expect(foundOffline).toBeDefined()
            expect(foundOffline!.isOnline).toBe(false) // oxlint-disable-line typescript/no-non-null-assertion
        })
    })
})
