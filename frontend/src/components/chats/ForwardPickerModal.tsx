/**
 * ForwardPickerModal — glass modal for picking a target conversation to forward into.
 *
 * - Reads conversations list from TanStack Query cache.
 * - Filters out the current conversation (can't forward to same conversation).
 * - Search input filters by conversation name.
 * - On selection fires FORWARD_MESSAGE_MUTATION.
 *
 * Pattern matches NewConversationModal layout.
 *
 * Accessibility:
 *   - role="dialog" + aria-modal + aria-labelledby
 *   - Backdrop click closes
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useId, useState } from "react"

import {
    FORWARD_MESSAGE_MUTATION,
    conversationsQueryOptions,
} from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import type { Message } from "@/types/conversations"

interface ForwardPickerModalProps {
    open: boolean
    messageId: string
    /** Exclude this conversation from the picker. */
    currentConversationId: string
    currentUserId: string
    onClose: () => void
}

export function ForwardPickerModal({
    open,
    messageId,
    currentConversationId,
    currentUserId,
    onClose,
}: ForwardPickerModalProps) {
    const queryClient = useQueryClient()
    const titleId = useId()
    const [searchQuery, setSearchQuery] = useState("")
    const [forwardError, setForwardError] = useState<string | null>(null)

    const { data: conversations = [] } = useQuery({
        ...conversationsQueryOptions,
        enabled: open,
    })

    const forwardMutation = useMutation({
        mutationFn: (targetConversationId: string) =>
            graphqlFetch<{ forwardMessage: Message }>(FORWARD_MESSAGE_MUTATION, {
                messageId,
                targetConversationId,
            }),
        onSuccess: (_, targetConversationId) => {
            void queryClient.invalidateQueries({
                queryKey: ["messages", targetConversationId],
            })
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            onClose()
        },
        onError: () => {
            setForwardError("轉發失敗，請稍後再試")
        },
    })

    const filtered = conversations
        .filter((c) => c.id !== currentConversationId)
        .filter((c) => {
            if (!searchQuery.trim()) return true
            const displayName =
                c.type === "ONE_TO_ONE"
                    ? (c.participants.find((p) => p.user.id !== currentUserId)?.user.name ?? "")
                    : (c.name ?? "")
            return displayName.toLowerCase().includes(searchQuery.toLowerCase())
        })

    function getDisplayName(conv: (typeof conversations)[number]): string {
        if (conv.type === "ONE_TO_ONE") {
            return (
                conv.participants.find((p) => p.user.id !== currentUserId)?.user.name ??
                "Direct Message"
            )
        }
        return conv.name ?? "Group"
    }

    function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) onClose()
    }

    function handleClose() {
        setSearchQuery("")
        setForwardError(null)
        onClose()
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="forward-picker-backdrop"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "oklch(0 0 0 / 0.5)", backdropFilter: "blur(4px)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleBackdropClick}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
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
                            <h2 id={titleId} className="text-base font-semibold">
                                轉發訊息
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

                        {/* Search */}
                        <div className="relative mb-3">
                            <Search
                                size={14}
                                aria-hidden="true"
                                className="absolute left-3 top-1/2 -translate-y-1/2"
                                style={{ color: "var(--muted-foreground)" }}
                            />
                            <input
                                type="search"
                                placeholder="搜尋對話..."
                                className="glass-input w-full pl-8 py-2 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search conversations"
                                autoComplete="off"
                            />
                        </div>

                        {/* Error */}
                        {forwardError && (
                            <p
                                role="alert"
                                className="text-xs mb-3"
                                style={{ color: "var(--destructive)" }}
                            >
                                {forwardError}
                            </p>
                        )}

                        {/* Conversation list */}
                        <div
                            className="flex flex-col gap-1 max-h-64 overflow-y-auto"
                            role="listbox"
                            aria-label="Select conversation to forward to"
                        >
                            {filtered.length === 0 ? (
                                <p
                                    className="text-xs text-center py-4"
                                    style={{ color: "var(--muted-foreground)" }}
                                >
                                    找不到對話
                                </p>
                            ) : (
                                filtered.map((conv) => {
                                    const name = getDisplayName(conv)
                                    return (
                                        <button
                                            key={conv.id}
                                            type="button"
                                            role="option"
                                            aria-selected={false}
                                            className="glass-button w-full text-sm text-left px-3 py-2 truncate"
                                            onClick={() => {
                                                setForwardError(null)
                                                forwardMutation.mutate(conv.id)
                                            }}
                                            disabled={forwardMutation.isPending}
                                        >
                                            <span className="truncate min-w-0">{name}</span>
                                        </button>
                                    )
                                })
                            )}
                        </div>

                        {forwardMutation.isPending && (
                            <p
                                className="text-xs mt-3 text-center"
                                style={{ color: "var(--muted-foreground)" }}
                                aria-live="polite"
                            >
                                正在轉發...
                            </p>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
