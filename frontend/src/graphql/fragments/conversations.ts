/**
 * GraphQL Fragments for Conversations Feature
 *
 * Plain template string fragments (no gql tag needed).
 * Consumed via string interpolation in queries and mutations.
 *
 * Fragment dependency order:
 *   CONVERSATION_PARTICIPANT_FIELDS → uses USER_CONVERSATION_FIELDS
 *   MESSAGE_FIELDS                  → uses USER_CONVERSATION_FIELDS
 *   CONVERSATION_BASIC_FIELDS       → uses MESSAGE_FIELDS + CONVERSATION_PARTICIPANT_FIELDS
 */

/**
 * Minimal User fields used within conversation payloads.
 * Includes isOnline for real-time presence display.
 */
const USER_CONVERSATION_FIELDS = `
    fragment UserConversationFields on User {
        id
        name
        image
        isOnline
    }
`

/**
 * Participant entry in a conversation.
 * Includes role, friendship status, and join timestamp.
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
    ${USER_CONVERSATION_FIELDS}
`

/**
 * Full message payload including sender identity and delivery status.
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
    ${USER_CONVERSATION_FIELDS}
`

/**
 * Core conversation payload.
 * Includes the last message (for conversation list previews) and all participants.
 * Group settings are null for ONE_TO_ONE conversations.
 */
export const CONVERSATION_BASIC_FIELDS = `
    fragment ConversationBasicFields on Conversation {
        id
        type
        name
        pinnedAt
        unreadCount
        createdAt
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
`
