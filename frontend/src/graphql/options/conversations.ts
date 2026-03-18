/**
 * TanStack Query Options for Conversations Feature
 *
 * Query options factories using queryOptions() and infiniteQueryOptions()
 * for type-safe, reusable cache configurations.
 *
 * Follows TanStack Query v5 best practices with proper staleTime and gcTime.
 * All operations (queries + mutations) are imported from operations/conversations.
 */

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { graphqlFetch } from "@/lib/graphql-client"
import type { Conversation, MessagePage, MessagePageParam } from "@/types/conversations"

import {
    CONVERSATION_QUERY,
    CONVERSATIONS_QUERY,
    MESSAGES_QUERY,
} from "../operations/conversations"

// Re-export mutations so useMutation hooks import from one place
export {
    BLOCK_USER_MUTATION,
    CREATE_GROUP_MUTATION,
    GET_OR_CREATE_CONVERSATION_MUTATION,
    INVITE_TO_GROUP_MUTATION,
    LEAVE_GROUP_MUTATION,
    MARK_READ_MUTATION,
    PIN_CONVERSATION_MUTATION,
    REMOVE_FROM_GROUP_MUTATION,
    SEND_MESSAGE_MUTATION,
    SEND_SONIC_PING_MUTATION,
    UNBLOCK_USER_MUTATION,
    UNPIN_CONVERSATION_MUTATION,
    UPDATE_GROUP_SETTINGS_MUTATION,
} from "../operations/conversations"

// ============================================================================
// Query Options Factories (v5 pattern with queryOptions())
// ============================================================================

/**
 * Fetch the full conversations list for the authenticated user.
 * Moderate staleTime (30s) — conversation list changes when new messages arrive,
 * but real-time updates are handled via Socket.io invalidation.
 */
export const conversationsQueryOptions = queryOptions({
    queryKey: ["conversations"] as const,
    queryFn: async ({ signal }) => {
        const data = await graphqlFetch<{ conversations: Conversation[] }>(
            CONVERSATIONS_QUERY,
            undefined,
            signal
        )
        return data.conversations
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
})

/**
 * Fetch a single conversation by ID.
 * Longer staleTime (60s) — individual conversation data (participants, settings)
 * changes infrequently; real-time events handle message updates.
 */
export const conversationQueryOptions = (id: string) =>
    queryOptions({
        queryKey: ["conversation", id] as const,
        queryFn: async ({ signal }) => {
            const data = await graphqlFetch<{ conversation: Conversation }>(
                CONVERSATION_QUERY,
                { id },
                signal
            )
            return data.conversation
        },
        staleTime: 60_000,
        gcTime: 5 * 60_000,
    })

/**
 * Infinite query for paginated message history (dual-cursor).
 *
 * Cursor semantics:
 *   - before: load older messages (user scrolled up)
 *   - after:  load newer messages (user scrolled down / initial load)
 *
 * maxPages: 10 keeps memory bounded while still providing deep history.
 * gcTime: 5 min — messages are evicted quickly to avoid stale state after reconnect.
 */
export const messagesInfiniteOptions = (conversationId: string) =>
    infiniteQueryOptions({
        queryKey: ["messages", conversationId] as const,
        queryFn: async ({
            pageParam,
            signal,
        }: {
            pageParam: MessagePageParam
            signal: AbortSignal
        }) => {
            const before =
                pageParam !== undefined && "before" in pageParam ? pageParam.before : undefined
            const after =
                pageParam !== undefined && "after" in pageParam ? pageParam.after : undefined
            const data = await graphqlFetch<{ messages: MessagePage }>(
                MESSAGES_QUERY,
                { conversationId, before, after, limit: 20 },
                signal
            )
            return data.messages
        },
        initialPageParam: undefined as MessagePageParam,
        getNextPageParam: (last: MessagePage) =>
            last.nextCursor ? { before: last.nextCursor } : undefined,
        getPreviousPageParam: (first: MessagePage) =>
            first.prevCursor ? { after: first.prevCursor } : undefined,
        maxPages: 10,
        gcTime: 5 * 60_000,
    })
