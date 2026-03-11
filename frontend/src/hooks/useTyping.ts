/**
 * useTyping — debounced typing indicator for a conversation
 *
 * Emits Socket.io "typing:start" on the first keystroke within a burst and
 * "typing:stop" after TYPING_STOP_DELAY ms of inactivity. Ensures each event
 * is only sent when the state actually changes (no duplicate starts/stops).
 *
 * Usage:
 *   const { onKeyStroke } = useTyping(conversationId)
 *   <textarea onKeyDown={onKeyStroke} />
 *
 * Lifecycle:
 *   - Mounts with isTyping = false.
 *   - onKeyStroke: sets isTyping → true and emits "typing:start" (once per
 *     burst), then resets the 2-second stop timer on every subsequent stroke.
 *   - After 2 s of silence: emits "typing:stop" and resets isTyping → false.
 *   - On unmount or conversationId change: cancels pending timer and sends
 *     "typing:stop" if still in typing state, to prevent ghost indicators.
 */

import { useCallback, useEffect, useRef } from "react"

import { getSocketClient } from "@/lib/socket"

/** Milliseconds of keystroke inactivity before "typing:stop" is emitted. */
const TYPING_STOP_DELAY_MS = 2_000

export function useTyping(conversationId: string) {
    // Track whether we have already sent "typing:start" for the current burst.
    // useRef: transient value — changes must not trigger re-renders.
    const isTypingRef = useRef(false)
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const sendStop = useCallback(() => {
        const socket = getSocketClient()
        if (!socket?.connected) return
        if (isTypingRef.current) {
            isTypingRef.current = false
            socket.emit("typing:stop", { conversationId })
        }
    }, [conversationId])

    const sendStart = useCallback(() => {
        const socket = getSocketClient()
        if (!socket?.connected) return
        if (!isTypingRef.current) {
            isTypingRef.current = true
            socket.emit("typing:start", { conversationId })
        }
    }, [conversationId])

    /**
     * Call this handler on every keydown/keypress in the message input.
     * It emits "typing:start" on the first stroke of a burst and resets the
     * auto-stop timer on every subsequent stroke.
     */
    const onKeyStroke = useCallback(() => {
        sendStart()

        // Reset stop timer on every keystroke
        if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current)
        }
        stopTimerRef.current = setTimeout(sendStop, TYPING_STOP_DELAY_MS)
    }, [sendStart, sendStop])

    // Cleanup: cancel pending timer and send stop if still typing.
    // Runs on unmount and whenever conversationId changes (switching chats).
    useEffect(() => {
        return () => {
            if (stopTimerRef.current) {
                clearTimeout(stopTimerRef.current)
                stopTimerRef.current = null
            }
            sendStop()
        }
    }, [conversationId, sendStop])

    return { onKeyStroke }
}
