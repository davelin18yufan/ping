/**
 * TypingIndicator — three-dot breathing wave for typing users
 *
 * Ornate mode: animated Motion dots with staggered y-wave.
 * Minimal / prefers-reduced-motion: static dots, no animation.
 *
 * Accessibility:
 *  - role="status" + aria-live="polite" so screen readers announce changes.
 *  - aria-label on the container describes who is typing.
 *  - Dots are aria-hidden (decorative).
 */

import { motion } from "motion/react"

import { useAestheticMode } from "@/contexts/aesthetic-mode-context"

// ============================================================================
// Types
// ============================================================================

interface TypingIndicatorProps {
    /** Display names of users currently typing in this conversation. */
    usernames: string[]
}

// ============================================================================
// Motion variant — y-wave (ornate mode only)
// ============================================================================

const DOT_DELAYS = [0, 0.2, 0.4] as const

const dotVariants = {
    animate: {
        y: [0, -6, 0],
        transition: {
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut" as const,
        },
    },
}

// ============================================================================
// Label helpers
// ============================================================================

function buildLabel(usernames: string[]): string {
    if (usernames.length === 1) {
        return `${usernames[0]} is typing\u2026`
    }
    if (usernames.length === 2) {
        return `${usernames[0]} and ${usernames[1]} are typing\u2026`
    }
    return "Several people are typing\u2026"
}

// ============================================================================
// Component
// ============================================================================

export function TypingIndicator({ usernames }: TypingIndicatorProps) {
    const { isMinimal } = useAestheticMode()

    if (usernames.length === 0) {
        return null
    }

    const label = buildLabel(usernames)

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={label}
            className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground"
        >
            <div className="flex items-center gap-1" aria-hidden="true">
                {DOT_DELAYS.map((delay, i) =>
                    isMinimal ? (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    ) : (
                        <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                            variants={dotVariants}
                            animate="animate"
                            transition={{ delay }}
                        />
                    )
                )}
            </div>
            <span className="text-xs text-muted-foreground italic">{label}</span>
        </div>
    )
}
