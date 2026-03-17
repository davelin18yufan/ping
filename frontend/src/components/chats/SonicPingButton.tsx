/**
 * SonicPingButton — sends a sonic ping ritual to the other user.
 *
 * Three concentric rings expand and fade on click (sonic-ring animation).
 * Uses the --ritual-nudge token (cyan-blue) for ring color.
 *
 * Socket event emission will be wired in a future sprint; the button
 * currently triggers the animation only.
 *
 * Accessibility:
 *   - aria-label describes the action.
 *   - aria-disabled while firing prevents double-trigger.
 *   - Rings are aria-hidden (decorative).
 *   - prefers-reduced-motion: animation is suppressed via CSS.
 */

import { Zap } from "lucide-react"
import * as React from "react"

interface SonicPingButtonProps {
    conversationId: string
    className?: string
    onPingSent?: () => void
}

export function SonicPingButton({ conversationId, className, onPingSent }: SonicPingButtonProps) {
    const [isFiring, setIsFiring] = React.useState(false)

    const handlePing = React.useCallback(() => {
        if (isFiring) return
        setIsFiring(true)
        onPingSent?.()
        // TODO: emit sonicPing socket event in a future sprint
        // socket.emit('sonicPing', { conversationId })
        void conversationId
        // Last ring: 0.36s delay + 1s animation = ~1.36s; 1400ms gives a clean buffer.
        setTimeout(() => setIsFiring(false), 1400)
    }, [isFiring, conversationId, onPingSent])

    return (
        <button
            type="button"
            className={[
                "sonic-ping-button",
                "glass-button",
                "glass-button--icon",
                isFiring ? "is-firing" : "",
                className ?? "",
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={handlePing}
            title="Sonic Ping"
            aria-label="Send a sonic ping"
            aria-disabled={isFiring}
        >
            {isFiring && (
                <>
                    <span className="sonic-ring" aria-hidden="true" />
                    <span className="sonic-ring" aria-hidden="true" />
                    <span className="sonic-ring" aria-hidden="true" />
                    <span className="sonic-ring" aria-hidden="true" />
                </>
            )}
            <Zap size={16} aria-hidden="true" />
        </button>
    )
}
