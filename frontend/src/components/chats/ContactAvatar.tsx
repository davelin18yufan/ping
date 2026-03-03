/**
 * ContactAvatar — Avatar wrapper for conversation participants.
 *
 * Adds:
 *  - EQ bars that animate above the avatar when `showEqBars` is true (ornate mode)
 *  - Stranger badge (amber dot with UserX icon) when `isFriend` is false
 *
 * The Avatar component from @/components/ui/avatar handles the image/fallback
 * and the online status dot.
 */

import { UserX } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ContactAvatarProps {
    userId: string
    name: string
    image: string | null
    isOnline: boolean
    isFriend: boolean
    size?: "sm" | "md" | "lg"
    /** When true, plays the EQ bar animation (e.g. new message just arrived) */
    showEqBars?: boolean
}

export function ContactAvatar({
    userId: _userId,
    name,
    image,
    isOnline,
    isFriend,
    size = "md",
    showEqBars = false,
}: ContactAvatarProps) {
    return (
        <div
            className={cn("contact-avatar", showEqBars && "contact-avatar--active")}
            aria-label={`${name}, ${isOnline ? "online" : "offline"}${!isFriend ? ", not a friend" : ""}`}
        >
            {/* EQ bars — decorative, shown only when showEqBars is true */}
            {showEqBars && (
                <div className="contact-avatar__eq-bars" aria-hidden="true">
                    <span className="contact-avatar__eq-bar" />
                    <span className="contact-avatar__eq-bar" />
                    <span className="contact-avatar__eq-bar" />
                    <span className="contact-avatar__eq-bar" />
                    <span className="contact-avatar__eq-bar" />
                </div>
            )}

            <Avatar
                src={image ?? undefined}
                alt={name}
                fallback={name.charAt(0).toUpperCase()}
                size={size}
                showOnlineStatus
                onlineStatus={isOnline ? "online" : "offline"}
            />

            {/* Stranger badge — shown when the contact is not a friend */}
            {!isFriend && (
                <div className="contact-avatar__stranger-badge" aria-label="Not a friend">
                    <UserX size={10} aria-hidden="true" />
                </div>
            )}
        </div>
    )
}
