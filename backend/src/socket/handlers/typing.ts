/**
 * Socket.io Typing Indicator Handlers
 *
 * Handles client typing:start and typing:stop events.
 *
 * Protocol:
 *   Client → Server  typing:start  { conversationId: string }
 *   Client → Server  typing:stop   { conversationId: string }
 *   Server → Room    typing:update { userId: string, conversationId: string, isTyping: boolean }
 *
 * Redis keys:
 *   typing:{conversationId}:{userId}  STRING "1"  EX 8
 *
 * Authorization: only conversation participants may emit typing events.
 * Non-participants are silently ignored (no error emitted to client).
 */

import type { AuthenticatedSocket } from "../middleware"
import { setTypingIndicator, clearTypingIndicator } from "@/lib/redis"
import { prisma } from "@/lib/prisma"

/** Payload sent by the client for both typing:start and typing:stop. */
interface TypingEventData {
    conversationId: string
}

/** Payload broadcast to the conversation room. */
interface TypingUpdatePayload {
    userId: string
    conversationId: string
    isTyping: boolean
}

/**
 * Check whether userId is a participant of conversationId.
 *
 * @param conversationId - Conversation to check
 * @param userId - User to verify
 * @returns true if the user is a participant
 */
async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const record = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { userId: true },
    })
    return record !== null
}

/**
 * Handle typing:start event.
 *
 * 1. Verify the sender is a conversation participant (silent ignore if not).
 * 2. Set typing:{conversationId}:{userId} in Redis with 8s TTL.
 * 3. Broadcast typing:update { isTyping: true } to all room members except sender.
 *
 * @param socket - Authenticated socket of the sender
 * @param data - Event payload containing conversationId
 */
export async function handleTypingStart(
    socket: AuthenticatedSocket,
    data: TypingEventData
): Promise<void> {
    const { userId } = socket
    const { conversationId } = data

    if (!conversationId) {
        return
    }

    try {
        // Authorization: silent ignore for non-participants
        const allowed = await isParticipant(conversationId, userId)
        if (!allowed) {
            return
        }

        // Persist typing indicator in Redis
        await setTypingIndicator(conversationId, userId)

        // Broadcast to other room members
        const payload: TypingUpdatePayload = { userId, conversationId, isTyping: true }
        socket.to(conversationId).emit("typing:update", payload)
    } catch (error) {
        console.error(`typing:start error for user ${userId} in ${conversationId}:`, error)
    }
}

/**
 * Handle typing:stop event.
 *
 * 1. Verify the sender is a conversation participant (silent ignore if not).
 * 2. Delete typing:{conversationId}:{userId} from Redis.
 * 3. Broadcast typing:update { isTyping: false } to all room members except sender.
 *
 * @param socket - Authenticated socket of the sender
 * @param data - Event payload containing conversationId
 */
export async function handleTypingStop(
    socket: AuthenticatedSocket,
    data: TypingEventData
): Promise<void> {
    const { userId } = socket
    const { conversationId } = data

    if (!conversationId) {
        return
    }

    try {
        // Authorization: silent ignore for non-participants
        const allowed = await isParticipant(conversationId, userId)
        if (!allowed) {
            return
        }

        // Remove typing indicator from Redis
        await clearTypingIndicator(conversationId, userId)

        // Broadcast to other room members
        const payload: TypingUpdatePayload = { userId, conversationId, isTyping: false }
        socket.to(conversationId).emit("typing:update", payload)
    } catch (error) {
        console.error(`typing:stop error for user ${userId} in ${conversationId}:`, error)
    }
}
