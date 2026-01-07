/**
 * Socket.io Authentication Middleware
 *
 * Verifies user session before allowing WebSocket connection.
 * Injects userId into socket instance for use in handlers.
 */

import type { Socket } from "socket.io"
import { verifySession } from "../lib/auth"

/**
 * Authenticated Socket Interface
 *
 * Extends Socket with userId property.
 */
export interface AuthenticatedSocket extends Socket {
    userId: string
}

/**
 * Socket.io Authentication Middleware
 *
 * Verifies Better Auth session from cookie header.
 * Rejects connection if session is invalid or missing.
 *
 * @param socket - Socket.io socket instance
 * @param next - Callback to continue or reject connection
 */
export async function socketAuthMiddleware(
    socket: Socket,
    next: (err?: Error) => void
): Promise<void> {
    try {
        // Get cookie header from handshake
        const cookieHeader = socket.handshake.headers.cookie

        if (!cookieHeader) {
            return next(new Error("Unauthorized: No session cookie"))
        }

        // Create a mock Request object for verifySession
        const mockRequest = new Request("http://localhost", {
            headers: {
                cookie: cookieHeader,
            },
        })

        // Verify session using Better Auth
        const userId = await verifySession(mockRequest)

        if (!userId) {
            return next(new Error("Unauthorized: Invalid session"))
        }

        // Inject userId into socket
        ;(socket as AuthenticatedSocket).userId = userId

        // Allow connection
        next()
    } catch (error) {
        console.error("Socket authentication failed:", error)
        next(new Error("Unauthorized: Authentication failed"))
    }
}
