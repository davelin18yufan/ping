/**
 * RitualPickerButton — opens a 3-column popover of ritual interaction types.
 *
 * On ritual select:
 *   1. Picker closes immediately.
 *   2. A sender-feedback animation class is applied to .chat-room-outer
 *      for the duration defined in RITUAL_ANIMATION (fire-and-remove).
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
import { Flame, Heart, HeartCrack, HelpCircle, PartyPopper, Sparkles, XCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { SEND_RITUAL_MUTATION, conversationsQueryOptions } from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import type { Message } from "@/types/conversations"

interface RitualPickerButtonProps {
    conversationId: string
}

const RITUALS = [
    { id: "APOLOGY", icon: HeartCrack, label: "道歉", color: "var(--ritual-apology)" },
    { id: "CELEBRATE", icon: PartyPopper, label: "恭喜", color: "var(--ritual-celebrate)" },
    { id: "TAUNT", icon: Flame, label: "嗆聲", color: "var(--ritual-taunt)" },
    { id: "LONGING", icon: Heart, label: "思念", color: "var(--ritual-reconcile)" },
    { id: "QUESTION", icon: HelpCircle, label: "疑問", color: "var(--ritual-question)" },
    { id: "REJECTION", icon: XCircle, label: "拒絕", color: "var(--ritual-reject)" },
] as const

const RITUAL_ANIMATION: Record<string, { cls: string; duration: number }> = {
    APOLOGY: { cls: "is-ritual-apology", duration: 650 },
    CELEBRATE: { cls: "is-ritual-celebrate", duration: 550 },
    TAUNT: { cls: "is-ritual-taunt", duration: 380 },
    LONGING: { cls: "is-ritual-longing", duration: 760 },
    QUESTION: { cls: "is-ritual-question", duration: 480 },
    REJECTION: { cls: "is-ritual-rejection", duration: 450 },
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

            const anim = RITUAL_ANIMATION[ritualId]
            if (anim) {
                const outer = document.querySelector(".chat-room-outer")
                if (outer) {
                    outer.classList.add(anim.cls)
                    setTimeout(() => outer.classList.remove(anim.cls), anim.duration + 50)
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
                    {RITUALS.map((ritual) => {
                        const Icon = ritual.icon
                        return (
                            <button
                                key={ritual.id}
                                type="button"
                                className="ritual-picker__item"
                                style={
                                    { "--ritual-item-color": ritual.color } as React.CSSProperties
                                }
                                onClick={() => handleRitualSelect(ritual.id)}
                                aria-label={ritual.label}
                                role="menuitem"
                            >
                                <Icon
                                    size={18}
                                    aria-hidden="true"
                                    className="ritual-picker__icon"
                                />
                                <span className="ritual-picker__label">{ritual.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
