/**
 * UnreadBadge — compact pill showing the unread message count for a conversation.
 *
 * Renders nothing when count is zero or negative.
 * Caps display at "99+" to keep the badge compact.
 */

interface UnreadBadgeProps {
    count: number
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
    if (count <= 0) return null
    const label = count > 99 ? "99+" : String(count)
    return (
        <span className="unread-badge" aria-hidden="true">
            {label}
        </span>
    )
}
