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
 */

import { Check, CheckCheck } from "lucide-react"
import { motion } from "motion/react"

import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { cn, formatMessageTime } from "@/lib/utils"
import type { Message, MessageStatusType } from "@/types/conversations"

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
}: MessageBubbleProps) {
    const { isMinimal } = useAestheticMode()

    const bubbleContent = (
        <div
            className={cn(
                "bubble-card bubble-card--compact",
                isOwn ? "bubble-card--send" : "bubble-card--receive"
            )}
        >
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
        </div>
    )

    // Only play entrance animation for new real-time messages and pending bubbles.
    // Historical messages (shouldAnimate=false) appear instantly to avoid the
    // "shrink/expand" effect when switching conversations.
    const playAnimation = shouldAnimate || isPending

    return (
        <div className={cn("flex flex-col w-full min-w-0", isOwn ? "items-end" : "items-start")}>
            {isMinimal || !playAnimation ? (
                // w-fit prevents this block wrapper from stretching to full column width,
                // which would override bubble-card's width: fit-content sizing.
                <div className="w-fit" style={{ opacity: isPending ? 0.6 : 1 }}>
                    {bubbleContent}
                </div>
            ) : (
                <motion.div
                    className="w-fit"
                    initial={isOwn ? { x: 16, opacity: 0 } : { y: 10, opacity: 0 }}
                    animate={{ x: 0, y: 0, opacity: isPending ? 0.6 : 1 }}
                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                >
                    {bubbleContent}
                </motion.div>
            )}
            <div
                className={cn(
                    "flex items-center gap-1 mt-0.5 tabular-nums text-[0.625rem] text-muted-foreground",
                    isOwn ? "justify-end" : "justify-start"
                )}
                suppressHydrationWarning
            >
                {formatMessageTime(message.createdAt)}
                {isOwn && <StatusIcon status={message.status} />}
            </div>
        </div>
    )
}
