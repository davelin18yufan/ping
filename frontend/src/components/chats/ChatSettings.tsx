/**
 * ChatSettings — per-conversation appearance customization panel.
 *
 * Renders inside DirectInfoPanel and GroupInfoPanel as a "Customize" section.
 *
 * Features:
 *   - Bubble send-tint presets (Default, Ocean, Forest, Rose, Gold)
 *   - Sonic Ping toggle
 *
 * Settings are persisted to localStorage via useChatSettings.
 *
 * Bubble tint tokens are applied as CSS custom properties on the chat root
 * in ChatRoom — this component only stores the values.
 */

import * as React from "react"

import { useChatSettings } from "@/hooks/useChatSettings"

interface ChatSettingsProps {
    conversationId: string
}

const BUBBLE_TINTS: Array<{ label: string; value: string | undefined }> = [
    { label: "Default", value: undefined },
    { label: "Ocean", value: "oklch(0.6 0.2 220)" },
    { label: "Forest", value: "oklch(0.55 0.18 145)" },
    { label: "Rose", value: "oklch(0.62 0.22 10)" },
    { label: "Gold", value: "oklch(0.75 0.18 80)" },
]

export function ChatSettings({ conversationId }: ChatSettingsProps) {
    const { settings, updateSettings } = useChatSettings(conversationId)

    return (
        <>
            <h4 className="chat-settings__title">Customize Chat</h4>

            {/* Bubble theme color picker */}
            <div className="chat-settings__section">
                <span className="chat-settings__label">Bubble Theme</span>
                <div
                    className="chat-settings__tint-grid"
                    role="radiogroup"
                    aria-label="Bubble theme color"
                >
                    {BUBBLE_TINTS.map(({ label, value }) => (
                        <button
                            key={label}
                            type="button"
                            className={[
                                "chat-settings__tint-swatch",
                                settings.bubbleSendTint === value ? "is-active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            style={
                                {
                                    "--swatch-color": value ?? "var(--primary)",
                                } as React.CSSProperties
                            }
                            onClick={() => updateSettings({ bubbleSendTint: value })}
                            aria-label={label}
                            aria-pressed={settings.bubbleSendTint === value}
                            title={label}
                        />
                    ))}
                </div>
            </div>

            {/* Sonic Ping toggle */}
            <div className="chat-settings__section">
                <label className="chat-settings__toggle-label">
                    <span>Sonic Ping</span>
                    <input
                        type="checkbox"
                        checked={settings.sonicPingEnabled}
                        onChange={(e) => updateSettings({ sonicPingEnabled: e.target.checked })}
                        aria-label="Enable Sonic Ping button"
                    />
                </label>
            </div>
        </>
    )
}
