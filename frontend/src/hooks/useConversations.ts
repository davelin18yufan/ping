/**
 * useConversations — fetches the authenticated user's conversation list
 *
 * Thin wrapper around TanStack Query with the shared conversationsQueryOptions
 * factory. Real-time updates (new messages, unread counts, participant changes)
 * are applied directly to this query's cache slice by useSocket, so components
 * always render the latest data without polling.
 *
 * Returns the full UseQueryResult so callers have access to isPending,
 * isError, refetch, and all other standard query fields.
 */

import { useQuery } from "@tanstack/react-query"

import { conversationsQueryOptions } from "@/graphql/options/conversations"

export function useConversations() {
    return useQuery(conversationsQueryOptions)
}
