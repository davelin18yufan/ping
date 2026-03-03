/**
 * GraphQL Queries for Conversations Feature
 *
 * Plain template strings consumed by graphqlFetch() — no gql tag needed.
 * Fragments are inlined via template literal interpolation.
 */

import { CONVERSATION_BASIC_FIELDS, MESSAGE_FIELDS } from "../fragments/conversations"

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
`
