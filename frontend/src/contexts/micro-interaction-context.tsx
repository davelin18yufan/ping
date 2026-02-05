/**
 * Micro-Interaction Context
 *
 * Global settings for micro-interactions and ritual effects.
 * Allows users to control animation intensity and special effects.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type MicroInteractionLevel = "full" | "reduced" | "none"

export interface MicroInteractionSettings {
    level: MicroInteractionLevel
    ritualEffects: boolean
    soundFeedback: boolean
}

interface MicroInteractionContextValue {
    settings: MicroInteractionSettings
    updateSettings: (newSettings: Partial<MicroInteractionSettings>) => void
    shouldAnimate: (type: "micro" | "ritual" | "sound") => boolean
}

const defaultSettings: MicroInteractionSettings = {
    level: "full",
    ritualEffects: true,
    soundFeedback: false, // Default off for now (future feature)
}

const MicroInteractionContext = createContext<MicroInteractionContextValue | undefined>(undefined)

const STORAGE_KEY = "ping-micro-interaction-settings"

export function MicroInteractionProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<MicroInteractionSettings>(() => {
        // Load from localStorage
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem(STORAGE_KEY)
                if (stored) {
                    return { ...defaultSettings, ...JSON.parse(stored) }
                }
            } catch (error) {
                console.error("Failed to load micro-interaction settings:", error)
            }
        }
        return defaultSettings
    })

    // Check for prefers-reduced-motion
    useEffect(() => {
        if (typeof window === "undefined") return

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
            if (e.matches) {
                // User prefers reduced motion
                setSettings((prev) => ({ ...prev, level: "reduced" }))
            }
        }

        // Initial check
        handleChange(mediaQuery)

        // Listen for changes
        mediaQuery.addEventListener("change", handleChange)

        return () => {
            mediaQuery.removeEventListener("change", handleChange)
        }
    }, [])

    // Persist to localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
            } catch (error) {
                console.error("Failed to save micro-interaction settings:", error)
            }
        }
    }, [settings])

    const updateSettings = (newSettings: Partial<MicroInteractionSettings>) => {
        setSettings((prev) => ({ ...prev, ...newSettings }))
    }

    const shouldAnimate = (type: "micro" | "ritual" | "sound"): boolean => {
        if (type === "sound") {
            return settings.soundFeedback
        }

        if (type === "ritual") {
            return settings.ritualEffects && settings.level !== "none"
        }

        // type === 'micro'
        if (settings.level === "none") {
            return false
        }

        // 'full' or 'reduced' both allow micro-interactions
        // CSS handles the difference via prefers-reduced-motion
        return true
    }

    return (
        <MicroInteractionContext.Provider value={{ settings, updateSettings, shouldAnimate }}>
            {children}
        </MicroInteractionContext.Provider>
    )
}

export function useMicroInteraction() {
    const context = useContext(MicroInteractionContext)
    if (!context) {
        throw new Error("useMicroInteraction must be used within MicroInteractionProvider")
    }
    return context
}

/**
 * Hook to get CSS class for micro-interaction animations
 *
 * @param type - Type of micro-interaction
 * @returns CSS class name or empty string if animations are disabled
 */
export function useMicroInteractionClass(
    type:
        | "send-message"
        | "receive-message"
        | "receive-glow"
        | "typing"
        | "call-hover"
        | "call-pulse"
        | "avatar-hover"
        | "avatar-pulse"
): string {
    const { shouldAnimate } = useMicroInteraction()

    if (!shouldAnimate("micro")) {
        return ""
    }

    const classMap = {
        "send-message": "micro-send-message",
        "receive-message": "micro-receive-message",
        "receive-glow": "micro-receive-glow",
        typing: "micro-typing-indicator",
        "call-hover": "micro-call-hover",
        "call-pulse": "micro-call-pulse",
        "avatar-hover": "micro-avatar-hover",
        "avatar-pulse": "micro-avatar-pulse",
    }

    return classMap[type] || ""
}

/**
 * Hook to get typing indicator component
 *
 * @returns Typing indicator component or null if disabled
 */
export function useTypingIndicator(): ReactNode | null {
    const { shouldAnimate } = useMicroInteraction()

    if (!shouldAnimate("micro")) {
        return null
    }

    return (
        <div className="micro-typing-indicator micro-typing-glow">
            <div className="micro-typing-dot" />
            <div className="micro-typing-dot" />
            <div className="micro-typing-dot" />
        </div>
    )
}
