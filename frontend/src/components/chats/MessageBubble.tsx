/**
 * MessageBubble — single message bubble using design-system bubble-card classes.
 *
 * Send (own) messages: slide in from the right, align end.
 * Receive messages: slide in from below, align start.
 *
 * Ornate: Motion entrance animation.
 * Minimal / prefers-reduced-motion: plain div, no animation.
 *
 * Status icons (own messages only):
 *   SENT      → Check (size 12)
 *   DELIVERED → CheckCheck (size 12)
 *   READ      → CheckCheck (size 12, primary color)
 *
 * Extensions:
 *   - replyTo:        renders ReplyQuoteBlock above message text
 *   - pinnedAt:       renders sonic wave rings via IntersectionObserver
 *   - isSelected:     applies glow ring + scale(0.97)
 *   - currentUserId:  passed to ReplyQuoteBlock for border direction
 */

import { Check, CheckCheck } from "lucide-react"
import { motion } from "motion/react"

import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { cn, formatMessageTime } from "@/lib/utils"
import type { Message, MessageReplyTo, MessageStatusType } from "@/types/conversations"

import { ReplyQuoteBlock } from "./ReplyQuoteBlock"

interface MessageBubbleProps {
    message: Message
    isOwn: boolean
    /** True while the mutation is still in-flight (optimistic update). */
    isPending?: boolean
    /**
     * True when this message arrived in real-time (socket or just sent).
     * False (default) for history loaded on conversation switch — skips
     * entrance animation so switching conversations doesn't shrink/expand.
     */
    shouldAnimate?: boolean
    /** Reply-to metadata. When present a ReplyQuoteBlock renders above the text. */
    replyTo?: MessageReplyTo | null
    /** When set, sonic pin-wave rings animate in on first viewport entry. */
    pinnedAt?: string | null
    /** When true, applies the glow-ring multi-select style. */
    isSelected?: boolean
    /** Current user ID — forwarded to ReplyQuoteBlock for border direction. */
    currentUserId?: string
    /** Called when user taps a reply quote block to jump to that message. */
    onScrollToOriginal?: (id: string) => void
}

// Status icon (own messages only)
function StatusIcon({ status }: { status: MessageStatusType }) {
    if (status === "SENT") {
        return <Check size={12} aria-hidden="true" className="text-muted-foreground" />
    }
    if (status === "DELIVERED") {
        return <CheckCheck size={12} aria-hidden="true" className="text-muted-foreground" />
    }
    // READ
    return <CheckCheck size={12} aria-hidden="true" style={{ color: "var(--primary)" }} />
}

export function MessageBubble({
    message,
    isOwn,
    isPending = false,
    shouldAnimate = false,
    replyTo,
    pinnedAt,
    isSelected = false,
    currentUserId,
    onScrollToOriginal,
}: MessageBubbleProps) {
    const { isMinimal } = useAestheticMode()

    const resolvedReplyTo = replyTo ?? message.replyTo ?? null
    const resolvedPinnedAt = pinnedAt ?? message.pinnedAt ?? null
    const resolvedDeletedAt = message.deletedAt ?? null

    const bubbleContent = (
        <div
            className={cn(
                "bubble-card bubble-card--compact",
                isOwn ? "bubble-card--send" : "bubble-card--receive"
            )}
        >
            {/* Pinned indicator — inline badge, no external positioning */}
            {resolvedPinnedAt && !resolvedDeletedAt && (
                <div className="bubble-pin-indicator" aria-label="Pinned message">
                    <span className="bubble-pin-indicator__dot" aria-hidden="true" />
                    <span className="bubble-pin-indicator__label">PINNED</span>
                </div>
            )}

            {/* Reply quote block — renders above message text when present */}
            {resolvedReplyTo && currentUserId && (
                <ReplyQuoteBlock
                    replyTo={resolvedReplyTo}
                    currentUserId={currentUserId}
                    onScrollToMessage={onScrollToOriginal ?? (() => {})}
                />
            )}

            {/* Message text — shows placeholder when soft-deleted */}
            {resolvedDeletedAt ? (
                <p
                    className="text-sm"
                    style={{
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        fontStyle: "italic",
                        color: "var(--muted-foreground)",
                    }}
                    aria-label="Message recalled"
                >
                    此訊息已收回
                </p>
            ) : (
                <p
                    className="text-sm"
                    style={{
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {message.content}
                </p>
            )}

            {/* Time + status inside the bubble, right-aligned */}
            <div className="bubble-card__time" suppressHydrationWarning>
                {formatMessageTime(message.createdAt)}
                {isOwn && !resolvedDeletedAt && <StatusIcon status={message.status} />}
            </div>
        </div>
    )

    // Only play entrance animation for new real-time messages and pending bubbles.
    // Historical messages (shouldAnimate=false) appear instantly to avoid the
    // "shrink/expand" effect when switching conversations.
    const playAnimation = shouldAnimate || isPending

    return (
        <div
            className={cn(
                "flex flex-col w-full min-w-0",
                isOwn ? "items-end" : "items-start",
                isSelected && "bubble-selected"
            )}
        >
            {isMinimal || !playAnimation ? (
                // w-fit prevents this block wrapper from stretching to full column width,
                // which would override bubble-card's width: fit-content sizing.
                <div className="w-fit relative" style={{ opacity: isPending ? 0.6 : 1 }}>
                    {bubbleContent}
                </div>
            ) : (
                <motion.div
                    className="w-fit relative"
                    initial={isOwn ? { x: 16, opacity: 0 } : { y: 10, opacity: 0 }}
                    animate={{ x: 0, y: 0, opacity: isPending ? 0.6 : 1 }}
                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                >
                    {bubbleContent}
                </motion.div>
            )}
        </div>
    )
}
