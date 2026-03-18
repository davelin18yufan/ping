/**
 * ConversationList — animated list of conversation rows.
 *
 * Sorting order:
 *  1. Pinned conversations first (by pinnedAt ASC — older pins stay near top)
 *  2. Then by lastMessage.createdAt DESC (most recently active at top),
 *     falling back to conversation.createdAt DESC
 *
 * Animation strategy: AnimatePresence with initial={false}
 *  - Items ALREADY present on page load appear instantly (no stagger delay).
 *  - Items ADDED later (socket message → new conversation) animate in.
 *  - Items REMOVED (filtered out) animate out.
 *  - This avoids the "all items restart from opacity:0" problem that occurred
 *    with stagger variants when going filtered-empty → full list.
 *
 * Empty state is rendered when the sorted list has zero entries.
 */

import { AnimatePresence, motion } from "motion/react"
import { MessageSquare } from "lucide-react"
import { memo, useMemo } from "react"

import type { Conversation } from "@/types/conversations"

import { ConversationItem } from "./ConversationItem"

interface ConversationListProps {
    conversations: Conversation[]
    currentUserId: string
    onSelect: (conversationId: string) => void
    /** Called on double-click — opens conversation in a new window */
    onDoubleClick?: (conversationId: string) => void
    /** Custom empty-state message (e.g. when search/filters yield no results) */
    emptyMessage?: string
}

// ─── Motion variants ──────────────────────────────────────────────────────────

const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        },
    },
    exit: {
        opacity: 0,
        scale: 0.97,
        transition: { duration: 0.15 },
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
    emptyMessage,
}: ConversationListProps) {
    const sorted = useMemo(() => sortConversations(conversations), [conversations])

    if (sorted.length === 0) {
        return (
            <div className="chats-page__empty" role="status" aria-live="polite">
                <MessageSquare size={32} aria-hidden="true" className="opacity-40" />
                <p>{emptyMessage ?? "No conversations yet"}</p>
                <p className="text-xs">
                    {emptyMessage ? "Try adjusting your search or filters" : "Start a chat with a friend"}
                </p>
            </div>
        )
    }

    return (
        // AnimatePresence initial={false}: items present on first render appear
        // instantly (no entrance flash). Items added/removed later animate in/out.
        <div className="chats-page__list">
            <AnimatePresence initial={false}>
                {sorted.map((conversation) => (
                    <motion.div
                        key={conversation.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                    >
                        <ConversationItem
                            conversation={conversation}
                            conversationId={conversation.id}
                            currentUserId={currentUserId}
                            onSelect={onSelect}
                            onDoubleClick={onDoubleClick}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

export const ConversationList = memo(ConversationListInner)
