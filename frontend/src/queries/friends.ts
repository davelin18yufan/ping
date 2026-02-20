/**
 * TanStack Query Options for Friends Feature
 *
 * Query options factories using queryOptions() for type-safe reusable patterns.
 * Follow TanStack Query v5 best practices with proper staleTime and gcTime.
 */

import { queryOptions } from "@tanstack/react-query"

import { graphqlFetch } from "@/lib/graphql-client"
import type { FriendRequest, User } from "@/types/friends"

// ---------------------------------------------------------------------------
// GraphQL Query Strings (plain strings, no gql tag)
// ---------------------------------------------------------------------------

const SEARCH_USERS_QUERY = `
    query SearchUsers($query: String!) {
        searchUsers(query: $query) {
            id
            name
            email
            image
        }
    }
`

const GET_FRIENDS_QUERY = `
    query Friends {
        friends {
            id
            name
            email
            image
        }
    }
`

const GET_PENDING_REQUESTS_QUERY = `
    query PendingFriendRequests {
        pendingFriendRequests {
            id
            status
            createdAt
            updatedAt
            sender {
                id
                name
                email
                image
            }
            receiver {
                id
                name
                email
                image
            }
        }
    }
`

const GET_SENT_REQUESTS_QUERY = `
    query SentFriendRequests {
        sentFriendRequests {
            id
            status
            createdAt
            updatedAt
            sender {
                id
                name
                email
                image
            }
            receiver {
                id
                name
                email
                image
            }
        }
    }
`

// ---------------------------------------------------------------------------
// Query Options Factories (v5 pattern with queryOptions)
// ---------------------------------------------------------------------------

/**
 * Search users by query string
 *
 * Enabled only when query >= 2 characters (guard condition)
 * Short staleTime (30s) since search results change frequently
 */
export const searchUsersQueryOptions = (query: string) =>
    queryOptions({
        queryKey: ["friends", "search", query] as const,
        queryFn: async ({ signal }) => {
            const data = await graphqlFetch<{ searchUsers: User[] }>(
                SEARCH_USERS_QUERY,
                { query },
                signal
            )
            return data.searchUsers
        },
        staleTime: 1000 * 30, // 30 seconds
        gcTime: 1000 * 60 * 5, // 5 minutes
        enabled: query.trim().length >= 2, // Don't run if query too short
    })

/**
 * Get current user's friends list
 *
 * Longer staleTime (5 min) since friend list changes infrequently
 */
export const friendsListQueryOptions = queryOptions({
    queryKey: ["friends", "list"] as const,
    queryFn: async ({ signal }) => {
        const data = await graphqlFetch<{ friends: User[] }>(GET_FRIENDS_QUERY, undefined, signal)
        return data.friends
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
})

/**
 * Get pending incoming friend requests
 *
 * Medium staleTime (2 min) - balance between freshness and server load
 */
export const pendingRequestsQueryOptions = queryOptions({
    queryKey: ["friends", "pending"] as const,
    queryFn: async ({ signal }) => {
        const data = await graphqlFetch<{ pendingFriendRequests: FriendRequest[] }>(
            GET_PENDING_REQUESTS_QUERY,
            undefined,
            signal
        )
        return data.pendingFriendRequests
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
})

/**
 * Get sent outgoing friend requests
 *
 * Medium staleTime (2 min) - balance between freshness and server load
 */
export const sentRequestsQueryOptions = queryOptions({
    queryKey: ["friends", "sent"] as const,
    queryFn: async ({ signal }) => {
        const data = await graphqlFetch<{ sentFriendRequests: FriendRequest[] }>(
            GET_SENT_REQUESTS_QUERY,
            undefined,
            signal
        )
        return data.sentFriendRequests
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
})

// ---------------------------------------------------------------------------
// GraphQL Mutation Strings (for useMutation hooks)
// ---------------------------------------------------------------------------

export const SEND_FRIEND_REQUEST_MUTATION = `
    mutation SendFriendRequest($userId: ID!) {
        sendFriendRequest(userId: $userId) {
            id
            status
            createdAt
            updatedAt
            sender {
                id
                name
                email
                image
            }
            receiver {
                id
                name
                email
                image
            }
        }
    }
`

export const ACCEPT_FRIEND_REQUEST_MUTATION = `
    mutation AcceptFriendRequest($requestId: ID!) {
        acceptFriendRequest(requestId: $requestId) {
            id
            friend {
                id
                name
                email
                image
            }
            since
        }
    }
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
