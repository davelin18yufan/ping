/**
 * UserStatusAvatar Component
 *
 * Displays the user's Facehash avatar with:
 * - Presence status badge (bottom-right colored dot)
 * - Sound wave rings when status is "online" (three staggered expanding rings)
 * - Click-to-open status picker (when isInteractive=true)
 *
 * Status options: online | away | busy | offline
 * Colors sourced from @shared/design-tokens/css/colors.css (--status-*)
 * Pulse timing from @shared/design-tokens/css/effects.css (--status-pulse-*)
 */

import { Facehash } from "facehash"
import { useEffect, useRef, useState } from "react"

export type UserPresenceStatus = "online" | "away" | "busy" | "offline"

interface StatusOption {
    value: UserPresenceStatus
    label: string
    description: string
}

const STATUS_OPTIONS: StatusOption[] = [
    { value: "online",  label: "Online",           description: "Active and available"   },
    { value: "away",    label: "Away",              description: "Stepped away"           },
    { value: "busy",    label: "Do Not Disturb",    description: "Notifications silenced" },
    { value: "offline", label: "Appear Offline",    description: "Hidden from others"     },
]

interface UserStatusAvatarProps {
    userId: string
    userName?: string
    size?: number
    isInteractive?: boolean
}

export function UserStatusAvatar({
    userId,
    userName,
    size = 26,
    isInteractive = false,
}: UserStatusAvatarProps) {
    const [status, setStatus] = useState<UserPresenceStatus>("online")
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close picker when clicking outside
    useEffect(() => {
        if (!isPickerOpen) return
        const handleOutsideClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsPickerOpen(false)
            }
        }
        document.addEventListener("mousedown", handleOutsideClick)
        return () => document.removeEventListener("mousedown", handleOutsideClick)
    }, [isPickerOpen])

    const handleAvatarClick = () => {
        if (!isInteractive) return
        setIsPickerOpen((prev) => !prev)
    }

    const handleStatusSelect = (newStatus: UserPresenceStatus) => {
        setStatus(newStatus)
        setIsPickerOpen(false)
    }

    const displayName = userName ?? userId
    const isOnline = status === "online"

    return (
        <div
            ref={containerRef}
            className="user-status-avatar"
            style={{ position: "relative", flexShrink: 0 }}
        >
            {/* Avatar + badge wrapper */}
            <div
                className={`user-status-avatar__wrapper${isInteractive ? " user-status-avatar__wrapper--interactive" : ""}`}
                onClick={handleAvatarClick}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-label={
                    isInteractive
                        ? `${displayName} — Status: ${status}. Click to change.`
                        : `${displayName} — ${status}`
                }
                aria-haspopup={isInteractive ? "listbox" : undefined}
                aria-expanded={isInteractive ? isPickerOpen : undefined}
                onKeyDown={(e) => {
                    if (isInteractive && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        setIsPickerOpen((prev) => !prev)
                    }
                }}
                style={{
                    position: "relative",
                    display: "inline-flex",
                    cursor: isInteractive ? "pointer" : "default",
                }}
            >
                {/* Sound wave rings — only when online */}
                {isOnline && (
                    <span className="user-status-wave" aria-hidden="true">
                        <span className="user-status-wave__ring" />
                        <span className="user-status-wave__ring" />
                        <span className="user-status-wave__ring" />
                    </span>
                )}

                {/* Facehash avatar */}
                <div
                    className="overflow-hidden rounded-full"
                    style={{ width: size, height: size, position: "relative", zIndex: 1 }}
                >
                    <Facehash
                        name={userId}
                        size={size}
                        showInitial={true}
                        interactive={false}
                        enableBlink={true}
                        intensity3d="subtle"
                        variant="gradient"
                    />
                </div>

                {/* Status badge */}
                <span
                    className={`user-status-badge user-status-badge--${status}`}
                    aria-hidden="true"
                    style={{ zIndex: 2 }}
                />
            </div>

            {/* Status picker popover */}
            {isInteractive && isPickerOpen && (
                <div
                    className="user-status-picker"
                    role="listbox"
                    aria-label="Select presence status"
                >
                    {STATUS_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            role="option"
                            aria-selected={status === option.value}
                            className={`user-status-picker__item${status === option.value ? " user-status-picker__item--active" : ""}`}
                            onClick={() => handleStatusSelect(option.value)}
                        >
                            <span
                                className={`user-status-picker__dot user-status-badge--${option.value}`}
                                aria-hidden="true"
                            />
                            <span className="user-status-picker__text">
                                <span className="user-status-picker__label">{option.label}</span>
                                <span className="user-status-picker__desc">{option.description}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
