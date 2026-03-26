/**
 * ritualLabels.ts — DB-override resolver for per-conversation ritual labels.
 *
 * The canonical ritual data lives in @/lib/rituals. This module handles the
 * merge layer: DB-persisted overrides (ConversationRitualLabel rows) on top
 * of the defaults derived from the central registry.
 */

import { RITUAL_DEFINITIONS } from "./rituals"

// Re-export shared identifiers so existing callers don't need to update imports
export type { RitualTypeId } from "./rituals"
export { RITUAL_ZH_MAP, isRitualForm } from "./rituals"

// ─── Derived defaults ─────────────────────────────────────────────────────────
// Built from the central registry — no need to keep them in sync manually.

export const DEFAULT_RITUAL_LABELS = Object.fromEntries(
    RITUAL_DEFINITIONS.map((r) => [r.id, { labelOwn: r.labelOwn, labelOther: r.labelOther }])
)

export const DEFAULT_GROUP_RITUAL_LABELS = Object.fromEntries(
    RITUAL_DEFINITIONS.filter((r) => r.groupLabelOwn != null).map((r) => [
        r.id,
        {
            labelOwn: r.groupLabelOwn!,
            labelOther: r.groupLabelOther!,
        },
    ])
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResolvedRitualLabels = Record<
    string,
    { labelOwn: string; labelOther: (n: string) => string }
>

// ─── Pure reducer ─────────────────────────────────────────────────────────────

/**
 * Pure reducer for useOptimistic — upserts a ritual label into the array.
 * Replaces an existing entry with the same ritualType, or appends a new one.
 */
export function mergeRitualLabel(
    state: Array<{ ritualType: string; labelOwn: string; labelOther: string }>,
    update: { ritualType: string; labelOwn: string; labelOther: string }
): Array<{ ritualType: string; labelOwn: string; labelOther: string }> {
    const exists = state.some((l) => l.ritualType === update.ritualType)
    return exists
        ? state.map((l) => (l.ritualType === update.ritualType ? update : l))
        : [...state, update]
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Merge: DB overrides > group defaults > 1:1 defaults.
 *
 * @param dbLabels  - Array of ConversationRitualLabel rows from the GraphQL query.
 * @param isGroup   - Whether the conversation is a GROUP type.
 * @returns         - Fully resolved label map keyed by ritualType.
 */
export function resolveRitualLabels(
    dbLabels: Array<{ ritualType: string; labelOwn: string; labelOther: string }>,
    isGroup: boolean
): ResolvedRitualLabels {
    const base = isGroup
        ? { ...DEFAULT_RITUAL_LABELS, ...DEFAULT_GROUP_RITUAL_LABELS }
        : { ...DEFAULT_RITUAL_LABELS }
    const overrides: ResolvedRitualLabels = {}
    for (const { ritualType, labelOwn, labelOther } of dbLabels) {
        overrides[ritualType] = {
            labelOwn,
            labelOther: (n) => labelOther.replace("{name}", n),
        }
    }
    return { ...base, ...overrides }
}
