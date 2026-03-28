/**
 * ReplyQuoteBlock — inline quoted-message preview inside a bubble.
 *
 * Border color is determined by the QUOTED sender's perspective:
 *   - Quoted message sent by someone else (not currentUser) → --primary border
 *   - Quoted message sent by currentUser → --muted-foreground border
 *
 * Clicking jumps to the original message via the onScrollToMessage callback.
 *
 * Accessibility:
 *   - Rendered as <button> for keyboard operability.
 *   - aria-label describes the action.
 *   - Deleted messages render semantic <em> with aria-label.
 *   - min-w-0 on flex children for text truncation.
 */

import { cn } from "@/lib/utils"
import type { MessageReplyTo } from "@/types/conversations"

interface ReplyQuoteBlockProps {
    replyTo: MessageReplyTo
    /** Current user's ID — used to determine border color direction. */
    currentUserId: string
    /** Called when the user taps the block to jump to the original message. */
    onScrollToMessage: (id: string) => void
}

export function ReplyQuoteBlock({
    replyTo,
    currentUserId,
    onScrollToMessage,
}: ReplyQuoteBlockProps) {
    // If quoted sender differs from current user → their message → --primary
    // If quoted sender IS current user → own message → --muted-foreground
    const isQuotedOtherUser = replyTo.sender?.id !== currentUserId

    const senderName = replyTo.sender?.name ?? "Unknown sender"

    return (
        <button
            type="button"
            className={cn("bubble-quote-block", !isQuotedOtherUser && "bubble-quote-block--muted")}
            aria-label="Jump to original message"
            onClick={() => onScrollToMessage(replyTo.id)}
        >
            <span className="bubble-quote-block__sender min-w-0">{senderName}</span>

            {replyTo.deletedAt ? (
                <em
                    className="bubble-quote-block__deleted"
                    aria-label="Quoted message no longer available"
                >
                    Original message deleted
                </em>
            ) : (
                <span className="bubble-quote-block__content min-w-0">{replyTo.content ?? ""}</span>
            )}
        </button>
    )
}
