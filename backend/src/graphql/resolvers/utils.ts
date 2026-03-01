/**
 * Shared resolver utilities
 *
 * Common helpers used across multiple resolver files.
 * Centralizing them here prevents duplication and makes the pattern
 * ("requireAuth, getParticipant, toISO") discoverable in one place.
 */

import { GraphQLError } from "graphql"
import type { GraphQLContext } from "../context"
import type { MessageCursor } from "../types"
import { ParticipantRole } from "@generated/prisma/enums"

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

/**
 * Assert the request is authenticated and return the current userId.
 * Throws UNAUTHENTICATED (HTTP 401) if not.
 *
 * Usage:
 *   const userId = requireAuth(context)
 */
export function requireAuth(context: GraphQLContext): string {
    if (!context.userId) {
        throw new GraphQLError("Not authenticated", {
            extensions: { code: "UNAUTHENTICATED", status: 401 },
        })
    }
    return context.userId
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Serialize a Date (or null/undefined) to ISO string or null.
 */
export function toISO(date: Date | null | undefined): string | null {
    return date ? date.toISOString() : null
}

// ---------------------------------------------------------------------------
// Friendship helpers
// ---------------------------------------------------------------------------

/**
 * Normalize friendship IDs so userId1 < userId2 (string sort order).
 * Enforces the @@unique([userId1, userId2]) constraint on the Friendship table.
 */
export function normalizeFriendshipIds(
    idA: string,
    idB: string
): { userId1: string; userId2: string } {
    return idA < idB ? { userId1: idA, userId2: idB } : { userId1: idB, userId2: idA }
}

/**
 * Assert the caller is one of the two parties in a friendship/friend-request record.
 * Throws FORBIDDEN (HTTP 403) if myId matches neither userId1 nor userId2.
 *
 * Usage:
 *   requireFriendshipParty(friendship, myId)
 */
export function requireFriendshipParty(
    friendship: { userId1: string; userId2: string },
    myId: string,
    errorMessage = "You are not a party to this friendship"
): void {
    if (friendship.userId1 !== myId && friendship.userId2 !== myId) {
        throw new GraphQLError(errorMessage, {
            extensions: { code: "FORBIDDEN", status: 403 },
        })
    }
}

// ---------------------------------------------------------------------------
// Conversation participant helper
// ---------------------------------------------------------------------------

/**
 * Fetch a single ConversationParticipant record for a (conversationId, userId) pair.
 * Returns null if the user is not a participant.
 *
 * Note: This makes a direct DB query (not via DataLoader) because it is used
 * for authorization checks where we need the result immediately and do NOT
 * want a stale cached value from the loader.
 */
export async function getParticipant(
    prisma: GraphQLContext["prisma"],
    conversationId: string,
    userId: string
): Promise<{ role: ParticipantRole; lastReadAt: Date | null } | null> {
    const p = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { role: true, lastReadAt: true },
    })
    if (!p) return null
    return { role: p.role, lastReadAt: p.lastReadAt }
}

// ---------------------------------------------------------------------------
// MessageCursor helpers
// ---------------------------------------------------------------------------

/**
 * Decode a MessageCursor back into its component parts.
 *
 * Cursor format: "${ISO8601 timestamp}_${messageId}"
 * Split on the last "_": ISO timestamps never contain "_", UUIDs never
 * contain "_", so the last "_" is always the separator.
 */
export function parseMessageCursor(cursor: MessageCursor): { createdAt: Date; id: string } {
    const idx = cursor.lastIndexOf("_")
    return {
        createdAt: new Date(cursor.slice(0, idx)),
        id: cursor.slice(idx + 1),
    }
}

/**
 * Create a MessageCursor from known DB values.
 * This is the canonical way to produce a cursor inside resolvers.
 */
export function makeMessageCursor(createdAt: Date, id: string): MessageCursor {
    return `${createdAt.toISOString()}_${id}` as MessageCursor
}

/**
 * Cast a raw string arriving at a system boundary (GraphQL argument) to
 * MessageCursor. Only call this at the boundary where the string originated
 * from a previous makeMessageCursor call (i.e. it was issued by this server).
 */
export function asMessageCursor(raw: string): MessageCursor {
    return raw as MessageCursor
}
