/**
 * RitualLabelViews — shared sub-views for the ritual label editor,
 * used by both DirectInfoPanel and GroupInfoPanel.
 *
 * Exports:
 *   PanelView        — navigation state type
 *   slideVariants    — motion variants for x-only page-push animation
 *   slideTransition  — shared transition timing
 *   RitualLabelListView — step 1: pick which ritual to edit
 *   RitualLabelFormView — step 2: edit own + other labels for a ritual
 */

import { ChevronRight } from "lucide-react"

import type { RitualTypeId } from "@/lib/ritualLabels"
import { SELECTABLE_RITUALS } from "@/lib/rituals"

export type PanelView = "main" | "ritualList" | "chatSettings" | RitualTypeId

// ── Animation ──────────────────────────────────────────────────────────────

/** Pure x-only slide variants — no opacity, direct push feel. */
export const slideVariants = {
    enter: (dir: "forward" | "backward") => ({
        x: dir === "forward" ? "100%" : "-100%",
    }),
    center: { x: 0 },
    exit: (dir: "forward" | "backward") => ({
        x: dir === "forward" ? "-100%" : "100%",
    }),
}

export const slideTransition = {
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

// ── Helper ─────────────────────────────────────────────────────────────────

/**
 * Strip a known prefix from a display value, handling optional space after prefix.
 * e.g. trimPrefix("A Apologies", "A") → "Apologies"
 *      trimPrefix("A Apologized",   "A") → "Apologized"
 */
function trimPrefix(val: string, prefix: string): string {
    if (val.startsWith(prefix + " ")) return val.slice(prefix.length + 1)
    if (val.startsWith(prefix)) return val.slice(prefix.length)
    return val
}

// ── RitualLabelListView ────────────────────────────────────────────────────

interface RitualLabelListViewProps {
    getDraftOwn: (id: RitualTypeId) => string
    onSelect: (id: RitualTypeId) => void
}

/** Step 1 — list of ritual types with own-label preview. */
export function RitualLabelListView({ getDraftOwn, onSelect }: RitualLabelListViewProps) {
    return (
        <>
            {SELECTABLE_RITUALS.map(({ id, zh }) => {
                const ritualId = id as RitualTypeId
                const ownVal = getDraftOwn(ritualId)
                const preview = trimPrefix(ownVal, "你")
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onSelect(ritualId)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[oklch(from_var(--foreground)_l_c_h/0.04)] transition-colors text-left border-b border-border"
                    >
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm">{zh}</span>
                            {preview && (
                                <span
                                    className="text-xs truncate"
                                    style={{ color: "var(--muted-foreground)" }}
                                >
                                    你{preview}
                                </span>
                            )}
                        </div>
                        <ChevronRight
                            size={14}
                            className="shrink-0 ml-2"
                            style={{ color: "var(--muted-foreground)" }}
                            aria-hidden="true"
                        />
                    </button>
                )
            })}
        </>
    )
}

// ── RitualLabelFormView ────────────────────────────────────────────────────

interface RitualLabelFormViewProps {
    /** Fixed display prefix for the "other" row — participant name or "TA". */
    otherPrefix: string
    /** Current full stored value for the "own" label, e.g. "你道歉了". */
    ownFullValue: string
    /** Current full stored value for the "other" label, e.g. "Alice 道歉了". */
    otherFullValue: string
    onOwnChange: (fullValue: string) => void
    onOtherChange: (fullValue: string) => void
    onSubmit: () => void
    isPending?: boolean
}

/** Step 2 — two-field editor with live preview and explicit save button. */
export function RitualLabelFormView({
    otherPrefix,
    ownFullValue,
    otherFullValue,
    onOwnChange,
    onOtherChange,
    onSubmit,
    isPending,
}: RitualLabelFormViewProps) {
    const ownInput = trimPrefix(ownFullValue, "你")
    const otherInput = trimPrefix(otherFullValue, otherPrefix)

    return (
        <div className="px-4 pt-4 pb-6 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
                <span
                    className="text-xs shrink-0 font-medium select-none"
                    style={{ color: "var(--muted-foreground)" }}
                >
                    你
                </span>
                <input
                    type="text"
                    className="glass-input text-xs flex-1 min-w-0"
                    aria-label="Your action label"
                    autoComplete="off"
                    placeholder="動作描述…"
                    value={ownInput}
                    onChange={(e) => onOwnChange("你" + e.target.value)}
                />
            </div>

            <div className="flex items-center gap-1.5">
                <span
                    className="text-xs shrink-0 font-medium select-none"
                    style={{ color: "var(--muted-foreground)" }}
                >
                    {otherPrefix}
                </span>
                <input
                    type="text"
                    className="glass-input text-xs flex-1 min-w-0"
                    aria-label="Their action label"
                    autoComplete="off"
                    placeholder="動作描述…"
                    value={otherInput}
                    onChange={(e) => onOtherChange(otherPrefix + e.target.value)}
                />
            </div>

            {/* Live preview */}
            <div
                className="text-xs flex flex-col gap-0.5 pt-1 border-t border-border"
                style={{ color: "var(--muted-foreground)" }}
            >
                <span>你 → {ownFullValue || "…"}</span>
                <span>
                    {otherPrefix} → {otherFullValue || "…"}
                </span>
            </div>

            <button
                type="button"
                className="glass-button w-full mt-1 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onSubmit}
                disabled={isPending}
            >
                {isPending ? "儲存中…" : "儲存"}
            </button>
        </div>
    )
}
