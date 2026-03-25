/**
 * DirectInfoPanel — slide-in side panel for ONE_TO_ONE conversations.
 *
 * Navigation stack: main → ritualList → ritualForm (per type).
 * Each step slides in from the right (forward) or left (backward).
 * No opacity transitions — pure position slide only.
 *
 * Accessibility:
 *   - role="complementary" + aria-label on the panel.
 *   - Confirmation dialog uses role="alertdialog" + aria-modal + aria-labelledby.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Ban, ChevronLeft, ChevronRight, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useMemo, useOptimistic, useRef, useState, useTransition } from "react"

import {
    BLOCK_USER_MUTATION,
    SET_RITUAL_LABEL_MUTATION,
    conversationQueryOptions,
} from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import {
    DEFAULT_RITUAL_LABELS,
    RITUAL_ZH_MAP,
    isRitualForm,
    mergeRitualLabel,
} from "@/lib/ritualLabels"
import type { RitualTypeId } from "@/lib/ritualLabels"
import type { ConversationParticipant, RitualLabel } from "@/types/conversations"

import { ChatSettings } from "./ChatSettings"
import { ContactAvatar } from "./ContactAvatar"
import {
    RitualLabelFormView,
    RitualLabelListView,
    type PanelView,
    slideTransition,
    slideVariants,
} from "./RitualLabelViews"

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

    // Local draft labels — only populated for ritual types the user has edited.
    // Unedited types fall through to getEffectiveLabelOwn/Other (DB → defaults).
    const [draftLabels, setDraftLabels] = useState<
        Partial<Record<RitualTypeId, { labelOwn?: string; labelOther?: string }>>
    >({})

    const { data: conversation } = useQuery(conversationQueryOptions(conversationId))

    const [isLabelPending, startLabelTransition] = useTransition()

    const [optimisticLabels, setOptimisticLabel] = useOptimistic<RitualLabel[], RitualLabel>(
        conversation?.ritualLabels ?? [],
        mergeRitualLabel
    )

    const ritualLabelMap = useMemo(
        () => new Map(optimisticLabels.map((l) => [l.ritualType, l])),
        [optimisticLabels]
    )

    function getEffectiveLabelOwn(ritualType: RitualTypeId): string {
        const dbLabel = ritualLabelMap.get(ritualType)
        if (dbLabel) return dbLabel.labelOwn
        return DEFAULT_RITUAL_LABELS[ritualType]?.labelOwn ?? ""
    }

    function getEffectiveLabelOther(ritualType: RitualTypeId): string {
        const name = participant.user.name ?? "TA"
        const dbLabel = ritualLabelMap.get(ritualType)
        if (dbLabel) return dbLabel.labelOther.replace("{name}", name)
        return DEFAULT_RITUAL_LABELS[ritualType]?.labelOther(name) ?? ""
    }

    function getDraftOwn(ritualType: RitualTypeId): string {
        return draftLabels[ritualType]?.labelOwn ?? getEffectiveLabelOwn(ritualType)
    }

    function getDraftOther(ritualType: RitualTypeId): string {
        return draftLabels[ritualType]?.labelOther ?? getEffectiveLabelOther(ritualType)
    }

    function handleLabelSave(ritualType: RitualTypeId) {
        const labelOwn = getDraftOwn(ritualType)
        const rawOther = getDraftOther(ritualType)
        const name = participant.user.name ?? "TA"
        const action = rawOther.startsWith(name) ? rawOther.slice(name.length) : rawOther
        const labelOther = "{name}" + action

        startLabelTransition(async () => {
            setOptimisticLabel({ ritualType, labelOwn, labelOther })
            await graphqlFetch<{ setRitualLabel: RitualLabel }>(SET_RITUAL_LABEL_MUTATION, {
                conversationId,
                input: { ritualType, labelOwn, labelOther },
            })
            void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] })
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
        })
    }

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
            aria-label="Contact information"
            style={{ overscrollBehavior: "contain" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                {panelView === "main" ? (
                    <h3 className="text-sm font-semibold">Contact Info</h3>
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
                    aria-label="Close contact info"
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
                            {/* Contact info */}
                            <div className="px-4 py-6">
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
                                        <p className="text-sm font-semibold">
                                            {participant.user.name}
                                        </p>
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

                            {/* Ritual Labels nav item */}
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
                                otherPrefix={participant.user.name ?? "TA"}
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
                                <ChatSettings conversationId={conversationId} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Fixed footer — always visible at panel bottom */}
            <div className="shrink-0 border-t border-border px-4 py-3">
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
                            {blockMutation.isPending ? "Blocking\u2026" : "Block"}
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
