/**
 * SonicPingButton — sends a sonic ping ritual to the other user.
 *
 * Three concentric rings expand and fade on click (sonic-ring animation).
 * Uses the --ritual-nudge token (cyan-blue) for ring color.
 *
 * On click:
 *   1. Animation fires immediately (optimistic feedback).
 *   2. Screen-shake class applied to chat-room-outer (sender feedback).
 *   3. GraphQL mutation sends the ping to the server.
 *   4. On success: invalidate messages + conversations query caches.
 *
 * Accessibility:
 *   - aria-label describes the action.
 *   - aria-disabled while firing prevents double-trigger.
 *   - Rings are aria-hidden (decorative).
 *   - prefers-reduced-motion: animation is suppressed via CSS.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Zap } from "lucide-react"
import * as React from "react"

import {
    SEND_SONIC_PING_MUTATION,
    conversationsQueryOptions,
} from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import type { Message } from "@/types/conversations"

interface SonicPingButtonProps {
    conversationId: string
    className?: string
}

export function SonicPingButton({ conversationId, className }: SonicPingButtonProps) {
    const [isFiring, setIsFiring] = React.useState(false)
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: () =>
            graphqlFetch<{ sendSonicPing: Message }>(SEND_SONIC_PING_MUTATION, {
                conversationId,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
            void queryClient.invalidateQueries({
                queryKey: conversationsQueryOptions.queryKey,
            })
        },
    })

    const handlePing = React.useCallback(() => {
        if (isFiring) return

        // Fire animation immediately (optimistic)
        setIsFiring(true)

        // Apply screen-shake to the chat room outer container (sender feedback)
        const chatRoomOuter = document.querySelector(".chat-room-outer")
        if (chatRoomOuter) {
            chatRoomOuter.classList.add("is-shaking")
            setTimeout(() => chatRoomOuter.classList.remove("is-shaking"), 300)
        }

        // Last ring: 0.36s delay + 1s animation = ~1.36s; 1400ms gives a clean buffer.
        setTimeout(() => setIsFiring(false), 1400)

        // Send mutation (fire-and-forget, errors are non-blocking for UX)
        mutation.mutate()
    }, [isFiring, mutation])

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
