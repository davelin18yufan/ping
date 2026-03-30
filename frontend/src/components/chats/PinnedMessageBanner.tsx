/**
 * PinnedMessageBanner — sticky overlay at the top of the chat.
 *
 * Derives pinned messages from the already-cached messages query (pinnedAt != null)
 * so no extra backend query is needed. Falls back to conversation.pinnedMessage
 * when messages haven't loaded yet.
 *
 * Features:
 *  - Collapse/expand: X collapses to mini strip; clicking mini strip re-expands.
 *  - Multiple pins: count badge + ChevronDown expands a scrollable pin list.
 *  - Click any pin → dispatches "message:scrollTo" (same pattern as ritual:incoming).
 *  - Unpin is available through the message's context menu, not this banner.
 *
 * Accessibility:
 *  - aria-live="polite" for screen readers.
 *  - Expand button has aria-expanded.
 *  - Each list item has aria-label.
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useState } from "react"

import { conversationQueryOptions, messagesInfiniteOptions } from "@/graphql/options/conversations"
import { dispatchScrollToMessage } from "@/lib/utils"

interface PinnedItem {
    id: string
    content: string | null
    pinnedAt?: string | null
}

interface PinnedMessageBannerProps {
    conversationId: string
}

type BannerView = "full" | "expanded" | "collapsed"

export function PinnedMessageBanner({ conversationId }: PinnedMessageBannerProps) {
    const [bannerView, setBannerView] = useState<BannerView>("full")

    const { data: conversation } = useQuery(conversationQueryOptions(conversationId))

    // Derive pinned messages from the already-subscribed messages cache (no extra request).
    // Filters messages where pinnedAt != null, sorted most-recently-pinned first.
    const { data: messagesData } = useInfiniteQuery(messagesInfiniteOptions(conversationId))

    const pinnedMessages = useMemo<PinnedItem[]>(() => {
        if (messagesData) {
            const allLoaded = messagesData.pages.flatMap((p) => p.messages)
            const pinned = allLoaded.filter(
                (m): m is typeof m & { pinnedAt: string } => !!m.pinnedAt
            )
            pinned.sort((a, b) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime())
            if (pinned.length > 0) return pinned
        }
        // Fallback to conversation.pinnedMessage before messages finish loading
        if (conversation?.pinnedMessage) {
            const { id, content } = conversation.pinnedMessage
            return [{ id, content: content ?? null }]
        }
        return []
    }, [messagesData, conversation?.pinnedMessage])

    const primaryPin = pinnedMessages[0] ?? null

    // Auto-expand banner whenever the primary pin changes (new message pinned)
    useEffect(() => {
        if (primaryPin?.id) {
            setBannerView("full")
        }
    }, [primaryPin?.id])

    if (!primaryPin) return null

    const isCollapsed = bannerView === "collapsed"
    const isExpanded = bannerView === "expanded"

    return (
        <div aria-live="polite">
            <AnimatePresence mode="wait">
                {isCollapsed ? (
                    /* ── Collapsed mini-indicator ── */
                    <motion.button
                        key="pinned-mini"
                        type="button"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="pinned-message-mini"
                        aria-label="Show pinned message"
                        onClick={() => setBannerView("full")}
                    >
                        <span className="pinned-message-mini__pulse" aria-hidden="true" />
                        <span className="pinned-message-mini__label">Pinned</span>
                        {pinnedMessages.length > 1 && (
                            <span
                                className="pinned-message-mini__count"
                                aria-label={`${pinnedMessages.length} pinned messages`}
                            >
                                {pinnedMessages.length}
                            </span>
                        )}
                    </motion.button>
                ) : (
                    /* ── Full banner ── */
                    <motion.div
                        key="pinned-banner"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {/* Primary banner row */}
                        <div
                            className="pinned-message-banner"
                            role="button"
                            tabIndex={0}
                            aria-label={`Pinned: ${primaryPin.content ?? ""}`}
                            onClick={() => dispatchScrollToMessage(primaryPin.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    dispatchScrollToMessage(primaryPin.id)
                                }
                            }}
                        >
                            {/* Accent bar — project-characteristic pulsing indicator */}
                            <span className="pinned-message-banner__accent" aria-hidden="true" />

                            <div className="pinned-message-banner__content">
                                <span className="pinned-message-banner__label">
                                    Pinned Messages
                                    {pinnedMessages.length > 1 && (
                                        <span className="pinned-message-banner__badge">
                                            {pinnedMessages.length}
                                        </span>
                                    )}
                                </span>
                                <span className="pinned-message-banner__text">
                                    {primaryPin.content ?? ""}
                                </span>
                            </div>

                            {/* Expand/collapse list — only when multiple pins exist */}
                            {pinnedMessages.length > 1 && (
                                <button
                                    type="button"
                                    aria-label={
                                        isExpanded ? "Collapse pin list" : "Expand pin list"
                                    }
                                    aria-expanded={isExpanded}
                                    className="glass-button glass-button--icon shrink-0"
                                    style={{ width: "1.5rem", height: "1.5rem" }}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setBannerView(isExpanded ? "full" : "expanded")
                                    }}
                                >
                                    <ChevronDown
                                        size={12}
                                        aria-hidden="true"
                                        className={`pinned-message-banner__chevron${isExpanded ? " pinned-message-banner__chevron--up" : ""}`}
                                    />
                                </button>
                            )}

                            {/* Collapse button — hides banner without unpinning */}
                            <button
                                type="button"
                                aria-label="Collapse pinned message banner"
                                className="glass-button glass-button--icon shrink-0"
                                style={{ width: "1.5rem", height: "1.5rem" }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setBannerView("collapsed")
                                }}
                            >
                                <span
                                    aria-hidden="true"
                                    style={{
                                        display: "block",
                                        width: "10px",
                                        height: "2px",
                                        background: "currentColor",
                                        borderRadius: "1px",
                                    }}
                                />
                            </button>
                        </div>

                        {/* Expandable pin list — slides down when isExpanded */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    key="pin-list"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    style={{ overflow: "hidden" }}
                                >
                                    <div className="pinned-message-list">
                                        {pinnedMessages.map((msg, i) => (
                                            <button
                                                key={msg.id}
                                                type="button"
                                                className="pinned-message-list__item"
                                                aria-label={`Go to pinned message ${i + 1}: ${msg.content ?? ""}`}
                                                onClick={() => dispatchScrollToMessage(msg.id)}
                                            >
                                                <span
                                                    className="pinned-message-list__index"
                                                    aria-hidden="true"
                                                >
                                                    {i + 1}
                                                </span>
                                                <span className="pinned-message-list__text">
                                                    {msg.content ?? ""}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
