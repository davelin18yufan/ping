/**
 * TypeScript interfaces for the Conversations feature.
 * Mirrors the GraphQL schema defined in the SDD.
 *
 * The base User type is imported from the friends feature.
 * ConversationUser extends it with the real-time presence field.
 */

import type { User } from "@/types/friends"

// ============================================================================
// Enum-style union types (matching GraphQL enums)
// ============================================================================

export type ConversationType = "ONE_TO_ONE" | "GROUP"

export type MessageType = "TEXT" | "IMAGE" | "SONIC_PING"

export type MessageStatusType = "SENT" | "DELIVERED" | "READ"

export type ParticipantRole = "OWNER" | "MEMBER"

// ============================================================================
// Extended User with presence field (used inside conversation payloads)
// ============================================================================

export type ConversationUser = User & {
    isOnline: boolean
}

// ============================================================================
// Core domain interfaces
// ============================================================================

export interface GroupSettings {
    onlyOwnerCanInvite: boolean
    onlyOwnerCanKick: boolean
    onlyOwnerCanEdit: boolean
}

export interface RitualLabel {
    ritualType: string
    labelOwn: string
    labelOther: string
}

export interface ConversationParticipant {
    user: ConversationUser
    role: ParticipantRole
    isFriend: boolean
    joinedAt: string
}

export interface Message {
    id: string
    conversationId: string
    sender: ConversationUser
    content: string | null
    messageType: MessageType
    imageUrl: string | null
    createdAt: string
    status: MessageStatusType
}

export interface Conversation {
    id: string
    type: ConversationType
    name: string | null
    participants: ConversationParticipant[]
    lastMessage: Message | null
    unreadCount: number
    pinnedAt: string | null
    settings: GroupSettings | null
    createdAt: string
    allowRituals: boolean
    ritualLabels: RitualLabel[]
}

export interface MessagePage {
    messages: Message[]
    nextCursor: string | null
    prevCursor: string | null
}

// ============================================================================
// Pagination parameter type for dual-cursor infinite query
// ============================================================================

/**
 * Page parameter for the messages infinite query.
 * - undefined  → initial page (no cursor)
 * - { before } → load older messages (scroll up)
 * - { after }  → load newer messages (scroll down)
 */
export type MessagePageParam = undefined | { before: string } | { after: string }
