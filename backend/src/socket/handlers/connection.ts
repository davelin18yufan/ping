/**
 * Socket.io Connection Handlers
 *
 * Handles WebSocket connection and disconnection events.
 * Manages user online status tracking via Redis using TTL-based heartbeat.
 * Joins conversation rooms on connect so message:new events are received.
 *
 * Online presence semantics:
 * - On connect: setex user:online:{id} 35 (35s TTL)
 * - On heartbeat event: refresh TTL to 35s (client sends every 30s while active)
 * - On user:away event: del user:online:{id} immediately
 * - On disconnect (no remaining sockets): del user:online:{id} immediately
 * - TTL expiry (no heartbeat for 35s): key vanishes → effectively offline
 */

import type { AuthenticatedSocket } from "../middleware"
import {
    addUserSocket,
    removeUserSocket,
    getUserSockets,
    setUserOnline,
    setUserOffline,
} from "@/lib/redis"
import { prisma } from "@/lib/prisma"
import { handleTypingStart, handleTypingStop } from "./typing"

/** TTL in seconds for the user:online key. Heartbeat interval is 30s, giving 5s buffer. */
const PRESENCE_TTL = 35

/**
 * Broadcast presence change to all conversation rooms the user belongs to.
 *
 * Queries the DB for the user's conversations and emits `presence:changed`
 * to each room. Only users who share a conversation with this user will
 * receive the notification (no global broadcast).
 *
 * @param socket - Authenticated socket (used to access namespace)
 * @param userId - User whose presence changed
 * @param isOnline - New online state
 */
async function broadcastPresence(
    socket: AuthenticatedSocket,
    userId: string,
    isOnline: boolean
): Promise<void> {
    try {
        const participants = await prisma.conversationParticipant.findMany({
            where: { userId },
            select: { conversationId: true },
        })

        const payload = {
            userId,
            isOnline,
            timestamp: new Date().toISOString(),
        }

        for (const { conversationId } of participants) {
            socket.nsp.to(conversationId).emit("presence:changed", payload)
        }
    } catch (error) {
        console.error(`Failed to broadcast presence for user ${userId}:`, error)
    }
}

/**
 * Handle Socket Connection
 *
 * Called when a user successfully connects via WebSocket.
 * Performs:
 * - Add socket to user's socket list in Redis (user:sockets:{userId})
 * - Set user online status in Redis with 35s TTL (user:online:{userId})
 * - Join all conversation rooms the user is a participant of
 * - Send authenticated event to client
 * - If reconnect after missed events: send sync:required so client can
 *   catch up using messages(after: lastKnownCursor) for each conversation
 * - Broadcast presence:changed { isOnline: true } to conversation rooms
 * - Register heartbeat, user:away, and disconnect handlers
 *
 * @param socket - Authenticated socket instance
 */
export async function handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId } = socket

    try {
        // Add socket to user's socket list in Redis
        await addUserSocket(userId, socket.id)

        // Set user online with TTL (heartbeat will keep this alive)
        await setUserOnline(userId, PRESENCE_TTL)

        // Join all conversation rooms this user participates in
        const roomIds = await joinConversationRooms(socket, userId)

        // Register all event handlers BEFORE emitting authenticated.
        // This prevents a race condition where the client reacts to authenticated
        // (e.g. sends heartbeat / user:away / disconnects) before the server has
        // finished awaiting broadcastPresence and registered the handlers.

        // Heartbeat: client sends every 30s while tab/app is in foreground.
        // Refreshes the Redis TTL to keep the user marked as online.
        socket.on("heartbeat", async () => {
            try {
                await setUserOnline(userId, PRESENCE_TTL)
            } catch (error) {
                console.error(`Failed to refresh heartbeat for user ${userId}:`, error)
            }
        })

        // Typing indicators: client notifies when user starts/stops typing
        socket.on("typing:start", (data) => handleTypingStart(socket, data))
        socket.on("typing:stop", (data) => handleTypingStop(socket, data))

        // Away: client sends when tab/app goes to background or page closes.
        // Immediately marks the user as offline without waiting for TTL expiry.
        socket.on("user:away", async () => {
            try {
                await setUserOffline(userId)
                await broadcastPresence(socket, userId, false)
            } catch (error) {
                console.error(`Failed to handle away event for user ${userId}:`, error)
            }
        })

        // Disconnect handler
        socket.on("disconnect", (reason) => handleDisconnect(socket, reason))

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

        // Broadcast online status to all conversation room members.
        // Done last so all handlers are already in place when the client reacts.
        await broadcastPresence(socket, userId, true)

        console.log(`✓ User ${userId} connected (socket: ${socket.id})`, {
            color: "rgb(0, 255, 0)",
        })
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
 * - Set user offline and broadcast presence:changed if no other sockets remain
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

        // If no other sockets, set user offline and notify conversation members
        if (remainingSockets.length === 0) {
            await setUserOffline(userId)
            await broadcastPresence(socket, userId, false)
            console.log(`✓ User ${userId} went offline (reason: ${reason})`, {
                color: "rgb(251, 0, 0)",
            })
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
