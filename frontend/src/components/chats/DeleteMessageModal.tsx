/**
 * DeleteMessageModal — confirmation dialog for message deletion.
 *
 * Two scope options:
 *   OWN      → 「從我這裡移除」 (always available)
 *   EVERYONE → 「為彼此收回」   (sender only, only if isOwn=true)
 *
 * On success: invalidates ["messages", conversationId] cache.
 * Backdrop click cancels.
 *
 * Accessibility:
 *   - role="alertdialog" + aria-modal="true" + aria-describedby
 *   - Focus returns to trigger on close
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useId } from "react"

import { DELETE_MESSAGE_MUTATION } from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"

interface DeleteMessageModalProps {
    open: boolean
    messageId: string
    conversationId: string
    /** True when the current user is the sender — enables EVERYONE option. */
    isOwn: boolean
    onClose: () => void
}

export function DeleteMessageModal({
    open,
    messageId,
    conversationId,
    isOwn,
    onClose,
}: DeleteMessageModalProps) {
    const queryClient = useQueryClient()
    const descId = useId()

    const deleteMutation = useMutation({
        mutationFn: (scope: "OWN" | "EVERYONE") =>
            graphqlFetch<{ deleteMessage: boolean }>(DELETE_MESSAGE_MUTATION, {
                messageId,
                scope,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            })
            onClose()
        },
    })

    function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) onClose()
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="delete-modal-backdrop"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "oklch(0 0 0 / 0.5)", backdropFilter: "blur(4px)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleBackdropClick}
                >
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-describedby={descId}
                        className="glass-card glass-card--modal w-full max-w-xs"
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold">刪除訊息</h2>
                            <button
                                type="button"
                                className="glass-button"
                                style={{ padding: "0.25rem" }}
                                onClick={onClose}
                                aria-label="Close dialog"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>

                        <p
                            id={descId}
                            className="text-xs mb-4"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            請選擇刪除方式
                        </p>

                        {/* Error state */}
                        {deleteMutation.isError && (
                            <p
                                role="alert"
                                className="text-xs mb-3"
                                style={{ color: "var(--destructive)" }}
                            >
                                刪除失敗，請稍後再試
                            </p>
                        )}

                        <div className="flex flex-col gap-2">
                            {/* OWN — always available */}
                            <button
                                type="button"
                                className="glass-button w-full text-sm py-2"
                                onClick={() => deleteMutation.mutate("OWN")}
                                disabled={deleteMutation.isPending}
                            >
                                從我這裡移除
                            </button>

                            {/* EVERYONE — sender only */}
                            {isOwn && (
                                <button
                                    type="button"
                                    className="glass-button w-full text-sm py-2"
                                    style={{ color: "var(--destructive)" }}
                                    onClick={() => deleteMutation.mutate("EVERYONE")}
                                    disabled={deleteMutation.isPending}
                                >
                                    為彼此收回
                                </button>
                            )}

                            <button
                                type="button"
                                className="glass-button w-full text-sm py-2"
                                onClick={onClose}
                                disabled={deleteMutation.isPending}
                                style={{ color: "var(--muted-foreground)" }}
                            >
                                取消
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
