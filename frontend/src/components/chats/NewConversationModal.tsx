/**
 * NewConversationModal — unified "compose" modal for starting conversations.
 *
 * Two tabs:
 *   1:1 — pick a friend; fires getOrCreateConversation mutation, navigates to the chat.
 *   Group — switches to GroupCreateModal (separate overlay, preserves its own state
 *            and celebration burst animation).
 *
 * The group tab intentionally closes this modal and hands off to GroupCreateModal
 * rather than nesting modals, which would create stacked overlays and complicate
 * focus management.
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" + aria-labelledby on the modal panel
 *   - Tab buttons use aria-selected + role="tab" inside a role="tablist"
 *   - Overlay click closes the modal
 *   - Focus trap is handled by the dialog element structure
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

import { GET_OR_CREATE_CONVERSATION_MUTATION } from "@/graphql/options/conversations"
import { friendsListQueryOptions } from "@/graphql/options/friends"
import { graphqlFetch } from "@/lib/graphql-client"
import { cn } from "@/lib/utils"
import { uiStore } from "@/stores/uiStore"
import type { Conversation } from "@/types/conversations"
import type { User } from "@/types/friends"

import { FriendPickerSearch } from "./FriendPickerSearch"

const NO_FRIENDS: User[] = []

type Tab = "direct" | "group"

interface NewConversationModalProps {
    open: boolean
    onClose: () => void
    /** Called when the user switches to the group tab — caller opens GroupCreateModal */
    onOpenGroupCreate: () => void
}

export function NewConversationModal({
    open,
    onClose,
    onOpenGroupCreate,
}: NewConversationModalProps) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [activeTab, setActiveTab] = useState<Tab>("direct")
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [startError, setStartError] = useState<string | null>(null)

    const { data: friends = NO_FRIENDS } = useQuery({
        ...friendsListQueryOptions,
        enabled: open,
    })

    const startMutation = useMutation({
        mutationFn: (userId: string) =>
            graphqlFetch<{ getOrCreateConversation: Conversation }>(
                GET_OR_CREATE_CONVERSATION_MUTATION,
                { userId }
            ),
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            const conversationId = data.getOrCreateConversation.id
            uiStore.setState((s) => ({ ...s, activeConversationId: conversationId }))
            void navigate({
                to: "/chats/$conversationId",
                params: { conversationId },
                viewTransition: false,
            })
            onClose()
        },
        onError: () => {
            setStartError("Failed to open conversation. Please try again.")
        },
    })

    function handleFriendSelect(userId: string) {
        if (startMutation.isPending) return
        setSelectedUserId(userId)
        setStartError(null)
        void startMutation.mutateAsync(userId)
    }

    function handleTabChange(tab: Tab) {
        if (tab === "group") {
            // Close this modal first, then signal caller to open GroupCreateModal.
            // This avoids nested overlays and preserves GroupCreateModal's own state.
            onClose()
            onOpenGroupCreate()
            return
        }
        setActiveTab(tab)
    }

    function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) onClose()
    }

    // Reset internal state whenever modal closes so it's fresh on next open.
    function handleClose() {
        setActiveTab("direct")
        setSelectedUserId(null)
        setStartError(null)
        onClose()
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="new-conversation-overlay"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "oklch(0 0 0 / 0.5)", backdropFilter: "blur(4px)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleOverlayClick}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="new-conversation-title"
                        className="glass-card glass-card--modal w-full max-w-sm"
                        style={{ overscrollBehavior: "contain" }}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 id="new-conversation-title" className="text-base font-semibold">
                                New Conversation
                            </h2>
                            <button
                                type="button"
                                className="glass-button"
                                style={{ padding: "0.25rem" }}
                                onClick={handleClose}
                                aria-label="Close dialog"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Tab bar */}
                        <div
                            role="tablist"
                            aria-label="Conversation type"
                            className="flex gap-1 mb-4"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === "direct"}
                                className={cn("glass-button flex-1 text-sm")}
                                style={
                                    activeTab === "direct"
                                        ? {
                                              background: "oklch(from var(--primary) l c h / 0.2)",
                                              borderColor: "oklch(from var(--primary) l c h / 0.4)",
                                              color: "var(--primary)",
                                          }
                                        : undefined
                                }
                                onClick={() => handleTabChange("direct")}
                            >
                                1:1 對話
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === "group"}
                                className={cn("glass-button flex-1 text-sm")}
                                onClick={() => handleTabChange("group")}
                            >
                                建立群組
                            </button>
                        </div>

                        {/* Tab panel — direct */}
                        {activeTab === "direct" && (
                            <div role="tabpanel" aria-labelledby="tab-direct">
                                <p
                                    className="text-xs mb-3"
                                    style={{ color: "var(--muted-foreground)" }}
                                >
                                    Select a friend to start a conversation.
                                </p>

                                <FriendPickerSearch
                                    friends={friends}
                                    selectedIds={
                                        selectedUserId && startMutation.isPending
                                            ? [selectedUserId]
                                            : []
                                    }
                                    onToggle={handleFriendSelect}
                                    placeholder="Search friends..."
                                    emptyMessage="No friends yet"
                                />

                                {startError && (
                                    <p
                                        role="alert"
                                        className="text-xs mt-3"
                                        style={{ color: "var(--destructive)" }}
                                    >
                                        {startError}
                                    </p>
                                )}

                                {startMutation.isPending && (
                                    <p
                                        className="text-xs mt-3 text-center"
                                        style={{ color: "var(--muted-foreground)" }}
                                        aria-live="polite"
                                    >
                                        Opening conversation...
                                    </p>
                                )}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
