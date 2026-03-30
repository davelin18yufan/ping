/**
 * rituals.ts — single source of truth for all ritual metadata.
 *
 * Every ritual's display name, color token, icon, sender animation,
 * incoming overlay config, conversation list preview, and default labels
 * are defined once here. Adding a new ritual requires one entry in
 * RITUAL_DEFINITIONS — no other files need to be updated for the data layer.
 *
 * Usage:
 *   import { RITUAL_MAP, SELECTABLE_RITUALS } from "@/lib/rituals"
 *   const def = RITUAL_MAP.get("APOLOGY")
 */

import type { LucideIcon } from "lucide-react"
import { Flame, Heart, HeartCrack, HelpCircle, PartyPopper, XCircle, Zap } from "lucide-react"

// ─── Definition interface ─────────────────────────────────────────────────────

export interface RitualDef {
    /** Backend MessageType string */
    readonly id: string
    /** Chinese display name (used in picker and settings) */
    readonly zh: string
    /** CSS color token reference, e.g. "var(--ritual-apology)" */
    readonly color: string
    /** Lucide icon component — rendered at whichever size the consumer needs */
    readonly icon: LucideIcon
    /** Whether this ritual appears in the ritual picker (false = system-only, e.g. SONIC_PING) */
    readonly selectable: boolean
    /** CSS class added to .chat-room-outer on send. null = no sender animation. */
    readonly senderCls: string | null
    /** Duration (ms) the sender animation class is held. 0 if senderCls is null. */
    readonly senderDuration: number
    /** CSS class appended to .sonic-incoming-overlay on the recipient's overlay */
    readonly overlayCssClass: string
    /** How long (ms) the incoming overlay auto-dismisses */
    readonly overlayDuration: number
    /**
     * Fallback text rendered inside the overlay when no custom overlay component
     * handles this ritual type. Omit if a dedicated component handles it.
     */
    readonly overlayFallbackText?: string
    /** Conversation list preview label, e.g. "[Apology]" */
    readonly previewLabel: string
    /** Default in-chat event label when the current user sent it */
    readonly labelOwn: string
    /** Default in-chat event label when someone else sent it */
    readonly labelOther: (name: string) => string
    /** Group conversation override for labelOwn (omit = use labelOwn) */
    readonly groupLabelOwn?: string
    /** Group conversation override for labelOther (omit = use labelOther) */
    readonly groupLabelOther?: (name: string) => string
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const RITUAL_DEFINITIONS: RitualDef[] = [
    {
        id: "SONIC_PING",
        zh: "Sonic Ping",
        color: "var(--ritual-nudge)",
        icon: Zap,
        selectable: false,
        senderCls: null,
        senderDuration: 0,
        overlayCssClass: "ritual-overlay--nudge",
        overlayDuration: 1600,
        overlayFallbackText: "Anybody home?",
        previewLabel: "[Sonic Ping]",
        labelOwn: "You sent a Sonic Ping",
        labelOther: (n) => `${n} sent a Sonic Ping`,
    },
    {
        id: "APOLOGY",
        zh: "道歉",
        color: "var(--ritual-apology)",
        icon: HeartCrack,
        selectable: true,
        senderCls: "is-ritual-apology",
        senderDuration: 650,
        overlayCssClass: "ritual-overlay--apology",
        overlayDuration: 5000,
        previewLabel: "[Apology]",
        labelOwn: "你道歉了",
        labelOther: (n) => `${n} 說對不起`,
        groupLabelOther: (n) => `${n} 道歉了`,
    },
    {
        id: "CELEBRATE",
        zh: "恭喜",
        color: "var(--ritual-celebrate)",
        icon: PartyPopper,
        selectable: true,
        senderCls: "is-ritual-celebrate",
        senderDuration: 550,
        overlayCssClass: "ritual-overlay--celebrate",
        overlayDuration: 1800,
        previewLabel: "[Celebrate]",
        labelOwn: "你恭喜了對方",
        labelOther: (n) => `${n} 恭喜你`,
        groupLabelOwn: "你恭喜大家",
        groupLabelOther: (n) => `${n} 說恭喜`,
    },
    {
        id: "TAUNT",
        zh: "嗆聲",
        color: "var(--ritual-taunt)",
        icon: Flame,
        selectable: true,
        senderCls: "is-ritual-taunt",
        senderDuration: 380,
        overlayCssClass: "ritual-overlay--taunt",
        overlayDuration: 1600,
        previewLabel: "[Taunt]",
        labelOwn: "你嗆了對方",
        labelOther: (n) => `${n} 嗆了你`,
        groupLabelOwn: "你嗆聲了",
        groupLabelOther: (n) => `${n} 嗆聲了`,
    },
    {
        id: "LONGING",
        zh: "思念",
        color: "var(--ritual-reconcile)",
        icon: Heart,
        selectable: true,
        senderCls: "is-ritual-longing",
        senderDuration: 760,
        overlayCssClass: "ritual-overlay--longing",
        overlayDuration: 1600,
        overlayFallbackText: "♥",
        previewLabel: "[Miss you]",
        labelOwn: "你想對方了",
        labelOther: (n) => `${n} 想你了`,
        groupLabelOwn: "你想大家了",
        groupLabelOther: (n) => `${n} 想大家了`,
    },
    {
        id: "QUESTION",
        zh: "疑問",
        color: "var(--ritual-question)",
        icon: HelpCircle,
        selectable: true,
        senderCls: "is-ritual-question",
        senderDuration: 480,
        overlayCssClass: "ritual-overlay--question",
        overlayDuration: 1600,
        previewLabel: "[Hey?]",
        labelOwn: "你問: 幹嘛？",
        labelOther: (n) => `${n} 問: 幹嘛？`,
        groupLabelOwn: "你問了",
        groupLabelOther: (n) => `${n} 問了`,
    },
    {
        id: "REJECTION",
        zh: "拒絕",
        color: "var(--ritual-reject)",
        icon: XCircle,
        selectable: true,
        senderCls: "is-ritual-rejection",
        senderDuration: 450,
        overlayCssClass: "ritual-overlay--rejection",
        overlayDuration: 1600,
        overlayFallbackText: "No",
        previewLabel: "[Rejected]",
        labelOwn: "你拒絕了",
        labelOther: (n) => `${n} 拒絕了`,
        groupLabelOwn: "你拒絕了",
        groupLabelOther: (n) => `${n} 拒絕了`,
    },
]

// ─── Derived lookups ──────────────────────────────────────────────────────────

/** O(1) map from ritual id → RitualDef */
export const RITUAL_MAP = new Map(RITUAL_DEFINITIONS.map((r) => [r.id, r]))

/** Only the rituals that appear in the picker (excludes SONIC_PING) */
export const SELECTABLE_RITUALS = RITUAL_DEFINITIONS.filter((r) => r.selectable)

/** O(1) set of selectable ids — used by isRitualForm */
const SELECTABLE_IDS_SET = new Set(SELECTABLE_RITUALS.map((r) => r.id))

/** All ritual id strings (including SONIC_PING) */
export const RITUAL_IDS = RITUAL_DEFINITIONS.map((r) => r.id) as readonly string[]

/** O(1) map from ritual id → Chinese name */
export const RITUAL_ZH_MAP = new Map(RITUAL_DEFINITIONS.map((r) => [r.id, r.zh]))

// ─── Types ───────────────────────────────────────────────────────────────────

/** Union of the selectable ritual ids (excludes SONIC_PING) */
export type RitualTypeId = "APOLOGY" | "CELEBRATE" | "TAUNT" | "LONGING" | "QUESTION" | "REJECTION"

// ─── Type-guards ─────────────────────────────────────────────────────────────

/**
 * Type-guard: is this panel navigation value a selectable ritual form id?
 * Used by DirectInfoPanel / GroupInfoPanel to narrow PanelView → RitualTypeId.
 */
export function isRitualForm(v: string): v is RitualTypeId {
    return SELECTABLE_IDS_SET.has(v)
}
