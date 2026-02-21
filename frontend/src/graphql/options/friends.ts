/**
 * TanStack Query Options for Friends Feature
 *
 * Query options factories using queryOptions() for type-safe reusable patterns.
 * Follows TanStack Query v5 best practices with proper staleTime and gcTime.
 *
 * Import mutations from operations for use with useMutation.
 */

import { queryOptions } from "@tanstack/react-query"

import type { FriendRequest, User } from "@/types/friends"

import { graphqlFetch } from "@/lib/graphql-client"

import {
    GET_FRIENDS_QUERY,
    GET_PENDING_REQUESTS_QUERY,
    GET_SENT_REQUESTS_QUERY,
    SEARCH_USERS_QUERY,
} from "../operations/friends"

// Re-export mutations so useMutation hooks import from one place
export {
    ACCEPT_FRIEND_REQUEST_MUTATION,
    CANCEL_FRIEND_REQUEST_MUTATION,
    REJECT_FRIEND_REQUEST_MUTATION,
    SEND_FRIEND_REQUEST_MUTATION,
} from "../operations/friends"

// ============================================================================
// Query Options Factories (v5 pattern with queryOptions())
// ============================================================================

/**
 * Search users by query string.
 * Enabled only when query >= 2 characters.
 * Short staleTime (30s) since search results change frequently.
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
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 5,
        enabled: query.trim().length >= 2,
    })

/**
 * Get current user's friends list.
 * Longer staleTime (5 min) since friend list changes infrequently.
 */
export const friendsListQueryOptions = queryOptions({
    queryKey: ["friends", "list"] as const,
    queryFn: async ({ signal }) => {
        const data = await graphqlFetch<{ friends: User[] }>(GET_FRIENDS_QUERY, undefined, signal)
        return data.friends
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
})

/**
 * Get pending incoming friend requests.
 * Medium staleTime (2 min) — balance between freshness and server load.
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
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
})

/**
 * Get sent outgoing friend requests.
 * Medium staleTime (2 min) — balance between freshness and server load.
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
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
})
