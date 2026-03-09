/**
 * ConversationItem — single row in the conversation list.
 *
 * Displays the contact avatar, display name, last message preview, timestamp,
 * unread badge, and pin indicator.
 *
 * Timestamp formatting (zh-TW locale):
 *  - Same day   → "14:30" (HH:mm, 24h)
 *  - Yesterday  → "Yesterday"
 *  - Older      → "2/28" (M/D)
 *
 * For ONE_TO_ONE conversations the display name and avatar are derived from
 * the participant whose id differs from `currentUserId`. For GROUP
 * conversations the group name and a letter-initial avatar are used.
 */

import { Pin } from "lucide-react"

import { cn, formatConversationDate, formatMessageTime, toLocalDateKey } from "@/lib/utils"
import type { Conversation } from "@/types/conversations"

import { ContactAvatar } from "./ContactAvatar"
import { UnreadBadge } from "./UnreadBadge"

interface ConversationItemProps {
    conversation: Conversation
    currentUserId: string
    onClick: () => void
}

// ─── Timestamp helpers ────────────────────────────────────────────────────────
function formatConversationTime(isoString: string): string {
    const date = new Date(isoString)
    const now = new Date()

    if (toLocalDateKey(date) === toLocalDateKey(now)) {
        return formatMessageTime(isoString)
    }

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (toLocalDateKey(date) === toLocalDateKey(yesterday)) {
        return "Yesterday"
    }

    return formatConversationDate(isoString)
}

// ─── Preview truncation ───────────────────────────────────────────────────────

const MAX_PREVIEW_LENGTH = 30

function truncatePreview(text: string | null): string {
    if (!text) return ""
    if (text.length <= MAX_PREVIEW_LENGTH) return text
    return `${text.slice(0, MAX_PREVIEW_LENGTH)}\u2026`
}

export function ConversationItem({ conversation, currentUserId, onClick }: ConversationItemProps) {
    const isGroup = conversation.type === "GROUP"
    const isPinned = conversation.pinnedAt !== null
    const hasUnread = conversation.unreadCount > 0

    // Resolve display name and other-participant metadata
    let displayName: string
    let avatarImage: string | null
    let avatarName: string
    let isOnline: boolean
    let isFriend: boolean

    const other = !isGroup
        ? conversation.participants.find((p) => p.user.id !== currentUserId)
        : undefined

    if (isGroup) {
        displayName = conversation.name ?? "Group"
        avatarImage = null
        avatarName = displayName
        isOnline = false
        // A group may contain members invited by others who are not your friends.
        // Show the stranger badge if any non-self participant is not a friend.
        isFriend = conversation.participants
            .filter((p) => p.user.id !== currentUserId)
            .every((p) => p.isFriend)
    } else {
        displayName = other?.user.name ?? "Unknown"
        avatarImage = other?.user.image ?? null
        avatarName = displayName
        isOnline = other?.user.isOnline ?? false
        isFriend = other?.isFriend ?? false
    }

    // Timestamp — prefer lastMessage.createdAt, fall back to conversation.createdAt
    const timestampSource = conversation.lastMessage?.createdAt ?? conversation.createdAt
    const formattedTime = formatConversationTime(timestampSource)

    // Message preview — handle image-only messages gracefully
    const rawPreview =
        conversation.lastMessage?.messageType === "IMAGE"
            ? "[Image]"
            : (conversation.lastMessage?.content ?? "")
    const truncatedPreview = truncatePreview(rawPreview)

    return (
        <div
            className={cn(
                "conversation-item",
                isPinned && "conversation-item--pinned",
                hasUnread && "conversation-item--unread sidebar-breathe"
            )}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onClick()
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${displayName}${hasUnread ? `, ${conversation.unreadCount} unread` : ""}`}
        >
            {/* Avatar */}
            <div className="conversation-item__avatar">
                <ContactAvatar
                    userId={isGroup ? conversation.id : (other?.user.id ?? conversation.id)}
                    name={avatarName}
                    image={avatarImage}
                    isOnline={isOnline}
                    isFriend={isFriend}
                    size="md"
                />
            </div>

            {/* Content */}
            <div className="conversation-item__content">
                <div className="conversation-item__header">
                    <span className="conversation-item__name">{displayName}</span>
                    <div className="conversation-item__meta">
                        {isPinned && (
                            <Pin
                                size={12}
                                aria-hidden="true"
                                className="text-muted-foreground shrink-0"
                            />
                        )}
                        <span className="conversation-item__time" suppressHydrationWarning>{formattedTime}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between min-w-0 gap-1">
                    <p className="conversation-item__preview">{truncatedPreview}</p>
                    <UnreadBadge count={conversation.unreadCount} />
                </div>
            </div>
        </div>
    )
}
