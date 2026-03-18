/**
 * MessageList item types — discriminated union for the flat VList render array.
 *
 * Each interface corresponds to one renderable row in the message list.
 * The `kind` field is the discriminant; `key` is the React reconciliation key.
 *
 * Extension guide — adding a new row type:
 *   1. Define a new interface below following the same pattern
 *   2. Add it to the `ListItem` union
 *   3. Create a renderer component in MessageList.tsx
 *   4. Add a `case` to `renderListItem()`
 *   5. Feed source data into `buildItems()` sorted by timestamp
 */

import type { Message, SonicPingEvent } from "./conversations"

// ─── Individual item interfaces ───────────────────────────────────────────────

export interface DateItem {
    kind: "date"
    key: string
    /** Formatted label: "Today" | "Yesterday" | "March 15" | "Dec 1, 2025" */
    label: string
}

export interface MessageItem {
    kind: "message"
    key: string
    message: Message
    /** True when no previous message exists, or the previous sender differs. */
    isFirstInSequence: boolean
    /** True when no next message exists, or the next sender differs. */
    isLastInSequence: boolean
}

export interface SonicPingItem {
    kind: "sonic-ping"
    key: string
    event: SonicPingEvent
}

export interface PendingItem {
    kind: "pending"
    key: string
    content: string
    /** Unix ms from mutation.state.submittedAt; used as createdAt fallback. */
    submittedAt: number
}

export interface TypingItem {
    kind: "typing"
    key: string
}

// ─── Union ────────────────────────────────────────────────────────────────────

/** Discriminated union of every renderable list item. */
export type ListItem = DateItem | MessageItem | SonicPingItem | PendingItem | TypingItem
