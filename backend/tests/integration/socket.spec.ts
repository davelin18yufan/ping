/**
 * Socket.io Integration Tests
 *
 * Tests Socket.io WebSocket server, authentication middleware,
 * connection handling, and Redis integration.
 *
 * Test Coverage:
 * 1. Socket.io server initialization
 * 2. Authenticated user successful connection
 * 3. Unauthenticated user connection rejection
 * 4. Redis userId → socketId mapping
 * 5. Disconnect cleanup in Redis
 * 6. Multi-device connections (same user, multiple sockets)
 * 7. Invalid session token rejection
 * 8. Expired session token rejection
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
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
import { redis } from "@/lib/redis"

describe("Socket.io Integration", () => {
    let testPrisma: PrismaClient
    const connectedSockets: Socket[] = []

    beforeEach(() => {
        testPrisma = createTestPrismaClient()
    })

    afterEach(async () => {
        // Disconnect all sockets
        await Promise.all(connectedSockets.map((s) => disconnectSocket(s)))
        connectedSockets.length = 0

        // Cleanup Prisma
        await cleanupTestPrisma(testPrisma)

        // Cleanup Redis (optional - clear test keys)
        const keys = await redis.keys("user:*")
        if (keys.length > 0) {
            await redis.del(...keys)
        }
    })

    /**
     * Test Case 1: Socket.io Server Initialization
     */
    test("should initialize Socket.io server successfully", async () => {
        // Arrange: Create test user with session
        const { sessionToken } = await createTestUserForSocket(testPrisma)

        // Act: Create socket client
        const socket = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket)

        // Assert: Server should be reachable
        expect(socket).toBeDefined()
        expect(socket.io).toBeDefined()
    })

    /**
     * Test Case 2: Authenticated User Successful Connection
     */
    test("should connect authenticated user successfully", async () => {
        // Arrange: Create test user with valid session
        const { user, sessionToken } = await createTestUserForSocket(testPrisma)

        const socket = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket)

        // Act: Connect socket
        socket.connect()
        await waitForSocketConnect(socket)

        // Assert: Should receive authenticated event
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
        // Arrange: Create unauthenticated socket
        const socket = createUnauthenticatedSocketClient()
        connectedSockets.push(socket)

        // Act & Assert: Should fail to connect
        socket.connect()

        await expect(waitForSocketConnect(socket, 2000)).rejects.toThrow()
        expect(socket.connected).toBe(false)
    })

    /**
     * Test Case 4: Redis userId → socketId Mapping
     */
    test("should map userId to socketId in Redis", async () => {
        // Arrange: Create test user with session
        const { user, sessionToken } = await createTestUserForSocket(testPrisma)

        const socket = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket)

        // Act: Connect socket
        socket.connect()
        await waitForSocketConnect(socket)
        await waitForSocketEvent(socket, "authenticated")

        // Assert: Redis should have userId → socketId mapping
        const socketIds = await redis.smembers(`user:sockets:${user.id}`)
        expect(socket.id).toBeDefined()
        expect(socketIds).toContain(socket.id!) // oxlint-disable-line typescript/no-non-null-assertion

        // Assert: User should be marked online
        const isOnline = await redis.get(`user:online:${user.id}`)
        expect(isOnline).toBe("true")
    })

    /**
     * Test Case 5: Disconnect Cleanup in Redis
     */
    test("should cleanup Redis on disconnect", async () => {
        // Arrange: Create test user and connect
        const { user, sessionToken } = await createTestUserForSocket(testPrisma)

        const socket = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket)

        socket.connect()
        await waitForSocketConnect(socket)
        await waitForSocketEvent(socket, "authenticated")

        // Save socket ID before disconnect (it becomes undefined after disconnect)
        const socketIdBeforeDisconnect = socket.id
        expect(socketIdBeforeDisconnect).toBeDefined()

        // Act: Disconnect socket
        await disconnectSocket(socket)
        await new Promise((resolve) => setTimeout(resolve, 100)) // Wait for Redis cleanup

        // Assert: Redis should be cleaned up
        const socketIds = await redis.smembers(`user:sockets:${user.id}`)
        expect(socketIds).not.toContain(socketIdBeforeDisconnect)

        // User should be offline
        const isOnline = await redis.get(`user:online:${user.id}`)
        expect(isOnline).toBeNull()
    })

    /**
     * Test Case 6: Multi-Device Connections
     */
    test("should support multiple sockets for same user", async () => {
        // Arrange: Create test user with session
        const { user, sessionToken } = await createTestUserForSocket(testPrisma)

        // Act: Connect two sockets for same user
        const socket1 = createAuthenticatedSocketClient(sessionToken)
        const socket2 = createAuthenticatedSocketClient(sessionToken)
        connectedSockets.push(socket1, socket2)

        // Connect first socket and wait
        socket1.connect()
        await waitForSocketConnect(socket1, 10000)
        await waitForSocketEvent(socket1, "authenticated", 10000)

        // Add small delay between connections
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Connect second socket and wait
        socket2.connect()
        await waitForSocketConnect(socket2, 10000)
        await waitForSocketEvent(socket2, "authenticated", 10000)

        // Assert: Redis should have both socket IDs
        const socketIds = await redis.smembers(`user:sockets:${user.id}`)
        expect(socket1.id).toBeDefined()
        expect(socket2.id).toBeDefined()
        expect(socketIds).toContain(socket1.id!) // oxlint-disable-line typescript/no-non-null-assertion
        expect(socketIds).toContain(socket2.id!) // oxlint-disable-line typescript/no-non-null-assertion
        expect(socketIds.length).toBe(2)

        // User should be online
        const isOnline = await redis.get(`user:online:${user.id}`)
        expect(isOnline).toBe("true")

        // Save socket IDs before disconnect (they become undefined after disconnect)
        const socket1Id = socket1?.id
        const socket2Id = socket2.id! // oxlint-disable-line typescript/no-non-null-assertion

        // Act: Disconnect first socket
        await disconnectSocket(socket1)
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Assert: Second socket still active, user still online
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
        // Arrange: Use non-existent session token
        const invalidToken = `invalid-session-${Date.now()}`

        const socket = createAuthenticatedSocketClient(invalidToken)
        connectedSockets.push(socket)

        // Act & Assert: Should fail to connect
        socket.connect()

        await expect(waitForSocketConnect(socket, 2000)).rejects.toThrow()
        expect(socket.connected).toBe(false)
    })

    /**
     * Test Case 8: Expired Session Token Rejection
     */
    test("should reject expired session token", async () => {
        // Arrange: Create user with expired session
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

        // Act & Assert: Should fail to connect
        socket.connect()

        await expect(waitForSocketConnect(socket, 2000)).rejects.toThrow()
        expect(socket.connected).toBe(false)
    })
})
