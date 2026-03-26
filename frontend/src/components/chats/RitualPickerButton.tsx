/**
 * RitualPickerButton — opens a 3-column popover of ritual interaction types.
 *
 * On ritual select:
 *   1. Picker closes immediately.
 *   2. A sender-feedback animation class is applied to .chat-room-outer
 *      for the duration defined in the ritual's senderDuration (fire-and-remove).
 *   3. GraphQL mutation fires (fire-and-forget, non-blocking for UX).
 *
 * Click-outside: mousedown listener on document checks containment
 * against the container div ref — mirrors the UserStatusAvatar popover pattern.
 *
 * Accessibility:
 *   - aria-expanded on the trigger button.
 *   - role="menu" / role="menuitem" on the picker and items.
 *   - aria-label on each item describes the ritual.
 *   - prefers-reduced-motion: animation classes are suppressed via CSS.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Sparkles } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { SEND_RITUAL_MUTATION, conversationsQueryOptions } from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import { RITUAL_MAP, SELECTABLE_RITUALS } from "@/lib/rituals"
import type { Message } from "@/types/conversations"

interface RitualPickerButtonProps {
    conversationId: string
}

export function RitualPickerButton({ conversationId }: RitualPickerButtonProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: (ritualType: string) =>
            graphqlFetch<{ sendRitual: Message }>(SEND_RITUAL_MUTATION, {
                conversationId,
                ritualType,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
            void queryClient.invalidateQueries({
                queryKey: conversationsQueryOptions.queryKey,
            })
        },
    })

    // Click-outside: close picker on mousedown outside the container
    useEffect(() => {
        if (!isPickerOpen) return

        const handleMouseDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsPickerOpen(false)
            }
        }

        document.addEventListener("mousedown", handleMouseDown)
        return () => {
            document.removeEventListener("mousedown", handleMouseDown)
        }
    }, [isPickerOpen])

    const { mutate } = mutation
    const handleRitualSelect = useCallback(
        (ritualId: string) => {
            setIsPickerOpen(false)

            const def = RITUAL_MAP.get(ritualId)
            const senderCls = def?.senderCls
            if (senderCls) {
                const outer = document.querySelector(".chat-room-outer")
                if (outer) {
                    outer.classList.add(senderCls)
                    setTimeout(
                        () => outer.classList.remove(senderCls),
                        (def?.senderDuration ?? 0) + 50
                    )
                }
            }

            mutate(ritualId)
        },
        [mutate]
    )

    return (
        <div ref={containerRef} style={{ position: "relative" }}>
            <button
                type="button"
                className="glass-button glass-button--icon"
                onClick={() => setIsPickerOpen((prev) => !prev)}
                aria-label="Send a ritual"
                aria-expanded={isPickerOpen}
                title="Ritual"
            >
                <Sparkles size={16} aria-hidden="true" />
            </button>

            {isPickerOpen && (
                <div className="ritual-picker" role="menu" aria-label="Choose a ritual">
                    {SELECTABLE_RITUALS.map((ritual) => {
                        const Icon = ritual.icon
                        return (
                            <button
                                key={ritual.id}
                                type="button"
                                className="ritual-picker__item"
                                style={
                                    {
                                        "--ritual-item-color": ritual.color,
                                    } as React.CSSProperties
                                }
                                onClick={() => handleRitualSelect(ritual.id)}
                                aria-label={ritual.zh}
                                role="menuitem"
                            >
                                <Icon
                                    size={18}
                                    aria-hidden="true"
                                    className="ritual-picker__icon"
                                />
                                <span className="ritual-picker__label">{ritual.zh}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
