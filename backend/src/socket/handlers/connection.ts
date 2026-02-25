/**
 * Socket.io Connection Handlers
 *
 * Handles WebSocket connection and disconnection events.
 * Manages user online status tracking via Redis.
 * Joins conversation rooms on connect so message:new events are received.
 */

import type { AuthenticatedSocket } from "../middleware"
import {
    addUserSocket,
    removeUserSocket,
    getUserSockets,
    setPersistentUserOnline,
    setUserOffline,
} from "@/lib/redis"
import { prisma } from "@/lib/prisma"

/**
 * Handle Socket Connection
 *
 * Called when a user successfully connects via WebSocket.
 * Performs:
 * - Add socket to user's socket list in Redis (user:sockets:{userId})
 * - Set user online status in Redis (user:online:{userId})
 * - Join all conversation rooms the user is a participant of
 * - Send authenticated event to client
 * - If reconnect after missed events: send sync:required so client can
 *   catch up using messages(after: lastKnownCursor) for each conversation
 * - Register disconnect handler
 *
 * @param socket - Authenticated socket instance
 */
export async function handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId } = socket

    try {
        // Add socket to user's socket list in Redis
        await addUserSocket(userId, socket.id)

        // Set user online status in Redis (persistent, no TTL)
        await setPersistentUserOnline(userId)

        // Join all conversation rooms this user participates in
        const roomIds = await joinConversationRooms(socket, userId)

        // Send authenticated event to client
        socket.emit("authenticated", {
            userId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
        })

        // If Socket.io connection state recovery did NOT restore buffered events,
        // the client may have missed messages while offline.
        // Emit sync:required so the client can call messages(after:) for each
        // conversation to fetch any missed messages since their last known cursor.
        if (!socket.recovered && roomIds.length > 0) {
            socket.emit("sync:required", { conversationIds: roomIds })
        }

        console.log(`✓ User ${userId} connected (socket: ${socket.id})`, {
            color: "rgb(0, 255, 0)",
        })

        // Register disconnect handler
        socket.on("disconnect", (reason) => handleDisconnect(socket, reason))
    } catch (error) {
        console.error(`Failed to handle connection for user ${userId}:`, error)
        socket.disconnect(true)
    }
}

/**
 * Join all conversation rooms for the user.
 *
 * Queries the DB for all conversations the user participates in
 * and joins each room so the socket receives message:new and participant:changed events.
 *
 * @param socket - Authenticated socket instance
 * @param userId - User ID
 * @returns Array of conversation room IDs that were joined
 */
async function joinConversationRooms(
    socket: AuthenticatedSocket,
    userId: string
): Promise<string[]> {
    const participants = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
    })

    const roomIds = participants.map((p) => p.conversationId)
    if (roomIds.length > 0) {
        await socket.join(roomIds)
        console.log(`✓ User ${userId} joined ${roomIds.length} conversation room(s)`, {
            color: "rgb(0, 255, 0)",
        })
    }
    return roomIds
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
        await removeUserSocket(userId, socket.id)

        // Check if user has other active sockets
        const remainingSockets = await getUserSockets(userId)

        // If no other sockets, set user offline
        if (remainingSockets.length === 0) {
            await setUserOffline(userId)
            ;(console.log(`✓ User ${userId} went offline (reason: ${reason})`),
                { color: "rgb(251, 0, 0)" })
        } else {
            console.log(
                `✓ User ${userId} disconnected one socket (${remainingSockets.length} remaining)`,
                { color: "rgb(251, 0, 0)" }
            )
        }
    } catch (error) {
        console.error(`Failed to handle disconnection for user ${userId}:`, error)
    }
}
