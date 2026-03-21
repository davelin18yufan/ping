/**
 * GraphQL Operations for Conversations Feature
 *
 * Single source of truth for all conversation-related queries and mutations.
 * Plain template strings consumed by graphqlFetch() — no gql tag needed.
 * Fragments are inlined via template literal interpolation.
 *
 * Queries:
 *   - CONVERSATIONS_QUERY     — full list for authenticated user
 *   - CONVERSATION_QUERY      — single conversation by ID
 *   - MESSAGES_QUERY          — paginated message history (dual-cursor)
 *
 * Mutations grouped by domain:
 *   - Conversation lifecycle  (getOrCreate, createGroup)
 *   - Group management        (invite, remove, leave, updateSettings)
 *   - Pinning                 (pin, unpin)
 *   - Messaging               (sendMessage, markRead)
 *   - Blocking                (blockUser, unblockUser)
 */

import {
    CONVERSATION_BASIC_FIELDS,
    MESSAGE_FIELDS,
    USER_CONVERSATION_FIELDS,
} from "../fragments/conversations"

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch the full conversations list for the authenticated user.
 * Returns basic conversation info including last message and participants.
 */
export const CONVERSATIONS_QUERY = `
    query Conversations {
        conversations {
            ...ConversationBasicFields
        }
    }
    ${CONVERSATION_BASIC_FIELDS}
`

/**
 * Fetch a single conversation by ID.
 * Used when entering a chat to ensure fresh participant and settings data.
 */
export const CONVERSATION_QUERY = `
    query Conversation($id: ID!) {
        conversation(id: $id) {
            ...ConversationBasicFields
        }
    }
    ${CONVERSATION_BASIC_FIELDS}
`

/**
 * Fetch a paginated message history for a conversation.
 * Supports dual-cursor pagination:
 *   - before: load older messages (scroll up)
 *   - after:  load newer messages (scroll down)
 */
export const MESSAGES_QUERY = `
    query Messages(
        $conversationId: ID!
        $before: String
        $after: String
        $limit: Int
    ) {
        messages(
            conversationId: $conversationId
            before: $before
            after: $after
            limit: $limit
        ) {
            messages {
                ...MessageFields
            }
            nextCursor
            prevCursor
        }
    }
    ${MESSAGE_FIELDS}
    ${USER_CONVERSATION_FIELDS}
`

// ============================================================================
// Conversation lifecycle
// ============================================================================

/**
 * Get an existing ONE_TO_ONE conversation with a user or create one if none exists.
 * Primary entry point for starting a direct message.
 */
export const GET_OR_CREATE_CONVERSATION_MUTATION = `
    mutation GetOrCreateConversation($userId: ID!) {
        getOrCreateConversation(userId: $userId) {
            ...ConversationBasicFields
        }
    }
    ${CONVERSATION_BASIC_FIELDS}
`

/**
 * Create a new GROUP conversation with a name and initial member list.
 * The caller is automatically added as OWNER.
 */
export const CREATE_GROUP_MUTATION = `
    mutation CreateGroupConversation($name: String!, $userIds: [ID!]!) {
        createGroupConversation(name: $name, userIds: $userIds) {
            ...ConversationBasicFields
        }
    }
    ${CONVERSATION_BASIC_FIELDS}
`

// ============================================================================
// Group management
// ============================================================================

/**
 * Invite an additional user to an existing group conversation.
 * Returns the updated conversation including the new participant.
 */
export const INVITE_TO_GROUP_MUTATION = `
    mutation InviteToGroup($conversationId: ID!, $userId: ID!) {
        inviteToGroup(conversationId: $conversationId, userId: $userId) {
            ...ConversationBasicFields
        }
    }
    ${CONVERSATION_BASIC_FIELDS}
`

/**
 * Remove a participant from a group conversation.
 * Only the OWNER can perform this action (enforced server-side).
 */
export const REMOVE_FROM_GROUP_MUTATION = `
    mutation RemoveFromGroup($conversationId: ID!, $userId: ID!) {
        removeFromGroup(conversationId: $conversationId, userId: $userId)
    }
`

/**
 * Leave a group conversation voluntarily.
 * If the caller is the OWNER, a successorUserId must be provided
 * to transfer ownership before leaving.
 */
export const LEAVE_GROUP_MUTATION = `
    mutation LeaveGroup($conversationId: ID!, $successorUserId: ID) {
        leaveGroup(conversationId: $conversationId, successorUserId: $successorUserId)
    }
`

/**
 * Update the group name and/or permission settings.
 * Returns the updated conversation with the new settings applied.
 */
export const UPDATE_GROUP_SETTINGS_MUTATION = `
    mutation UpdateGroupSettings(
        $conversationId: ID!
        $name: String
        $settings: GroupSettingsInput
    ) {
        updateGroupSettings(
            conversationId: $conversationId
            name: $name
            settings: $settings
        ) {
            ...ConversationBasicFields
        }
    }
    ${CONVERSATION_BASIC_FIELDS}
`

// ============================================================================
// Pinning
// ============================================================================

/**
 * Pin a conversation to the top of the user's conversation list.
 */
export const PIN_CONVERSATION_MUTATION = `
    mutation PinConversation($conversationId: ID!) {
        pinConversation(conversationId: $conversationId)
    }
`

/**
 * Unpin a previously pinned conversation.
 */
export const UNPIN_CONVERSATION_MUTATION = `
    mutation UnpinConversation($conversationId: ID!) {
        unpinConversation(conversationId: $conversationId)
    }
`

// ============================================================================
// Messaging
// ============================================================================

/**
 * Send a text message to a conversation.
 * Returns the created Message with delivery status SENT.
 */
export const SEND_MESSAGE_MUTATION = `
    mutation SendMessage($conversationId: ID!, $content: String!) {
        sendMessage(conversationId: $conversationId, content: $content) {
            ...MessageFields
        }
    }
    ${MESSAGE_FIELDS}
    ${USER_CONVERSATION_FIELDS}
`

/**
 * Mark all unread messages in a conversation as READ for the current user.
 * Resets the unreadCount to 0 for this conversation.
 */
export const MARK_READ_MUTATION = `
    mutation MarkMessagesAsRead($conversationId: ID!) {
        markMessagesAsRead(conversationId: $conversationId)
    }
`

// ============================================================================
// Blocking
// ============================================================================

/**
 * Block a user, preventing them from sending messages or viewing presence.
 */
export const BLOCK_USER_MUTATION = `
    mutation BlockUser($userId: ID!) {
        blockUser(userId: $userId)
    }
`

/**
 * Unblock a previously blocked user.
 */
export const UNBLOCK_USER_MUTATION = `
    mutation UnblockUser($userId: ID!) {
        unblockUser(userId: $userId)
    }
`

// ============================================================================
// Sonic Ping
// ============================================================================

/**
 * Send a Sonic Ping ritual message to the other participant in a conversation.
 * Creates a persisted SONIC_PING message and emits a sonicPing:incoming socket event
 * to all other participants in real time.
 */
export const SEND_SONIC_PING_MUTATION = `
    mutation SendSonicPing($conversationId: ID!) {
        sendSonicPing(conversationId: $conversationId) {
            id
            conversationId
            content
            messageType
            imageUrl
            createdAt
            status
            sender {
                id
                name
                email
                image
                isOnline
            }
        }
    }
`

/**
 * Send a ritual interaction message to another participant.
 * Creates a persisted ritual message and emits a ritual:incoming socket event
 * to all other participants in real time.
 */
export const SEND_RITUAL_MUTATION = `
    mutation SendRitual($conversationId: ID!, $ritualType: RitualType!) {
        sendRitual(conversationId: $conversationId, ritualType: $ritualType) {
            id
            conversationId
            content
            messageType
            imageUrl
            createdAt
            status
            sender {
                id
                name
                email
                image
                isOnline
            }
        }
    }
`
