/**
 * GraphQL Operations for Friends Feature
 *
 * Single source of truth for all Friends GraphQL strings.
 * Combines queries and mutations, using shared fragments.
 *
 * These are plain strings consumed by graphqlFetch() — no gql tag needed.
 * Fragments are inlined via template literal interpolation.
 */

import { USER_BASIC_FIELDS, FRIEND_REQUEST_FIELDS, FRIENDSHIP_FIELDS } from "../fragments/friends"

// ============================================================================
// Queries
// ============================================================================

export const SEARCH_USERS_QUERY = `
    query SearchUsers($query: String!) {
        searchUsers(query: $query) {
            ...UserBasicFields
        }
    }
    ${USER_BASIC_FIELDS}
`

export const GET_FRIENDS_QUERY = `
    query Friends {
        friends {
            ...UserBasicFields
        }
    }
    ${USER_BASIC_FIELDS}
`

export const GET_PENDING_REQUESTS_QUERY = `
    query PendingFriendRequests {
        pendingFriendRequests {
            ...FriendRequestFields
        }
    }
    ${FRIEND_REQUEST_FIELDS}
`

export const GET_SENT_REQUESTS_QUERY = `
    query SentFriendRequests {
        sentFriendRequests {
            ...FriendRequestFields
        }
    }
    ${FRIEND_REQUEST_FIELDS}
`

// ============================================================================
// Mutations
// ============================================================================

export const SEND_FRIEND_REQUEST_MUTATION = `
    mutation SendFriendRequest($userId: ID!) {
        sendFriendRequest(userId: $userId) {
            ...FriendRequestFields
        }
    }
    ${FRIEND_REQUEST_FIELDS}
`

export const ACCEPT_FRIEND_REQUEST_MUTATION = `
    mutation AcceptFriendRequest($requestId: ID!) {
        acceptFriendRequest(requestId: $requestId) {
            ...FriendshipFields
        }
    }
    ${FRIENDSHIP_FIELDS}
`

export const REJECT_FRIEND_REQUEST_MUTATION = `
    mutation RejectFriendRequest($requestId: ID!) {
        rejectFriendRequest(requestId: $requestId)
    }
`

export const CANCEL_FRIEND_REQUEST_MUTATION = `
    mutation CancelFriendRequest($requestId: ID!) {
        cancelFriendRequest(requestId: $requestId)
    }
`
