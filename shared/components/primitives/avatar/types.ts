export type AvatarSize = "sm" | "md" | "lg" | "xl"

export type OnlineStatus = "online" | "offline" | "away" | "busy"

export interface AvatarProps {
    src?: string
    alt?: string
    fallback?: string
    size?: AvatarSize
    showOnlineStatus?: boolean
    onlineStatus?: OnlineStatus
    loading?: boolean
}

export interface AvatarState {
    imageLoaded: boolean
    imageError: boolean
    fallbackText: string
}
