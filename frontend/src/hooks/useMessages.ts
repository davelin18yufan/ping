/**
 * useMessages — paginated message history for a single conversation
 *
 * Uses TanStack Query's infinite query backed by messagesInfiniteOptions.
 * Exposes a flat `messages` array (oldest → newest) derived from all loaded
 * pages, plus all standard InfiniteQueryResult fields for controlling
 * pagination (fetchNextPage, hasNextPage, isFetchingNextPage, etc.).
 *
 * Real-time new messages are appended to the cache by useSocket's
 * "message:new" handler, so this hook stays up-to-date without polling.
 *
 * Pagination semantics (dual-cursor):
 *   - fetchNextPage  → loads older messages (scroll up / "load more history")
 *   - fetchPreviousPage → loads newer messages (if user scrolled far up)
 *
 * @param conversationId - The conversation to load messages for.
 */

import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { messagesInfiniteOptions } from "@/graphql/options/conversations"
import type { Message } from "@/types/conversations"

export function useMessages(conversationId: string) {
    const query = useInfiniteQuery(messagesInfiniteOptions(conversationId))

    // Flatten all pages and sort ascending (oldest → newest).
    // The backend returns pages in DESC order (newest first) for initial load,
    // so we sort by createdAt to ensure VList renders oldest at top and newest
    // at the bottom — allowing scrollToIndex(length-1) to land on the newest.
    const messages = useMemo(
        () =>
            (query.data
                ? query.data.pages
                      .flatMap((page) => page.messages)
                      .sort(
                          (a, b) =>
                              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                      )
                : []) as Message[],
        [query.data]
    )

    return {
        ...query,
        messages,
    }
}
