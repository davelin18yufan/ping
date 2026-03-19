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
 * Date separators are inserted between messages from different calendar days.
 * SONIC_PING messageType messages are rendered as ritual event markers in-line.
 *
 * Extension guide — adding a new interactive message type:
 *   1. Define `interface XxxItem { kind: "xxx"; key: string; ... }`
 *   2. Add to `ListItem` union
 *   3. Export an `XxxEvent` data type if needed (like SonicPingEvent)
 *   4. Create a renderer component `function XxxRow(...)`
 *   5. Add `case "xxx"` to `renderListItem()`
 *   6. Feed XxxEvents into `buildItems()` sorted by timestamp
 *
 * Accessibility:
 *   - role="log" + aria-live="polite" on outer container.
 *   - Sender names shown for GROUP conversations (non-own messages only).
 *   - Avatar images carry alt text and title for screen readers.
 */

import { useMutationState } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
import { Zap } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useMemo, useRef } from "react"
import { VList, type VListHandle } from "virtua"

import { useMessages } from "@/hooks/useMessages"
import { cn } from "@/lib/utils"
import { uiStore } from "@/stores/uiStore"
import type { ConversationType, Message } from "@/types/conversations"
import type { DateItem, ListItem, MessageItem, PendingItem, TypingItem } from "@/types/messageList"

import { InteractionEvent } from "./InteractionEvent"
import { MessageBubble } from "./MessageBubble"
import { TypingIndicator } from "./TypingIndicator"

// Re-export so consumers can import from a single location if needed
export type { SonicPingEvent } from "@/types/conversations"
export type { ListItem } from "@/types/messageList"

// ─── Render context ───────────────────────────────────────────────────────────
// Shared data threaded through renderers instead of repeating props everywhere.

interface RenderContext {
    conversationId: string
    currentUserId: string
    conversationType: ConversationType
    /** Returns true for messages that arrived after the view mounted (animate in). */
    isNewMessage: (createdAt: string) => boolean
    typingUsers: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(isoString: string): string {
    const date = new Date(isoString)
    const now = new Date()
    const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

    if (toDay(date) === toDay(now)) return "Today"

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (toDay(date) === toDay(yesterday)) return "Yesterday"

    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    })
}

// ─── buildItems — pure function, no React ────────────────────────────────────
// Converts raw data sources into a flat, sorted ListItem array for VList.
// Extracting this makes unit testing trivial.

function buildItems(
    messages: Message[],
    pendingMessages: Array<{ content: string; submittedAt: number }>,
    typingUsers: string[]
): ListItem[] {
    const result: ListItem[] = []
    let lastDateLabel = ""

    // Sort all messages by timestamp
    const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    sortedMessages.forEach((msg, i) => {
        const dateLabel = formatDateLabel(msg.createdAt)

        // Inject a date separator whenever the calendar day changes
        if (dateLabel !== lastDateLabel) {
            result.push({ kind: "date", key: `date-${dateLabel}`, label: dateLabel })
            lastDateLabel = dateLabel
        }

        // SONIC_PING messages are rendered as ritual event markers, not bubbles
        if (msg.messageType === "SONIC_PING") {
            result.push({
                kind: "message",
                key: msg.id,
                message: msg,
                isFirstInSequence: true,
                isLastInSequence: true,
            })
            return
        }

        // Sequence detection: look at adjacent non-sonic-ping message neighbours
        const prevMsg = sortedMessages
            .slice(0, i)
            .reverse()
            .find((m) => m.messageType !== "SONIC_PING")
        const nextMsg = sortedMessages.slice(i + 1).find((m) => m.messageType !== "SONIC_PING")

        result.push({
            kind: "message",
            key: msg.id,
            message: msg,
            isFirstInSequence: !prevMsg || prevMsg.sender.id !== msg.sender.id,
            isLastInSequence: !nextMsg || nextMsg.sender.id !== msg.sender.id,
        })
    })

    // Pending optimistic messages (always own, always last before typing indicator)
    for (const p of pendingMessages) {
        result.push({
            kind: "pending",
            key: `pending-${p.submittedAt}`,
            content: p.content,
            submittedAt: p.submittedAt,
        })
    }

    if (typingUsers.length > 0) {
        result.push({ kind: "typing", key: "typing" })
    }

    return result
}

// ─── Item renderer components ─────────────────────────────────────────────────
// One component per `kind`. Add a new one here when extending ListItem.

function DateSeparatorRow({ item }: { item: DateItem }) {
    return (
        <div className="date-separator" aria-label={item.label}>
            <div className="date-separator__line" aria-hidden="true" />
            <span className="date-separator__label">{item.label}</span>
            <div className="date-separator__line" aria-hidden="true" />
        </div>
    )
}

function SonicPingMessageRow({ message, isOwn }: { message: Message; isOwn: boolean }) {
    const label = isOwn ? "You sent a Sonic Ping" : `${message.sender.name} sent a Sonic Ping`
    return (
        <InteractionEvent
            message={message}
            isOwn={isOwn}
            icon={<Zap size={10} aria-hidden="true" />}
            label={label}
            // colorVar omitted → uses CSS default var(--ritual-nudge)
        />
    )
}

function PendingMessageRow({
    item,
    ctx,
}: {
    item: PendingItem
    ctx: Pick<RenderContext, "conversationId" | "currentUserId">
}) {
    return (
        <div className="mb-1 w-full">
            <MessageBubble
                message={{
                    id: item.key,
                    conversationId: ctx.conversationId,
                    sender: {
                        id: ctx.currentUserId,
                        name: "",
                        email: "",
                        image: null,
                        isOnline: true,
                    },
                    content: item.content,
                    messageType: "TEXT",
                    imageUrl: null,
                    createdAt: new Date(item.submittedAt).toISOString(),
                    status: "SENT",
                }}
                isOwn={true}
                isPending={true}
            />
        </div>
    )
}

function MessageRow({ item, ctx }: { item: MessageItem; ctx: RenderContext }) {
    const { message: msg, isFirstInSequence, isLastInSequence } = item
    const { currentUserId, conversationType, isNewMessage } = ctx

    const isOwn = msg.sender.id === currentUserId

    // Render SONIC_PING messages as event markers, not chat bubbles
    if (msg.messageType === "SONIC_PING") {
        return <SonicPingMessageRow message={msg} isOwn={isOwn} />
    }

    const isGroupReceived = conversationType === "GROUP" && !isOwn

    return (
        <div className="mb-1 w-full">
            {/* Sender name: only for first message in a group sequence */}
            {isGroupReceived && isFirstInSequence && (
                <span className="text-xs text-muted-foreground mb-0.5 ml-11 block">
                    {msg.sender.name}
                </span>
            )}

            <div className={cn("flex w-full", isGroupReceived ? "flex-row items-end gap-2" : "")}>
                {/* Avatar slot: 32 px reserved for group received messages.
                    Only the last message in a sequence renders the avatar;
                    others render an invisible spacer to keep bubble alignment. */}
                {isGroupReceived && (
                    <div className="w-8 shrink-0">
                        {isLastInSequence ? (
                            <img
                                src={
                                    msg.sender.image ??
                                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.sender.name ?? "?")}`
                                }
                                alt={msg.sender.name ?? ""}
                                width={32}
                                height={32}
                                className="rounded-full object-cover w-8 h-8"
                                title={msg.sender.name ?? ""}
                            />
                        ) : (
                            <div className="w-8 h-8" aria-hidden="true" />
                        )}
                    </div>
                )}

                <div className={cn("min-w-0", isGroupReceived ? "flex-1" : "w-full")}>
                    <MessageBubble
                        message={msg}
                        isOwn={isOwn}
                        shouldAnimate={isNewMessage(msg.createdAt)}
                    />
                </div>
            </div>
        </div>
    )
}

function TypingRow({ ctx }: { item: TypingItem; ctx: Pick<RenderContext, "typingUsers"> }) {
    return <TypingIndicator usernames={ctx.typingUsers} />
}

// ─── renderListItem — single dispatch point ───────────────────────────────────
// Adding a new kind only requires a new `case` here plus the renderer above.

function renderListItem(item: ListItem, ctx: RenderContext): ReactNode {
    switch (item.kind) {
        case "date":
            return <DateSeparatorRow key={item.key} item={item} />
        case "sonic-ping":
            // Legacy local-only sonic ping items (kept for type union completeness)
            return null
        case "pending":
            return <PendingMessageRow key={item.key} item={item} ctx={ctx} />
        case "message":
            return <MessageRow key={item.key} item={item} ctx={ctx} />
        case "typing":
            return <TypingRow key={item.key} item={item} ctx={ctx} />
    }
}

// ─── MessageList props ────────────────────────────────────────────────────────

interface MessageListProps {
    conversationId: string
    currentUserId: string
    conversationType: ConversationType
}

// ─── MessageList ──────────────────────────────────────────────────────────────

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

    // Track when this conversation was opened. Messages created BEFORE this
    // timestamp are "historical" and skip the entrance animation. Messages
    // arriving via socket or after a send-invalidate are "new" and do animate.
    // Reset when the conversationId changes (i.e. user switches conversations).
    const mountTimeRef = useRef<number>(Date.now())
    useEffect(() => {
        mountTimeRef.current = Date.now()
    }, [conversationId])

    // Two-second grace window covers clock drift and the round-trip time of
    // the first invalidate-refetch after sending a message.
    const ANIMATION_WINDOW_MS = 2_000
    const isNewMessage = useMemo(
        () =>
            (createdAt: string): boolean =>
                new Date(createdAt).getTime() >= mountTimeRef.current - ANIMATION_WINDOW_MS,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [conversationId]
    )

    const listRef = useRef<VListHandle>(null)
    const topSentinelRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive.
    // requestAnimationFrame defers the call until after VList has measured item
    // heights in its first layout pass, preventing newest message from
    // landing in the middle of the viewport on initial conversation load.
    useEffect(() => {
        if (messages.length === 0) return
        const raf = requestAnimationFrame(() => {
            // items.length accounts for date separators; +1 clears the top sentinel.
            // An out-of-bounds index scrolls virtua to the very last item safely.
            listRef.current?.scrollToIndex(items.length + 1, { smooth: false })
        })
        return () => cancelAnimationFrame(raf)
    }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

    // Reveal typing indicator when it appears.
    // Kept separate from the messages effect so it can animate smoothly
    // without clobbering the hard-scroll used for new messages.
    useEffect(() => {
        if (typingUsers.length === 0) return
        const raf = requestAnimationFrame(() => {
            listRef.current?.scrollToIndex(items.length + 1, { smooth: true })
        })
        return () => cancelAnimationFrame(raf)
    }, [typingUsers.length]) // eslint-disable-line react-hooks/exhaustive-deps

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

    const items = useMemo(
        () => buildItems(messages, pendingMessages, typingUsers),
        [messages, pendingMessages, typingUsers]
    )

    const ctx: RenderContext = useMemo(
        () => ({ conversationId, currentUserId, conversationType, isNewMessage, typingUsers }),
        [conversationId, currentUserId, conversationType, isNewMessage, typingUsers]
    )

    return (
        <div
            role="log"
            aria-live="polite"
            aria-label="Message history"
            className="flex flex-col flex-1 min-h-0"
        >
            <VList
                ref={listRef}
                className="flex-1"
                style={{ padding: "0.5rem 1rem 2rem", overscrollBehavior: "contain" }}
            >
                {/* Top sentinel — triggers loading older messages when visible */}
                <div ref={topSentinelRef} style={{ height: 1 }} aria-hidden="true" />

                {/* Loading older messages spinner */}
                {isFetchingNextPage && (
                    <div className="flex justify-center py-2" aria-label="Loading older messages…">
                        <div className="loading-dots" aria-hidden="true" />
                    </div>
                )}

                {items.map((item) => renderListItem(item, ctx))}
            </VList>
        </div>
    )
}
