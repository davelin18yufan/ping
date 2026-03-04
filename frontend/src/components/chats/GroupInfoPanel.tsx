/**
 * GroupInfoPanel — slide-in side panel showing group members and management.
 *
 * Enters from the right (Motion x: "100%" → 0) with AnimatePresence exit.
 *
 * Features:
 *   - Member list with role labels.
 *   - OWNER can kick non-owner members (confirmKick dialog).
 *   - Any member can leave (confirmLeave dialog).
 *   - If the OWNER leaves and there are other members, they must choose a successor.
 *
 * Accessibility:
 *   - role="complementary" + aria-label on the panel.
 *   - Confirmation dialogs use role="alertdialog" + aria-modal + aria-labelledby.
 *   - Destructive buttons have aria-label.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { LogOut, UserMinus, X } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"

import { LEAVE_GROUP_MUTATION, REMOVE_FROM_GROUP_MUTATION } from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import type { Conversation } from "@/types/conversations"

interface GroupInfoPanelProps {
    conversation: Conversation
    currentUserId: string
    onClose: () => void
}

export function GroupInfoPanel({ conversation, currentUserId, onClose }: GroupInfoPanelProps) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const myParticipant = conversation.participants.find((p) => p.user.id === currentUserId)
    const isOwner = myParticipant?.role === "OWNER"

    const [confirmKick, setConfirmKick] = useState<string | null>(null)
    const [confirmLeave, setConfirmLeave] = useState(false)
    const [successorId, setSuccessorId] = useState<string | null>(null)
    const [kickError, setKickError] = useState<string | null>(null)
    const [leaveError, setLeaveError] = useState<string | null>(null)

    // Remove from group mutation
    const kickMutation = useMutation({
        mutationFn: (userId: string) =>
            graphqlFetch<{ removeFromGroup: boolean }>(REMOVE_FROM_GROUP_MUTATION, {
                conversationId: conversation.id,
                userId,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            void queryClient.invalidateQueries({
                queryKey: ["conversation", conversation.id],
            })
            setConfirmKick(null)
            setKickError(null)
        },
        onError: () => {
            setKickError("Failed to remove member. Please try again.")
        },
    })

    // Leave group mutation
    const leaveMutation = useMutation({
        mutationFn: () =>
            graphqlFetch<{ leaveGroup: boolean }>(LEAVE_GROUP_MUTATION, {
                conversationId: conversation.id,
                successorUserId: successorId ?? undefined,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            onClose()
            void navigate({ to: "/chats" })
        },
        onError: () => {
            setLeaveError("Failed to leave group. Please try again.")
        },
    })

    function handleKick(userId: string) {
        kickMutation.mutate(userId)
    }

    function handleLeave() {
        leaveMutation.mutate()
    }

    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 right-0 w-72 glass-card rounded-none border-y-0 border-r-0 flex flex-col z-20"
            role="complementary"
            aria-label="Group information"
            style={{ overscrollBehavior: "contain" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold">Group Info</h3>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close group info"
                    className="glass-button glass-button--icon"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            {/* Members list */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                <p className="text-xs text-muted-foreground mb-2">
                    Members ({conversation.participants.length})
                </p>
                <div className="flex flex-col gap-1">
                    {conversation.participants.map((participant) => (
                        <div
                            key={participant.user.id}
                            className="flex items-center justify-between py-2 px-1"
                        >
                            <span className="text-sm min-w-0 truncate flex-1">
                                {participant.user.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                {participant.role === "OWNER" && (
                                    <span className="text-xs text-muted-foreground">Owner</span>
                                )}
                                {isOwner && participant.user.id !== currentUserId && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmKick(participant.user.id)}
                                        aria-label={`Remove ${participant.user.name} from group`}
                                        className="glass-button glass-button--icon glass-button--destructive"
                                        style={{
                                            width: "1.75rem",
                                            height: "1.75rem",
                                        }}
                                    >
                                        <UserMinus size={12} aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leave group button */}
            <div className="px-4 py-3 border-t border-border shrink-0">
                <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    aria-label="Leave this group"
                    className="glass-button glass-button--destructive w-full flex items-center justify-center gap-2"
                >
                    <LogOut size={14} aria-hidden="true" />
                    <span>Leave Group</span>
                </button>
            </div>

            {/* Confirm kick dialog */}
            {confirmKick && (
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-kick-title"
                    className="absolute inset-x-0 bottom-0 glass-card glass-card--modal rounded-b-none p-4 z-30"
                >
                    <p id="confirm-kick-title" className="text-sm font-medium">
                        Remove this member?
                    </p>
                    {kickError && (
                        <p role="alert" className="text-xs mt-1" style={{ color: "var(--destructive)" }}>
                            {kickError}
                        </p>
                    )}
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            className="glass-button flex-1"
                            onClick={() => setConfirmKick(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="glass-button glass-button--destructive flex-1"
                            disabled={kickMutation.isPending}
                            onClick={() => handleKick(confirmKick)}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}

            {/* Confirm leave dialog */}
            {confirmLeave && (
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-leave-title"
                    className="absolute inset-x-0 bottom-0 glass-card glass-card--modal rounded-b-none p-4 z-30"
                >
                    <p id="confirm-leave-title" className="text-sm font-medium">
                        {isOwner && conversation.participants.length > 1
                            ? "Select a new owner before leaving"
                            : "Leave this group?"}
                    </p>
                    {leaveError && (
                        <p role="alert" className="text-xs mt-1" style={{ color: "var(--destructive)" }}>
                            {leaveError}
                        </p>
                    )}

                    {isOwner && conversation.participants.length > 1 && (
                        <div className="mt-2">
                            <select
                                value={successorId ?? ""}
                                onChange={(e) => setSuccessorId(e.target.value)}
                                className="glass-input w-full text-sm"
                                aria-label="Select new group owner"
                            >
                                <option value="">Select successor\u2026</option>
                                {conversation.participants
                                    .filter((p) => p.user.id !== currentUserId)
                                    .map((p) => (
                                        <option key={p.user.id} value={p.user.id}>
                                            {p.user.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            className="glass-button flex-1"
                            onClick={() => setConfirmLeave(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="glass-button glass-button--destructive flex-1"
                            disabled={
                                (isOwner && conversation.participants.length > 1 && !successorId) ||
                                leaveMutation.isPending
                            }
                            onClick={handleLeave}
                        >
                            Leave
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
