/**
 * ChatRoomOverlays — self-contained incoming ritual and Sonic Ping overlays.
 *
 * Listens to custom DOM events dispatched by useSocket and shows a
 * full-screen overlay for 1.6 s. No props required — all data arrives
 * via the event payload.
 *
 * Extracted from ChatRoom so its local state changes do not cause
 * the parent (ChatRoom) to re-render.
 */

import { useEffect, useRef, useState } from "react"

interface RitualOverlay {
    senderName: string
    ritualType: string
}

const RITUAL_OVERLAY_MAP: Record<string, { text: string; cssClass: string }> = {
    APOLOGY: { text: "嗚嗚嗚…", cssClass: "ritual-overlay--apology" },
    CELEBRATE: { text: "🎉🎉🎉", cssClass: "ritual-overlay--celebrate" },
    TAUNT: { text: "哈哈哈！", cssClass: "ritual-overlay--taunt" },
    LONGING: { text: "想你了…", cssClass: "ritual-overlay--longing" },
    QUESTION: { text: "幹嘛？", cssClass: "ritual-overlay--question" },
    REJECTION: { text: "不要！", cssClass: "ritual-overlay--rejection" },
}

const OVERLAY_DURATION = 1600

export function ChatRoomOverlays() {
    const [sonicPingFrom, setSonicPingFrom] = useState<string | null>(null)
    const sonicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [ritualOverlay, setRitualOverlay] = useState<RitualOverlay | null>(null)
    const ritualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const handleSonicPing = (e: Event) => {
            const { senderName } = (
                e as CustomEvent<{ conversationId: string; senderName: string }>
            ).detail
            if (sonicTimerRef.current) clearTimeout(sonicTimerRef.current)
            setSonicPingFrom(senderName)
            sonicTimerRef.current = setTimeout(() => setSonicPingFrom(null), OVERLAY_DURATION)
        }

        window.addEventListener("sonicPing:incoming", handleSonicPing)
        return () => {
            window.removeEventListener("sonicPing:incoming", handleSonicPing)
            if (sonicTimerRef.current) clearTimeout(sonicTimerRef.current)
        }
    }, [])

    useEffect(() => {
        const handleRitual = (e: Event) => {
            const { senderName, ritualType } = (
                e as CustomEvent<{ conversationId: string; senderName: string; ritualType: string }>
            ).detail
            if (ritualTimerRef.current) clearTimeout(ritualTimerRef.current)
            setRitualOverlay({ senderName, ritualType })
            ritualTimerRef.current = setTimeout(() => setRitualOverlay(null), OVERLAY_DURATION)
        }

        window.addEventListener("ritual:incoming", handleRitual)
        return () => {
            window.removeEventListener("ritual:incoming", handleRitual)
            if (ritualTimerRef.current) clearTimeout(ritualTimerRef.current)
        }
    }, [])

    const ritualConfig = ritualOverlay ? RITUAL_OVERLAY_MAP[ritualOverlay.ritualType] : null

    return (
        <>
            {sonicPingFrom && (
                <div
                    className="sonic-incoming-overlay"
                    aria-live="polite"
                    aria-label={`${sonicPingFrom} sent a Sonic Ping`}
                >
                    <span className="sonic-incoming-overlay__text" key={sonicPingFrom}>
                        Anybody home?
                    </span>
                </div>
            )}

            {ritualOverlay && ritualConfig && (
                <div
                    className={`sonic-incoming-overlay ${ritualConfig.cssClass}`}
                    aria-live="polite"
                    aria-label={`${ritualOverlay.senderName} sent a ritual`}
                >
                    <p
                        className="sonic-incoming-overlay__text"
                        key={ritualOverlay.senderName + ritualOverlay.ritualType}
                    >
                        {ritualConfig.text}
                    </p>
                    <p className="sonic-incoming-overlay__sender">{ritualOverlay.senderName}</p>
                </div>
            )}
        </>
    )
}
