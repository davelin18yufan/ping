/**
 * ChatRoomOverlays — self-contained incoming ritual overlays (including Sonic Ping).
 *
 * Listens to "ritual:incoming" custom DOM events dispatched by useSocket and shows
 * a full-screen overlay for a ritual-defined duration. SONIC_PING is routed through
 * the same path as all other rituals — no separate code branch needed.
 *
 * Tap-to-dismiss: any overlay can be tapped to close early. A 150 ms guard
 * prevents accidental dismissal immediately after the overlay appears.
 * AnimatePresence handles the exit fade whether dismissed manually or by timer.
 *
 * Extracted from ChatRoom so its local state changes do not cause
 * the parent (ChatRoom) to re-render.
 */

import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"

import { useFireworks } from "@/hooks/useFireworks"
import { RITUAL_MAP } from "@/lib/rituals"

interface RitualOverlay {
    senderName: string
    ritualType: string
}

const OVERLAY_DURATION = 1600

// Shared exit animation — hoisted to avoid object creation per render
const OVERLAY_EXIT = { opacity: 0, scale: 0.97 } as const
const OVERLAY_EXIT_TRANSITION = { duration: 0.18, ease: "easeIn" } as const

// Minimum time (ms) after appearance before a tap can dismiss the overlay
const DISMISS_GUARD_MS = 150

export function ChatRoomOverlays() {
    const [ritualOverlay, setRitualOverlay] = useState<RitualOverlay | null>(null)
    const ritualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const ritualShownAtRef = useRef<number>(0)

    useEffect(() => {
        const handleRitual = (e: Event) => {
            const { senderName, ritualType } = (
                e as CustomEvent<{ conversationId: string; senderName: string; ritualType: string }>
            ).detail
            if (ritualTimerRef.current) clearTimeout(ritualTimerRef.current)
            ritualShownAtRef.current = Date.now()
            setRitualOverlay({ senderName, ritualType })
            const duration = RITUAL_MAP.get(ritualType)?.overlayDuration ?? OVERLAY_DURATION
            ritualTimerRef.current = setTimeout(() => setRitualOverlay(null), duration)
        }

        window.addEventListener("ritual:incoming", handleRitual)
        return () => {
            window.removeEventListener("ritual:incoming", handleRitual)
            if (ritualTimerRef.current) clearTimeout(ritualTimerRef.current)
        }
    }, [])

    const dismissRitual = useCallback(() => {
        if (Date.now() - ritualShownAtRef.current < DISMISS_GUARD_MS) return
        if (ritualTimerRef.current) clearTimeout(ritualTimerRef.current)
        setRitualOverlay(null)
    }, [])

    const ritualDef = ritualOverlay ? RITUAL_MAP.get(ritualOverlay.ritualType) : null

    return (
        <AnimatePresence>
            {ritualOverlay && ritualDef && (
                <motion.div
                    key={ritualOverlay.senderName + ritualOverlay.ritualType}
                    className={`sonic-incoming-overlay ${ritualDef.overlayCssClass}`}
                    exit={OVERLAY_EXIT}
                    transition={OVERLAY_EXIT_TRANSITION}
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                    onClick={dismissRitual}
                    aria-live="polite"
                    aria-label={ritualDef.labelOther(ritualOverlay.senderName)}
                >
                    {ritualOverlay.ritualType === "APOLOGY" ? (
                        <ApologyRitual {...ritualOverlay} />
                    ) : ritualOverlay.ritualType === "TAUNT" ? (
                        <TauntRitual {...ritualOverlay} />
                    ) : ritualOverlay.ritualType === "CELEBRATE" ? (
                        <CelebrationRitual {...ritualOverlay} />
                    ) : ritualOverlay.ritualType === "QUESTION" ? (
                        <QuestionRitual {...ritualOverlay} />
                    ) : ritualDef.overlayFallbackText ? (
                        <FallbackRitualText
                            senderName={ritualOverlay.senderName}
                            ritualType={ritualOverlay.ritualType}
                            text={ritualDef.overlayFallbackText}
                        />
                    ) : null}
                    <p className="sonic-incoming-overlay__sender">{ritualOverlay.senderName}</p>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function ApologyRitual({ senderName, ritualType }: RitualOverlay) {
    return (
        <div className="ritual-apology-gif-wrapper" key={senderName + ritualType}>
            <img
                src="https://media2.giphy.com/media/mfdqzC02ASo5q/giphy.gif"
                alt=""
                aria-hidden="true"
                className="ritual-apology-gif"
            />
        </div>
    )
}

function TauntRitual({ senderName, ritualType }: RitualOverlay) {
    return (
        <span className="ritual-taunt-wrapper" key={senderName + ritualType}>
            <span className="ritual-overlay--taunt-symbol taunt-s1">*</span>
            <span className="ritual-overlay--taunt-symbol taunt-s2">#</span>
            <span className="ritual-overlay--taunt-symbol taunt-s3">@</span>
            <span className="ritual-overlay--taunt-symbol taunt-s4">!</span>
            <span className="ritual-overlay--taunt-symbol taunt-s5">%</span>
            <span className="ritual-overlay--taunt-symbol taunt-s6">$</span>
        </span>
    )
}

function CelebrationRitual({ senderName, ritualType }: RitualOverlay) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    useFireworks(canvasRef, true)

    return (
        <canvas
            ref={canvasRef}
            key={senderName + ritualType}
            className="ritual-celebrate-canvas"
            width={360}
            height={480}
            aria-hidden="true"
        />
    )
}

function QuestionRitual({ senderName, ritualType }: RitualOverlay) {
    return (
        <div className="ritual-question-cluster" key={senderName + ritualType}>
            <span className="ritual-question-mark q-m1">？</span>
            <span className="ritual-question-mark q-m2">？</span>
            <span className="ritual-question-mark q-m3">？</span>
        </div>
    )
}

function FallbackRitualText({ senderName, ritualType, text }: RitualOverlay & { text: string }) {
    return (
        <p className="sonic-incoming-overlay__text" key={senderName + ritualType}>
            {text}
        </p>
    )
}
