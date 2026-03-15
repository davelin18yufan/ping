/**
 * ConversationList — stagger-animated list of conversation rows.
 *
 * Sorting order:
 *  1. Pinned conversations first (by pinnedAt ASC — older pins stay near top)
 *  2. Then by lastMessage.createdAt DESC (most recently active at top),
 *     falling back to conversation.createdAt DESC
 *
 * Motion stagger: each row fades in with a slight upward slide,
 * 50ms between children. Suppressed by prefers-reduced-motion via CSS.
 *
 * Empty state is rendered when the sorted list has zero entries.
 */

import { MessageSquare } from "lucide-react"
import { motion } from "motion/react"
import { memo, useMemo } from "react"

import type { Conversation } from "@/types/conversations"

import { ConversationItem } from "./ConversationItem"

interface ConversationListProps {
    conversations: Conversation[]
    currentUserId: string
    onSelect: (conversationId: string) => void
    /** Called on double-click — opens conversation in a new window */
    onDoubleClick?: (conversationId: string) => void
}

// ─── Motion variants ──────────────────────────────────────────────────────────

const containerVariants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.05,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        },
    },
}

// ─── Sorting helper ───────────────────────────────────────────────────────────

function sortConversations(conversations: Conversation[]): Conversation[] {
    return [...conversations].sort((a, b) => {
        const aPinned = a.pinnedAt !== null
        const bPinned = b.pinnedAt !== null

        // Pinned items first
        if (aPinned && !bPinned) return -1
        if (!aPinned && bPinned) return 1

        // Both pinned: sort by pinnedAt ASC (older pin → closer to top)
        if (aPinned && bPinned) {
            return new Date(a.pinnedAt!).getTime() - new Date(b.pinnedAt!).getTime()
        }

        // Both unpinned: sort by most recent activity DESC
        const aTime = new Date(a.lastMessage?.createdAt ?? a.createdAt).getTime()
        const bTime = new Date(b.lastMessage?.createdAt ?? b.createdAt).getTime()
        return bTime - aTime
    })
}

function ConversationListInner({
    conversations,
    currentUserId,
    onSelect,
    onDoubleClick,
}: ConversationListProps) {
    const sorted = useMemo(() => sortConversations(conversations), [conversations])

    if (sorted.length === 0) {
        return (
            <div className="chats-page__empty" role="status" aria-live="polite">
                <MessageSquare size={32} aria-hidden="true" className="opacity-40" />
                <p>No conversations yet</p>
                <p className="text-xs">Start a chat with a friend</p>
            </div>
        )
    }

    return (
        <motion.div
            className="chats-page__list"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {sorted.map((conversation) => (
                <motion.div key={conversation.id} variants={itemVariants}>
                    <ConversationItem
                        conversation={conversation}
                        conversationId={conversation.id}
                        currentUserId={currentUserId}
                        onSelect={onSelect}
                        onDoubleClick={onDoubleClick}
                    />
                </motion.div>
            ))}
        </motion.div>
    )
}

export const ConversationList = memo(ConversationListInner)
