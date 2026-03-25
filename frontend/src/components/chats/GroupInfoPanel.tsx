/**
 * GroupInfoPanel — slide-in side panel showing group members and management.
 *
 * Navigation stack: main → ritualList → ritualForm (per type).
 * Each step slides in from the right (forward) or left (backward).
 * No opacity transitions — pure position slide only.
 *
 * Features:
 *   - Member list with role labels.
 *   - OWNER can kick non-owner members (confirmKick dialog).
 *   - Any member can leave (confirmLeave dialog).
 *   - If the OWNER leaves and there are other members, they must choose a successor.
 *   - OWNER: allowRituals toggle to enable the ritual picker for the group.
 *   - OWNER + allowRituals: Ritual Labels nav item → slide into label editor.
 *
 * Accessibility:
 *   - role="complementary" + aria-label on the panel.
 *   - Confirmation dialogs use role="alertdialog" + aria-modal + aria-labelledby.
 *   - Destructive buttons have aria-label.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, LogOut, UserMinus, UserPlus, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useMemo, useOptimistic, useRef, useState, useTransition } from "react"

import {
    INVITE_TO_GROUP_MUTATION,
    LEAVE_GROUP_MUTATION,
    REMOVE_FROM_GROUP_MUTATION,
    SET_RITUAL_LABEL_MUTATION,
    UPDATE_GROUP_SETTINGS_MUTATION,
    conversationQueryOptions,
} from "@/graphql/options/conversations"
import { friendsListQueryOptions } from "@/graphql/options/friends"
import { graphqlFetch } from "@/lib/graphql-client"
import {
    DEFAULT_GROUP_RITUAL_LABELS,
    RITUAL_ZH_MAP,
    isRitualForm,
    mergeRitualLabel,
} from "@/lib/ritualLabels"
import type { RitualTypeId } from "@/lib/ritualLabels"
import type { Conversation, RitualLabel } from "@/types/conversations"

import { ChatSettings } from "./ChatSettings"
import { FriendPickerSearch } from "./FriendPickerSearch"
import {
    RitualLabelFormView,
    RitualLabelListView,
    type PanelView,
    slideTransition,
    slideVariants,
} from "./RitualLabelViews"

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

    // Invite flow
    const [showInvite, setShowInvite] = useState(false)
    const [inviteIds, setInviteIds] = useState<string[]>([])
    const [inviteError, setInviteError] = useState<string | null>(null)

    // Navigation stack
    const [panelView, setPanelView] = useState<PanelView>("main")
    const navDir = useRef<"forward" | "backward">("forward")

    function goTo(view: PanelView) {
        navDir.current = "forward"
        setPanelView(view)
    }

    function goBack(view: PanelView) {
        navDir.current = "backward"
        setPanelView(view)
    }

    // Ritual labels draft state
    // Local draft labels — only populated for ritual types the user has edited.
    // Unedited types fall through to getEffectiveLabelOwn/Other (DB → defaults).
    const [draftLabels, setDraftLabels] = useState<
        Partial<Record<RitualTypeId, { labelOwn?: string; labelOther?: string }>>
    >({})

    const { data: friends = [] } = useQuery(friendsListQueryOptions)

    const { data: liveConversation } = useQuery(conversationQueryOptions(conversation.id))
    const effectiveConversation = liveConversation ?? conversation

    const memberIds = conversation.participants.map((p) => p.user.id)

    const [isLabelPending, startLabelTransition] = useTransition()

    const [optimisticLabels, setOptimisticLabel] = useOptimistic<RitualLabel[], RitualLabel>(
        effectiveConversation.ritualLabels ?? [],
        mergeRitualLabel
    )

    const ritualLabelMap = useMemo(
        () => new Map(optimisticLabels.map((l) => [l.ritualType, l])),
        [optimisticLabels]
    )

    function getEffectiveLabelOwn(ritualType: RitualTypeId): string {
        const dbLabel = ritualLabelMap.get(ritualType)
        if (dbLabel) return dbLabel.labelOwn
        return DEFAULT_GROUP_RITUAL_LABELS[ritualType]?.labelOwn ?? ""
    }

    function getEffectiveLabelOther(ritualType: RitualTypeId): string {
        const dbLabel = ritualLabelMap.get(ritualType)
        if (dbLabel) return dbLabel.labelOther.replace("{name}", "TA")
        return DEFAULT_GROUP_RITUAL_LABELS[ritualType]?.labelOther("TA") ?? ""
    }

    function getDraftOwn(ritualType: RitualTypeId): string {
        return draftLabels[ritualType]?.labelOwn ?? getEffectiveLabelOwn(ritualType)
    }

    function getDraftOther(ritualType: RitualTypeId): string {
        return draftLabels[ritualType]?.labelOther ?? getEffectiveLabelOther(ritualType)
    }

    const inviteMutation = useMutation({
        mutationFn: (userIds: string[]) =>
            Promise.all(
                userIds.map((userId) =>
                    graphqlFetch<{ inviteToGroup: boolean }>(INVITE_TO_GROUP_MUTATION, {
                        conversationId: conversation.id,
                        userId,
                    })
                )
            ),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            void queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] })
            setShowInvite(false)
            setInviteIds([])
            setInviteError(null)
        },
        onError: () => {
            setInviteError("Failed to invite members. Please try again.")
        },
    })

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

    const allowRitualsMutation = useMutation({
        mutationFn: (allowRituals: boolean) =>
            graphqlFetch<{ updateGroupSettings: Conversation }>(UPDATE_GROUP_SETTINGS_MUTATION, {
                conversationId: conversation.id,
                settings: { allowRituals },
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            void queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] })
        },
    })

    function handleLabelSave(ritualType: RitualTypeId) {
        const labelOwn = getDraftOwn(ritualType)
        const rawOther = getDraftOther(ritualType)
        const labelOther = rawOther.replace("TA", "{name}")

        startLabelTransition(async () => {
            setOptimisticLabel({ ritualType, labelOwn, labelOther })
            await graphqlFetch<{ setRitualLabel: RitualLabel }>(SET_RITUAL_LABEL_MUTATION, {
                conversationId: conversation.id,
                input: { ritualType, labelOwn, labelOther },
            })
            void queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] })
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
        })
    }

    const selectedRitualZh = isRitualForm(panelView) ? RITUAL_ZH_MAP.get(panelView) : undefined

    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="absolute inset-y-0 right-0 w-72 glass-card rounded-none border-y-0 border-r-0 flex flex-col z-20"
            role="complementary"
            aria-label="Group information"
            style={{ overscrollBehavior: "contain" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                {panelView === "main" ? (
                    <h3 className="text-sm font-semibold">Group Info</h3>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            if (isRitualForm(panelView)) goBack("ritualList")
                            else goBack("main")
                        }}
                        className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
                        aria-label="Go back"
                    >
                        <ChevronLeft size={14} aria-hidden="true" />
                        <span>
                            {panelView === "ritualList"
                                ? "Ritual Labels"
                                : panelView === "chatSettings"
                                  ? "Chat Settings"
                                  : selectedRitualZh}
                        </span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close group info"
                    className="glass-button glass-button--icon"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            {/* Navigation body */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence custom={navDir.current} mode="wait" initial={false}>
                    {/* ── Main view ── */}
                    {panelView === "main" && (
                        <motion.div
                            key="main"
                            custom={navDir.current}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={slideTransition}
                            className="absolute inset-0 overflow-y-auto"
                            style={{ scrollbarGutter: "stable" }}
                        >
                            {/* Members list */}
                            <div className="px-4 py-3">
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
                                                    <span className="text-xs text-muted-foreground">
                                                        Owner
                                                    </span>
                                                )}
                                                {isOwner &&
                                                    participant.user.id !== currentUserId && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setConfirmKick(participant.user.id)
                                                            }
                                                            aria-label={`Remove ${participant.user.name} from group`}
                                                            className="glass-button glass-button--icon glass-button--destructive"
                                                            style={{
                                                                width: "1.75rem",
                                                                height: "1.75rem",
                                                            }}
                                                        >
                                                            <UserMinus
                                                                size={12}
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Invite members (owner only) */}
                            {isOwner && (
                                <div className="px-4 py-3 border-t border-border">
                                    {!showInvite ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowInvite(true)}
                                            aria-label="Invite members to group"
                                            className="glass-button w-full flex items-center justify-center gap-2"
                                        >
                                            <UserPlus size={14} aria-hidden="true" />
                                            <span>Invite Members</span>
                                        </button>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Invite Friends
                                            </p>
                                            <FriendPickerSearch
                                                friends={friends}
                                                selectedIds={inviteIds}
                                                onToggle={(id) =>
                                                    setInviteIds((prev) =>
                                                        prev.includes(id)
                                                            ? prev.filter((x) => x !== id)
                                                            : [...prev, id]
                                                    )
                                                }
                                                excludeIds={memberIds}
                                                placeholder="Search friends\u2026"
                                                emptyMessage="All friends already in group"
                                            />
                                            {inviteError && (
                                                <p
                                                    role="alert"
                                                    className="text-xs"
                                                    style={{ color: "var(--destructive)" }}
                                                >
                                                    {inviteError}
                                                </p>
                                            )}
                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    className="glass-button flex-1"
                                                    onClick={() => {
                                                        setShowInvite(false)
                                                        setInviteIds([])
                                                        setInviteError(null)
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="glass-button flex-1"
                                                    disabled={
                                                        inviteIds.length === 0 ||
                                                        inviteMutation.isPending
                                                    }
                                                    style={
                                                        inviteIds.length === 0 ||
                                                        inviteMutation.isPending
                                                            ? {
                                                                  opacity: 0.5,
                                                                  cursor: "not-allowed",
                                                              }
                                                            : {
                                                                  background:
                                                                      "oklch(from var(--primary) l c h / 0.2)",
                                                                  borderColor:
                                                                      "oklch(from var(--primary) l c h / 0.4)",
                                                              }
                                                    }
                                                    onClick={() => inviteMutation.mutate(inviteIds)}
                                                >
                                                    {inviteMutation.isPending
                                                        ? "Inviting\u2026"
                                                        : "Invite"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* allowRituals toggle (owner only) */}
                            {isOwner && (
                                <div className="px-4 py-3 border-t border-border">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium">
                                                Ritual Actions
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Allow members to send rituals
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={effectiveConversation.allowRituals}
                                            aria-label="Toggle ritual actions for this group"
                                            disabled={allowRitualsMutation.isPending}
                                            onClick={() =>
                                                allowRitualsMutation.mutate(
                                                    !effectiveConversation.allowRituals
                                                )
                                            }
                                            className="relative inline-flex shrink-0 h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none disabled:opacity-50"
                                            style={{
                                                background: effectiveConversation.allowRituals
                                                    ? "oklch(from var(--primary) l c h / 0.8)"
                                                    : "oklch(from var(--foreground) l c h / 0.15)",
                                            }}
                                        >
                                            <span
                                                className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform"
                                                style={{
                                                    transform: effectiveConversation.allowRituals
                                                        ? "translateX(1.25rem)"
                                                        : "translateX(0.175rem)",
                                                }}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Ritual Labels nav item (owner + allowRituals only) */}
                            {isOwner && effectiveConversation.allowRituals && (
                                <div className="border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => goTo("ritualList")}
                                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-[oklch(from_var(--foreground)_l_c_h/0.04)] transition-colors"
                                    >
                                        <span>Ritual Labels</span>
                                        <ChevronRight size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            )}

                            {/* Chat settings nav item */}
                            <div className="border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => goTo("chatSettings")}
                                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-[oklch(from_var(--foreground)_l_c_h/0.04)] transition-colors"
                                >
                                    <span>Chat Settings</span>
                                    <ChevronRight size={14} aria-hidden="true" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Ritual list view ── */}
                    {panelView === "ritualList" && (
                        <motion.div
                            key="ritualList"
                            custom={navDir.current}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={slideTransition}
                            className="absolute inset-0 overflow-y-auto"
                            style={{ scrollbarGutter: "stable" }}
                        >
                            <RitualLabelListView
                                getDraftOwn={getDraftOwn}
                                onSelect={(id) => goTo(id)}
                            />
                        </motion.div>
                    )}

                    {/* ── Ritual form view ── */}
                    {isRitualForm(panelView) && (
                        <motion.div
                            key={panelView}
                            custom={navDir.current}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={slideTransition}
                            className="absolute inset-0 overflow-y-auto"
                            style={{ scrollbarGutter: "stable" }}
                        >
                            <RitualLabelFormView
                                otherPrefix="TA"
                                ownFullValue={getDraftOwn(panelView)}
                                otherFullValue={getDraftOther(panelView)}
                                onOwnChange={(v) =>
                                    setDraftLabels((prev) => ({
                                        ...prev,
                                        [panelView]: { ...prev[panelView], labelOwn: v },
                                    }))
                                }
                                onOtherChange={(v) =>
                                    setDraftLabels((prev) => ({
                                        ...prev,
                                        [panelView]: { ...prev[panelView], labelOther: v },
                                    }))
                                }
                                onSubmit={() => handleLabelSave(panelView)}
                                isPending={isLabelPending}
                            />
                        </motion.div>
                    )}

                    {/* ── Chat settings view ── */}
                    {panelView === "chatSettings" && (
                        <motion.div
                            key="chatSettings"
                            custom={navDir.current}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={slideTransition}
                            className="absolute inset-0 overflow-y-auto"
                            style={{ scrollbarGutter: "stable" }}
                        >
                            <div className="px-4 py-4">
                                <ChatSettings conversationId={conversation.id} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Fixed footer — always visible at panel bottom */}
            <div className="shrink-0 border-t border-border px-4 py-3">
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
                        <p
                            role="alert"
                            className="text-xs mt-1"
                            style={{ color: "var(--destructive)" }}
                        >
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
                            onClick={() => kickMutation.mutate(confirmKick)}
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
                        <p
                            role="alert"
                            className="text-xs mt-1"
                            style={{ color: "var(--destructive)" }}
                        >
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
                            onClick={() => leaveMutation.mutate()}
                        >
                            Leave
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
