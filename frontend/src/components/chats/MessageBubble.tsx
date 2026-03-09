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

export function MessageBubble({ message, isOwn, isPending = false }: MessageBubbleProps) {
    const { isMinimal } = useAestheticMode()

    const bubbleContent = (
        <div
            className={cn(
                "bubble-card bubble-card--compact",
                isOwn ? "bubble-card--send" : "bubble-card--receive"
            )}
        >
            <p className="text-sm min-w-0 wrap-break-word overflow-wrap-break-word">
                {message.content}
            </p>
            {isOwn && (
                <div className="flex items-center justify-end gap-1 mt-1">
                    <StatusIcon status={message.status} />
                </div>
            )}
        </div>
    )

    return (
        <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
            {isMinimal ? (
                <div style={{ opacity: isPending ? 0.6 : 1 }}>{bubbleContent}</div>
            ) : (
                <motion.div
                    initial={isOwn ? { x: 20, opacity: 0 } : { y: 12, opacity: 0 }}
                    animate={{ x: 0, y: 0, opacity: isPending ? 0.6 : 1 }}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
                    {bubbleContent}
                </motion.div>
            )}
            <span className="text-[0.625rem] text-muted-foreground mt-0.5 tabular-nums" suppressHydrationWarning>
                {formatMessageTime(message.createdAt)}
            </span>
        </div>
    )
}
