/**
 * DirectInfoPanel — slide-in side panel for ONE_TO_ONE conversations.
 *
 * Shows the other participant's avatar, name, and online status.
 * Provides a Block User action with a confirmation dialog.
 *
 * Accessibility:
 *   - role="complementary" + aria-label on the panel.
 *   - Confirmation dialog uses role="alertdialog" + aria-modal + aria-labelledby.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Ban, X } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"

import { BLOCK_USER_MUTATION } from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import type { ConversationParticipant } from "@/types/conversations"

import { ChatSettings } from "./ChatSettings"
import { ContactAvatar } from "./ContactAvatar"

interface DirectInfoPanelProps {
    participant: ConversationParticipant
    conversationId: string
    onClose: () => void
}

export function DirectInfoPanel({ participant, conversationId, onClose }: DirectInfoPanelProps) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const [confirmBlock, setConfirmBlock] = useState(false)
    const [blockError, setBlockError] = useState<string | null>(null)

    const blockMutation = useMutation({
        mutationFn: () =>
            graphqlFetch<{ blockUser: boolean }>(BLOCK_USER_MUTATION, {
                userId: participant.user.id,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            onClose()
            void navigate({ to: "/chats" })
        },
        onError: () => {
            setBlockError("Failed to block user. Please try again.")
        },
    })

    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 right-0 w-72 glass-card rounded-none border-y-0 border-r-0 flex flex-col z-20"
            role="complementary"
            aria-label="Contact information"
            style={{ overscrollBehavior: "contain" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold">Contact Info</h3>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close contact info"
                    className="glass-button glass-button--icon"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            {/* Contact info */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="flex flex-col items-center gap-3">
                    <ContactAvatar
                        userId={participant.user.id}
                        name={participant.user.name}
                        image={participant.user.image}
                        isOnline={participant.user.isOnline}
                        isFriend={participant.isFriend}
                        size="xl"
                    />
                    <div className="text-center">
                        <p className="text-sm font-semibold">{participant.user.name}</p>
                        <p
                            className="text-xs mt-0.5"
                            style={{
                                color: participant.user.isOnline
                                    ? "var(--status-online)"
                                    : "var(--muted-foreground)",
                            }}
                        >
                            {participant.user.isOnline ? "Online" : "Offline"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Customize */}
            <div className="px-4 py-3 border-t border-border shrink-0">
                <ChatSettings conversationId={conversationId} />
            </div>

            {/* Block user */}
            <div className="px-4 py-3 border-t border-border shrink-0">
                <button
                    type="button"
                    onClick={() => setConfirmBlock(true)}
                    aria-label={`Block ${participant.user.name}`}
                    className="glass-button glass-button--destructive w-full flex items-center justify-center gap-2"
                >
                    <Ban size={14} aria-hidden="true" />
                    <span>Block User</span>
                </button>
            </div>

            {/* Confirm block dialog */}
            {confirmBlock && (
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-block-title"
                    className="absolute inset-x-0 bottom-0 glass-card glass-card--modal rounded-b-none p-4 z-30"
                >
                    <p id="confirm-block-title" className="text-sm font-medium">
                        Block {participant.user.name}?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        They will no longer be able to message you.
                    </p>
                    {blockError && (
                        <p
                            role="alert"
                            className="text-xs mt-1"
                            style={{ color: "var(--destructive)" }}
                        >
                            {blockError}
                        </p>
                    )}
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            className="glass-button flex-1"
                            onClick={() => {
                                setConfirmBlock(false)
                                setBlockError(null)
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="glass-button glass-button--destructive flex-1"
                            disabled={blockMutation.isPending}
                            onClick={() => blockMutation.mutate()}
                        >
                            {blockMutation.isPending ? "Blocking…" : "Block"}
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
