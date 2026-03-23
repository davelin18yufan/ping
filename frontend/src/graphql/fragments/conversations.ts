/**
 * GraphQL Fragments for Conversations Feature
 *
 * Plain template string fragments (no gql tag needed).
 * Consumed via string interpolation in queries and mutations.
 *
 * IMPORTANT: Each fragment must be included ONCE per document.
 * Sub-fragments do NOT inline their own dependencies here — the
 * top-level query/mutation is responsible for assembling all fragments.
 *
 * Fragment dependency order (for correct interpolation):
 *   USER_CONVERSATION_FIELDS  (leaf — no dependencies)
 *   MESSAGE_FIELDS            (uses ...UserConversationFields)
 *   CONVERSATION_PARTICIPANT_FIELDS (uses ...UserConversationFields)
 *   CONVERSATION_BASIC_FIELDS (uses all three above)
 */

/**
 * Minimal User fields used within conversation payloads.
 * Includes isOnline for real-time presence display.
 */
export const USER_CONVERSATION_FIELDS = `
    fragment UserConversationFields on User {
        id
        name
        image
        isOnline
    }
`

/**
 * Full message payload including sender identity and delivery status.
 * Depends on: UserConversationFields (must be included by consumer).
 */
export const MESSAGE_FIELDS = `
    fragment MessageFields on Message {
        id
        conversationId
        sender {
            ...UserConversationFields
        }
        content
        messageType
        imageUrl
        createdAt
        status
    }
`

/**
 * Participant entry in a conversation.
 * Includes role, friendship status, and join timestamp.
 * Depends on: UserConversationFields (must be included by consumer).
 */
export const CONVERSATION_PARTICIPANT_FIELDS = `
    fragment ConversationParticipantFields on ConversationParticipant {
        user {
            ...UserConversationFields
        }
        role
        isFriend
        joinedAt
    }
`

/**
 * Core conversation payload.
 * Includes the last message (for conversation list previews) and all participants.
 * Group settings are null for ONE_TO_ONE conversations.
 * Ritual fields: allowRituals (group toggle) and ritualLabels (per-conversation overrides).
 *
 * Assembles all three dependency fragments exactly once.
 */
export const CONVERSATION_BASIC_FIELDS = `
    fragment ConversationBasicFields on Conversation {
        id
        type
        name
        pinnedAt
        unreadCount
        createdAt
        allowRituals
        ritualLabels {
            ritualType
            labelOwn
            labelOther
        }
        lastMessage {
            ...MessageFields
        }
        participants {
            ...ConversationParticipantFields
        }
        settings {
            onlyOwnerCanInvite
            onlyOwnerCanKick
            onlyOwnerCanEdit
        }
    }
    ${MESSAGE_FIELDS}
    ${CONVERSATION_PARTICIPANT_FIELDS}
    ${USER_CONVERSATION_FIELDS}
`
