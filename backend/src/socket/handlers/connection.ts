/**
 * Socket.io Connection Handlers
 *
 * Handles WebSocket connection and disconnection events.
 * Manages user online status tracking via Redis.
 */

import type { AuthenticatedSocket } from "../middleware"
import { redis } from "../../lib/redis"

/**
 * Handle Socket Connection
 *
 * Called when a user successfully connects via WebSocket.
 * Performs:
 * - Add socket to user's socket list in Redis
 * - Set user online status in Redis
 * - Send authenticated event to client
 * - Register disconnect handler
 *
 * @param socket - Authenticated socket instance
 */
export async function handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId } = socket

    try {
        // Add socket to user's socket list in Redis
        // Format: user:sockets:{userId} -> Set of socket IDs
        await redis.sadd(`user:sockets:${userId}`, socket.id)

        // Set user online status in Redis
        // Format: user:online:{userId} -> "true"
        await redis.set(`user:online:${userId}`, "true")

        // Send authenticated event to client
        socket.emit("authenticated", {
            userId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
        })

        console.log(`✓ User ${userId} connected (socket: ${socket.id})`)

        // Register disconnect handler
        socket.on("disconnect", (reason) => handleDisconnect(socket, reason))
    } catch (error) {
        console.error(`Failed to handle connection for user ${userId}:`, error)
        socket.disconnect(true)
    }
}

/**
 * Handle Socket Disconnection
 *
 * Called when a user disconnects from WebSocket.
 * Performs:
 * - Remove socket from user's socket list in Redis
 * - Check if user has other active sockets
 * - Set user offline if no other sockets remain
 *
 * @param socket - Authenticated socket instance
 * @param reason - Disconnection reason
 */
export async function handleDisconnect(socket: AuthenticatedSocket, reason: string): Promise<void> {
    const { userId } = socket

    try {
        // Remove socket from user's socket list
        await redis.srem(`user:sockets:${userId}`, socket.id)

        // Check if user has other active sockets
        const remainingSockets = await redis.smembers(`user:sockets:${userId}`)

        // If no other sockets, set user offline
        if (remainingSockets.length === 0) {
            await redis.del(`user:online:${userId}`)
            console.log(`✓ User ${userId} went offline (reason: ${reason})`)
        } else {
            console.log(
                `✓ User ${userId} disconnected one socket (${remainingSockets.length} remaining)`
            )
        }
    } catch (error) {
        console.error(`Failed to handle disconnection for user ${userId}:`, error)
    }
}
