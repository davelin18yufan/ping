/**
 * useChatSettings — per-conversation appearance settings.
 *
 * Persists to localStorage under the key `chat-settings-{conversationId}`.
 * On first visit (or parse failure) falls back to DEFAULT_SETTINGS.
 *
 * Returns:
 *   settings     — current settings object
 *   updateSettings — partial update, auto-persists
 */

import { useState } from "react"

export interface ChatSettings {
    /** CSS color value to override the send bubble tint (--bubble-send-tint) */
    bubbleSendTint?: string
    /** CSS color value to override the receive bubble tint (--bubble-receive-tint) */
    bubbleReceiveTint?: string
    /** Whether the chat wallpaper (future feature) is enabled */
    wallpaperEnabled: boolean
    /** Whether the Sonic Ping button is shown in the header */
    sonicPingEnabled: boolean
}

const DEFAULT_SETTINGS: ChatSettings = {
    wallpaperEnabled: false,
    sonicPingEnabled: true,
}

export function useChatSettings(conversationId: string) {
    const storageKey = `chat-settings-${conversationId}`

    const [settings, setSettings] = useState<ChatSettings>(() => {
        try {
            const stored = localStorage.getItem(storageKey)
            return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS
        } catch {
            return DEFAULT_SETTINGS
        }
    })

    const updateSettings = (updates: Partial<ChatSettings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...updates }
            try {
                localStorage.setItem(storageKey, JSON.stringify(next))
            } catch {
                // Ignore storage errors (e.g. private browsing quota exceeded)
            }
            return next
        })
    }

    return { settings, updateSettings }
}
