/**
 * Socket.io Test Fixtures
 *
 * Helper functions for testing Socket.io WebSocket connections.
 */

import { io as ioClient, type Socket } from "socket.io-client"
import type { PrismaClient } from "@generated/prisma/client"

/**
 * Socket.io Test Server URL
 */
const SOCKET_URL = "http://localhost:3000"

/**
 * Create authenticated Socket.io client
 *
 * Creates a Socket.io client with session cookie for authentication.
 *
 * @param sessionToken - Session token for authentication
 * @returns Socket.io client instance
 */
export function createAuthenticatedSocketClient(sessionToken: string): Socket {
    return ioClient(SOCKET_URL, {
        auth: {
            token: sessionToken,
        },
        extraHeaders: {
            Cookie: `better-auth.session_token=${sessionToken}`,
        },
        transports: ["websocket"],
        autoConnect: false,
    })
}

/**
 * Create unauthenticated Socket.io client
 *
 * Creates a Socket.io client without authentication (for testing rejection).
 *
 * @returns Socket.io client instance
 */
export function createUnauthenticatedSocketClient(): Socket {
    return ioClient(SOCKET_URL, {
        transports: ["websocket"],
        autoConnect: false,
    })
}

/**
 * Wait for Socket event
 *
 * Returns a promise that resolves when the specified event is received.
 * Useful for testing event-driven behavior.
 *
 * @param socket - Socket.io client instance
 * @param eventName - Event name to wait for
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves with event data
 */
export function waitForSocketEvent<T = unknown>(
    socket: Socket,
    eventName: string,
    timeout: number = 5000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout waiting for event: ${eventName}`))
        }, timeout)

        socket.once(eventName, (data: T) => {
            clearTimeout(timeoutId)
            resolve(data)
        })
    })
}

/**
 * Create test user with session for Socket.io tests
 *
 * Creates a user and valid session in the database.
 *
 * @param prisma - Prisma client instance
 * @returns Object with user, session, and sessionToken
 */
export async function createTestUserForSocket(prisma: PrismaClient): Promise<{
    user: {
        id: string
        email: string
        name: string | null
        image: string | null
        emailVerified: Date | null
        createdAt: Date
        updatedAt: Date
    }
    session: {
        id: string
        sessionToken: string
        userId: string
        expires: Date
    }
    sessionToken: string
}> {
    // Create test user
    const user = await prisma.user.create({
        data: {
            email: `test-socket-${Date.now()}@example.com`,
            name: "Socket Test User",
            emailVerified: new Date(),
        },
    })

    // Create valid session (expires in 7 days)
    const sessionToken = `test-socket-session-${Date.now()}`
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            sessionToken: sessionToken,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        },
    })

    return {
        user,
        session,
        sessionToken,
    }
}

/**
 * Wait for socket to connect
 *
 * Returns a promise that resolves when socket connects successfully.
 *
 * @param socket - Socket.io client instance
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when connected
 */
export function waitForSocketConnect(socket: Socket, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error("Timeout waiting for socket connection"))
        }, timeout)

        socket.once("connect", () => {
            clearTimeout(timeoutId)
            resolve()
        })

        socket.once("connect_error", (error: Error) => {
            clearTimeout(timeoutId)
            reject(error)
        })
    })
}

/**
 * Disconnect socket and wait for cleanup
 *
 * Disconnects socket and waits for disconnection event.
 *
 * @param socket - Socket.io client instance
 * @returns Promise that resolves when disconnected
 */
export function disconnectSocket(socket: Socket): Promise<void> {
    return new Promise((resolve) => {
        if (!socket.connected) {
            resolve()
            return
        }

        socket.once("disconnect", () => {
            resolve()
        })

        socket.disconnect()
    })
}
