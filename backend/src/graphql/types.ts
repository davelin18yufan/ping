/**
 * Shared GraphQL domain types
 *
 * Centralizes all "parent" shapes (raw data passed between resolver layers)
 * and record types used by both DataLoaders and resolvers.
 *
 * Rule: This file must NOT import from resolver files or loaders.ts to
 * avoid circular dependencies. It is the leaf of the dependency graph.
 */

// ---------------------------------------------------------------------------
// Branded / Opaque types
// ---------------------------------------------------------------------------

/**
 * Lightweight nominal typing for TypeScript's structural type system.
 *
 * Usage:
 *   type FooId = Brand<string, "FooId">
 *
 * At runtime Brand<T, B> is identical to T — the brand exists only in the
 * type system and is erased by the compiler. This prevents accidental
 * assignment between logically distinct string types (e.g. passing a raw
 * cursor string where a MessageCursor is required).
 */
declare const __brand: unique symbol
export type Brand<T, B> = T & { readonly [__brand]: B }

/**
 * Opaque cursor for message pagination.
 *
 * Encoding: "${ISO8601 timestamp}_${messageId}"
 * e.g. "2026-02-25T10:30:00.000Z_018e2f4a-..."
 *
 * Clients must treat this as an opaque handle and never construct one
 * manually. Use the factory functions in resolvers/utils.ts:
 *   - makeMessageCursor(createdAt, id) — create from known DB values
 *   - asMessageCursor(raw)             — cast a trusted boundary string
 *   - parseMessageCursor(cursor)       — decode back to { createdAt, id }
 */
export type MessageCursor = Brand<string, "MessageCursor">

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/**
 * Raw user record returned by the user DataLoader.
 * All dates are serialized as ISO strings.
 */
export type UserRecord = {
    id: string
    email: string
    emailVerified: string | null
    name: string | null
    image: string | null
    createdAt: string
    updatedAt: string
}

// ---------------------------------------------------------------------------
// Conversation participant
// ---------------------------------------------------------------------------

/**
 * Raw participant record returned by the participants DataLoader.
 * Used as the parent object for ConversationParticipant type resolvers.
 */
export type ParticipantRecord = {
    userId: string
    conversationId: string
    role: "OWNER" | "MEMBER"
    joinedAt: string
    lastReadAt: string | null
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

/**
 * Raw message record returned by loaders and resolvers.
 * Used as the parent object for Message type resolvers.
 */
export type MessageRecord = {
    id: string
    conversationId: string
    senderId: string
    content: string | null
    messageType: "TEXT" | "IMAGE"
    imageUrl: string | null
    createdAt: string
    status: "SENT" | "DELIVERED" | "READ"
}

// ---------------------------------------------------------------------------
// Conversation resolver parent
// ---------------------------------------------------------------------------

/**
 * Shape returned by conversation query/mutation resolvers.
 * Used as the parent object for Conversation type resolvers.
 */
export type ConversationParent = {
    id: string
    type: "ONE_TO_ONE" | "GROUP"
    name: string | null
    pinnedAt: string | null
    onlyOwnerCanInvite: boolean
    onlyOwnerCanKick: boolean
    onlyOwnerCanEdit: boolean
    createdAt: string
}

// ---------------------------------------------------------------------------
// Friends resolver parents
// ---------------------------------------------------------------------------

/**
 * Shape returned by friend request query/mutation resolvers.
 * Used as the parent object for FriendRequest type resolvers.
 */
export type FriendRequestParent = {
    id: string
    status: string
    createdAt: string
    updatedAt: string
    senderId: string
    receiverId: string
}

/**
 * Shape returned by friendship query resolvers.
 * Used as the parent object for Friendship type resolvers.
 */
export type FriendshipParent = {
    id: string
    since: string
    friendId: string
}
