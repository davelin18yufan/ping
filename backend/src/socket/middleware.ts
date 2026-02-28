/**
 * Socket.io Authentication Middleware
 *
 * Verifies user session before allowing WebSocket connection.
 * Injects userId into socket instance for use in handlers.
 */

import type { Socket } from "socket.io"
import { verifySessionFromCookie } from "../lib/auth"

// ---------------------------------------------------------------------------
// Typed event maps
// These are the source of truth for all Socket.io events in the application.
// Socket<ClientToServerEvents, ServerToClientEvents> ensures that:
//   - socket.on("typing:start", (data) => ...) types data as { conversationId: string }
//   - socket.emit("typing:update", ...) is type-checked against the payload shape
// ---------------------------------------------------------------------------

/** Events the client sends to the server. */
export interface ClientToServerEvents {
    heartbeat: () => void
    "user:away": () => void
    "typing:start": (data: { conversationId: string }) => void
    "typing:stop": (data: { conversationId: string }) => void
}

/** Events the server sends to the client. */
export interface ServerToClientEvents {
    authenticated: (data: { userId: string; socketId: string; timestamp: string }) => void
    "presence:changed": (data: { userId: string; isOnline: boolean; timestamp: string }) => void
    "typing:update": (data: { userId: string; conversationId: string; isTyping: boolean }) => void
    "sync:required": (data: { conversationIds: string[] }) => void
}

/**
 * Authenticated Socket Interface
 *
 * Extends the typed Socket with userId injected by the auth middleware.
 */
export interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
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
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    next: (err?: Error) => void
): Promise<void> {
    try {
        // Get cookie header from handshake
        const cookieHeader = socket.handshake.headers.cookie

        if (!cookieHeader) {
            return next(new Error("Unauthorized: No session cookie"))
        }

        // Verify session using Better Auth
        const userId = await verifySessionFromCookie(cookieHeader)

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
