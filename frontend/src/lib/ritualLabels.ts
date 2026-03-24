/**
 * ritualLabels — default label definitions, DB-override resolver, and shared
 * constants for the ritual UI (DirectInfoPanel / GroupInfoPanel).
 *
 * Two base registries are provided:
 *   DEFAULT_RITUAL_LABELS       — 1:1 conversation defaults (directional language)
 *   DEFAULT_GROUP_RITUAL_LABELS — group conversation overrides (non-directional language)
 *
 * resolveRitualLabels() merges DB-persisted overrides (ConversationRitualLabel rows)
 * on top of the appropriate defaults, returning a fully resolved map keyed by ritualType.
 */

// ── Shared ritual type registry ────────────────────────────────────────────

export const RITUAL_LABEL_TYPES = [
    { id: "APOLOGY", zh: "道歉" },
    { id: "CELEBRATE", zh: "恭喜" },
    { id: "TAUNT", zh: "嗆聲" },
    { id: "LONGING", zh: "思念" },
    { id: "QUESTION", zh: "疑問" },
    { id: "REJECTION", zh: "拒絕" },
] as const

export type RitualTypeId = (typeof RITUAL_LABEL_TYPES)[number]["id"]

export const RITUAL_IDS = RITUAL_LABEL_TYPES.map((r) => r.id) as readonly string[]

/** O(1) lookup for type-guard and header label derivation. */
const RITUAL_IDS_SET = new Set<string>(RITUAL_IDS)
export const RITUAL_ZH_MAP = new Map(RITUAL_LABEL_TYPES.map((r) => [r.id, r.zh]))

/** Type-guard: is this panel view a ritual form (not "main" or "ritualList")? */
export function isRitualForm(v: string): v is RitualTypeId {
    return RITUAL_IDS_SET.has(v)
}

// ── Label defaults ─────────────────────────────────────────────────────────

// Default labels for 1:1 conversations
export const DEFAULT_RITUAL_LABELS: Record<
    string,
    { labelOwn: string; labelOther: (n: string) => string }
> = {
    SONIC_PING: {
        labelOwn: "You sent a Sonic Ping",
        labelOther: (n) => `${n} sent a Sonic Ping`,
    },
    APOLOGY: {
        labelOwn: "你道歉了",
        labelOther: (n) => `${n} 說對不起`,
    },
    CELEBRATE: {
        labelOwn: "你恭喜了對方",
        labelOther: (n) => `${n} 恭喜你`,
    },
    TAUNT: {
        labelOwn: "你嗆了對方",
        labelOther: (n) => `${n} 嗆了你`,
    },
    LONGING: {
        labelOwn: "你想對方了",
        labelOther: (n) => `${n} 想你了`,
    },
    QUESTION: {
        labelOwn: "你問了",
        labelOther: (n) => `${n} 問了`,
    },
    REJECTION: {
        labelOwn: "你拒絕了",
        labelOther: (n) => `${n} 拒絕了`,
    },
}

// Group-aware defaults (less directional language)
export const DEFAULT_GROUP_RITUAL_LABELS: Record<
    string,
    { labelOwn: string; labelOther: (n: string) => string }
> = {
    APOLOGY: {
        labelOwn: "你道歉了",
        labelOther: (n) => `${n} 道歉了`,
    },
    CELEBRATE: {
        labelOwn: "你恭喜大家",
        labelOther: (n) => `${n} 說恭喜`,
    },
    TAUNT: {
        labelOwn: "你嗆聲了",
        labelOther: (n) => `${n} 嗆聲了`,
    },
    LONGING: {
        labelOwn: "你想大家了",
        labelOther: (n) => `${n} 想大家了`,
    },
    QUESTION: {
        labelOwn: "你問了",
        labelOther: (n) => `${n} 問了`,
    },
    REJECTION: {
        labelOwn: "你拒絕了",
        labelOther: (n) => `${n} 拒絕了`,
    },
}

export type ResolvedRitualLabels = Record<
    string,
    { labelOwn: string; labelOther: (n: string) => string }
>

/**
 * Merge: DB overrides > group defaults > 1:1 defaults.
 *
 * @param dbLabels   - Array of ConversationRitualLabel rows from the GraphQL query.
 * @param isGroup    - Whether the conversation is a GROUP type.
 * @returns          - Fully resolved label map keyed by ritualType.
 */
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
