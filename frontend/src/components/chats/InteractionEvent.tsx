/**
 * InteractionEvent — generic in-chat ritual event marker.
 *
 * Renders a centered pill badge with flanking rule lines, used for
 * any ritual interaction persisted as a message (Sonic Ping, and future
 * events like apologies, celebrations, etc.).
 *
 * Theming:
 *   The CSS sets `--interaction-color: var(--ritual-nudge)` as default.
 *   Pass `colorVar` to override for a specific ritual color token
 *   (e.g. `"var(--ritual-celebrate)"` for a golden celebration event).
 *
 * Extension guide:
 *   1. Define a new MessageType in the backend schema
 *   2. In MessageList.tsx, add a `case` for the new type in renderListItem()
 *   3. Call <InteractionEvent icon={...} label={...} colorVar="var(--ritual-xxx)" />
 */

import { motion } from "motion/react"
import { memo } from "react"
import type { ReactNode } from "react"

import { formatMessageTime } from "@/lib/utils"
import type { Message } from "@/types/conversations"

// ─── Motion config — hoisted outside component (rule: rendering-hoist-jsx)
// Avoids creating a new object literal on every render.
const MOTION_TRANSITION = { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const }

// ─── Props ────────────────────────────────────────────────────────────────────

interface InteractionEventProps {
    message: Message
    isOwn: boolean
    /** Icon element rendered inside the badge pill. */
    icon: ReactNode
    /** Human-readable label for the event (e.g. "You sent a Sonic Ping"). */
    label: string
    /**
     * CSS color value to override the default event accent color.
     * Accepts any CSS color, CSS custom property reference, or oklch expression.
     * Defaults to `var(--ritual-nudge)` (cyan) when omitted.
     *
     * @example "var(--ritual-celebrate)"
     */
    colorVar?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

function InteractionEventInner({ message, colorVar, icon, label }: InteractionEventProps) {
    return (
        <motion.div
            className="interaction-event"
            style={
                colorVar ? ({ "--interaction-color": colorVar } as React.CSSProperties) : undefined
            }
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={MOTION_TRANSITION}
            aria-label={label}
        >
            <span className="interaction-event__badge">
                {icon}
                {label}
                <span className="interaction-event__time">
                    {formatMessageTime(message.createdAt)}
                </span>
            </span>
        </motion.div>
    )
}

/**
 * Memoized — re-renders only when message id, isOwn, label, or colorVar changes.
 * In practice these are stable for the lifetime of the list item.
 */
export const InteractionEvent = memo(InteractionEventInner)
