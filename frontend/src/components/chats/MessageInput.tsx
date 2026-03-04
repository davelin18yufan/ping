/**
 * MessageInput — controlled text input with paper-plane send button.
 *
 * Ornate mode:
 *   - Energy waveform (animated sine-wave gradient) appears when the input is focused.
 *   - Ping ripple animates on send button click.
 *   - Paper-plane icon animates on send.
 *
 * Minimal mode: static input and icon, no decorative effects.
 *
 * Accessibility:
 *   - input has aria-label="Type a message"
 *   - send button has aria-label="Send message"
 */

import { Send } from "lucide-react"
import { useState } from "react"

import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { useTyping } from "@/hooks/useTyping"
import { cn } from "@/lib/utils"

interface MessageInputProps {
    conversationId: string
    onSend: (content: string) => void
    disabled?: boolean
}

export function MessageInput({ conversationId, onSend, disabled = false }: MessageInputProps) {
    const { isMinimal } = useAestheticMode()
    const { onKeyStroke } = useTyping(conversationId)

    const [value, setValue] = useState("")
    const [isFocused, setIsFocused] = useState(false)
    const [sendRipple, setSendRipple] = useState(false)

    function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault()
        const trimmed = value.trim()
        if (!trimmed || disabled) return
        onSend(trimmed)
        setValue("")
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    function handleSendClick() {
        if (!isMinimal) {
            setSendRipple(true)
        }
        handleSubmit()
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 p-3 border-t border-border"
        >
            {/* Input wrapper — energy waveform lives here as a sibling */}
            <div className="flex-1 relative">
                {/* Energy waveform decoration (ornate + focused only) */}
                {isFocused && !isMinimal && <div className="energy-waveform" aria-hidden="true" />}
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value)
                        onKeyStroke()
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Type a message\u2026"
                    aria-label="Type a message"
                    className="glass-input w-full"
                    autoComplete="off"
                    spellCheck={false}
                    style={{ touchAction: "manipulation" }}
                    disabled={disabled}
                />
            </div>

            {/* Send button */}
            <button
                type="submit"
                disabled={!value.trim() || disabled}
                aria-label="Send message"
                className={cn(
                    "glass-button relative overflow-hidden",
                    "w-10 h-10 p-0 rounded-full shrink-0"
                )}
                onClick={handleSendClick}
            >
                <Send
                    size={18}
                    aria-hidden="true"
                    className={cn(sendRipple && !isMinimal && "animate-paper-plane")}
                />
                {/* Ping ripple */}
                {sendRipple && !isMinimal && (
                    <span className="ping-ripple" aria-hidden="true">
                        <span onAnimationEnd={() => setSendRipple(false)} />
                    </span>
                )}
            </button>
        </form>
    )
}
