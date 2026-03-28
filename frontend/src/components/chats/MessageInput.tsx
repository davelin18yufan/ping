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

import { useStore } from "@tanstack/react-store"
import { CornerDownLeft, Send, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { useTyping } from "@/hooks/useTyping"
import { cn } from "@/lib/utils"
import { chatStore, setReplyToMessage } from "@/stores/chatStore"

import { Button } from "../ui/button"

interface MessageInputProps {
    conversationId: string
    /**
     * Called with the message content when sending a plain message.
     * When replyToMessage is set in chatStore, the caller should fire
     * REPLY_TO_MESSAGE_MUTATION instead; this callback is NOT used in that case.
     * The parent (ChatRoom) reads chatActionsStore to decide which mutation to use.
     */
    onSend: (content: string) => void
    disabled?: boolean
}

export function MessageInput({ conversationId, onSend, disabled = false }: MessageInputProps) {
    const { isMinimal } = useAestheticMode()
    const { onKeyStroke } = useTyping(conversationId)
    const replyToMessage = useStore(chatStore, (s) => s.replyToMessage)

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

    // Auto-focus textarea when switching conversations (user enters a new chat)
    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            textareaRef.current?.focus()
        })
        return () => cancelAnimationFrame(raf)
    }, [conversationId])

    // Auto-focus textarea when a reply target is set (Reply button clicked)
    useEffect(() => {
        if (!replyToMessage?.id) return
        const raf = requestAnimationFrame(() => {
            textareaRef.current?.focus()
        })
        return () => cancelAnimationFrame(raf)
    }, [replyToMessage?.id])

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
        <div className="border-t border-border">
            {/* Reply preview strip — floats up from input edge with spring animation */}
            <AnimatePresence>
                {replyToMessage && (
                    <motion.div
                        initial={{ opacity: 0, scaleY: 0.6, y: 6 }}
                        animate={{ opacity: 1, scaleY: 1, y: 0 }}
                        exit={{ opacity: 0, scaleY: 0.7, y: 4 }}
                        style={{ transformOrigin: "bottom" }}
                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    >
                        <div className="reply-preview-strip">
                            <CornerDownLeft
                                size={14}
                                className="reply-preview-strip__icon shrink-0"
                                aria-hidden="true"
                            />
                            <div className="reply-preview-strip__content">
                                <span className="reply-preview-strip__sender">
                                    {replyToMessage.sender?.name ?? "Unknown"}
                                </span>
                                <span className="reply-preview-strip__text">
                                    {replyToMessage.content ?? ""}
                                </span>
                            </div>
                            <button
                                type="button"
                                aria-label="Cancel reply"
                                className="glass-button glass-button--icon shrink-0"
                                style={{ width: "1.5rem", height: "1.5rem" }}
                                onClick={() => setReplyToMessage(null)}
                            >
                                <X size={12} aria-hidden="true" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
                {/* Input wrapper — energy waveform lives here as a sibling */}
                <div className="flex-1 relative message-input__field">
                    {/* Energy waveform decoration (ornate + focused only) */}
                    {isFocused && !isMinimal && (
                        <div className="energy-waveform" aria-hidden="true" />
                    )}
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
        </div>
    )
}
