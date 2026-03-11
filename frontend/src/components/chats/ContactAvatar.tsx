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

import { Facehash } from "facehash"
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

const SIZE_PX: Record<"sm" | "md" | "lg", number> = {
    sm: 32,
    md: 40,
    lg: 48,
}

export function ContactAvatar({
    userId,
    name,
    image,
    isOnline,
    isFriend,
    size = "md",
    showEqBars = false,
}: ContactAvatarProps) {
    const sizePx = SIZE_PX[size]
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

            {image ? (
                <Avatar
                    src={image}
                    alt={name}
                    size={size}
                    showOnlineStatus
                    onlineStatus={isOnline ? "online" : "offline"}
                />
            ) : (
                <div className="relative" style={{ width: sizePx, height: sizePx }}>
                    <div
                        className="overflow-hidden rounded-full"
                        style={{ width: sizePx, height: sizePx }}
                    >
                        <Facehash
                            name={userId}
                            size={sizePx}
                            showInitial={true}
                            interactive={false}
                            enableBlink={false}
                            intensity3d="subtle"
                            variant="gradient"
                        />
                    </div>
                    {/* Online status dot */}
                    <span
                        className={cn(
                            "absolute bottom-0 right-0 rounded-full border-2 border-background",
                            size === "sm" ? "h-2 w-2" : size === "md" ? "h-2.5 w-2.5" : "h-3 w-3",
                            isOnline ? "bg-green-500" : "bg-gray-400"
                        )}
                        aria-label={`Status: ${isOnline ? "online" : "offline"}`}
                    />
                </div>
            )}

            {/* Stranger badge — shown when the contact is not a friend */}
            {!isFriend && (
                <div className="contact-avatar__stranger-badge" aria-label="Not a friend">
                    <UserX size={10} aria-hidden="true" />
                </div>
            )}
        </div>
    )
}
