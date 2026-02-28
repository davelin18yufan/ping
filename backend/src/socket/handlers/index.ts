/**
 * Socket.io Handlers Index
 *
 * Centralized registration of all Socket.io event handlers.
 */

import type { Server as SocketIOServer } from "socket.io"
import type { AuthenticatedSocket, ClientToServerEvents, ServerToClientEvents } from "../middleware"
import { handleConnection } from "./connection"

/**
 * Register Connection Handlers
 *
 * Registers all Socket.io event handlers:
 * - connection: User connects via WebSocket
 * - disconnect: User disconnects (handled per-socket in connection handler)
 *
 * @param io - Socket.io server instance
 */
export function registerConnectionHandlers(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>
): void {
    io.on("connection", (socket) => {
        handleConnection(socket as AuthenticatedSocket)
    })

    console.log("✓ Socket.io connection handlers registered")
}
