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
import { useEffect, useRef, useState } from "react"

import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { useTyping } from "@/hooks/useTyping"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"

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

    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    // Auto-resize: reset to auto first so scrollHeight reflects true content height,
    // then clamp to max 8rem (128px) so very long messages don't overflow the viewport.
    useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${Math.min(el.scrollHeight, 128)}px`
    }, [value])

    function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault()
        const trimmed = value.trim()
        if (!trimmed || disabled) return
        onSend(trimmed)
        setValue("")
        // Defer focus until after React flushes the empty-value re-render.
        // A synchronous .focus() fires before the textarea DOM updates, causing
        // the cursor to disappear on some browsers.
        requestAnimationFrame(() => {
            textareaRef.current?.focus()
        })
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        // Enter sends; Shift+Enter inserts a newline (default textarea behavior)
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
            className="flex items-end gap-2 p-3 border-t border-border"
        >
            {/* Input wrapper — energy waveform lives here as a sibling */}
            <div className="flex-1 relative message-input__field">
                {/* Energy waveform decoration (ornate + focused only) */}
                {isFocused && !isMinimal && <div className="energy-waveform" aria-hidden="true" />}
                <textarea
                    ref={textareaRef}
                    value={value}
                    rows={1}
                    onChange={(e) => {
                        setValue(e.target.value)
                        onKeyStroke()
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Type a message..."
                    aria-label="Type a message"
                    className="glass-input w-full resize-none overflow-y-auto leading-normal py-2"
                    autoComplete="off"
                    spellCheck={false}
                    style={{ touchAction: "manipulation" }}
                    // Do NOT pass `disabled` here — a disabled textarea loses browser focus,
                    // which prevents re-focusing after send. The handleSubmit guard
                    // (if disabled return) already blocks double-sends while pending.
                />
            </div>

            {/* Send button — aligns to bottom edge when textarea grows */}
            <Button
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
            </Button>
        </form>
    )
}
