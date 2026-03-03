/**
 * MessageList — bottom-anchored virtual scroll message list.
 *
 * Uses virtua's VList for efficient rendering of large message histories.
 * Infinite scroll loads older messages when the top sentinel enters the viewport.
 * Real-time new messages are appended via Socket.io → TanStack Query cache update.
 *
 * Optimistic pending messages from useMutationState are rendered at 60% opacity.
 * Typing indicators appear below the last real message.
 *
 * Accessibility:
 *   - role="log" + aria-live="polite" on outer container.
 *   - Sender names shown for GROUP conversations (non-own messages only).
 */

import { useMutationState } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
import { useEffect, useRef } from "react"
import { VList, type VListHandle } from "virtua"

import { useMessages } from "@/hooks/useMessages"
import { uiStore } from "@/stores/uiStore"
import type { ConversationType, Message } from "@/types/conversations"

import { MessageBubble } from "./MessageBubble"
import { TypingIndicator } from "./TypingIndicator"

// ============================================================================
// Types
// ============================================================================

interface MessageListProps {
    conversationId: string
    currentUserId: string
    conversationType: ConversationType
}

// ============================================================================
// Component
// ============================================================================

export function MessageList({ conversationId, currentUserId, conversationType }: MessageListProps) {
    const { messages, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(conversationId)

    const typingUsers = useStore(uiStore, (s) => s.typingMap[conversationId] ?? [])

    // Optimistic pending messages from useMutationState.
    // submittedAt provides stable keys even when earlier items resolve.
    const pendingMessages = useMutationState({
        filters: {
            mutationKey: ["sendMessage", conversationId],
            status: "pending",
        },
        select: (mutation) => ({
            content: mutation.state.variables as string,
            submittedAt: mutation.state.submittedAt,
        }),
    })

    const listRef = useRef<VListHandle>(null)
    const topSentinelRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            listRef.current?.scrollToIndex(messages.length - 1, { smooth: true })
        }
    }, [messages.length])

    // IntersectionObserver at top sentinel to load older messages on scroll up
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    void fetchNextPage()
                }
            },
            { threshold: 0.1 }
        )
        const sentinel = topSentinelRef.current
        if (sentinel) observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    return (
        <div
            role="log"
            aria-live="polite"
            aria-label="Message history"
            className="flex flex-col h-full"
            style={{ overscrollBehavior: "contain" }}
        >
            <VList ref={listRef} className="flex-1 overflow-y-auto px-4 py-2">
                {/* Top sentinel — triggers loading older messages when visible */}
                <div ref={topSentinelRef} style={{ height: 1 }} aria-hidden="true" />

                {/* Loading older messages spinner */}
                {isFetchingNextPage && (
                    <div
                        className="flex justify-center py-2"
                        aria-label="Loading older messages\u2026"
                    >
                        <div className="loading-dots" aria-hidden="true" />
                    </div>
                )}

                {/* Actual messages */}
                {messages.map((msg: Message) => (
                    <div key={msg.id} className="mb-2">
                        {conversationType === "GROUP" && msg.sender.id !== currentUserId && (
                            <span className="text-xs text-muted-foreground mb-0.5 ml-1 block">
                                {msg.sender.name}
                            </span>
                        )}
                        <MessageBubble message={msg} isOwn={msg.sender.id === currentUserId} />
                    </div>
                ))}

                {/* Optimistic pending messages */}
                {pendingMessages.map((pending) => (
                    <div key={`pending-${pending.submittedAt}`} className="mb-2">
                        <MessageBubble
                            message={{
                                id: `pending-${pending.submittedAt}`,
                                conversationId,
                                sender: {
                                    id: currentUserId,
                                    name: "",
                                    email: "",
                                    image: null,
                                    isOnline: true,
                                },
                                content: pending.content,
                                messageType: "TEXT",
                                imageUrl: null,
                                createdAt: new Date(pending.submittedAt).toISOString(),
                                status: "SENT",
                            }}
                            isOwn={true}
                            isPending={true}
                        />
                    </div>
                ))}

                {/* Typing indicator */}
                {typingUsers.length > 0 && <TypingIndicator usernames={typingUsers} />}
            </VList>
        </div>
    )
}
