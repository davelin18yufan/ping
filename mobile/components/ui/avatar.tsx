import React from "react"
import {
    View,
    Text,
    Image,
    ActivityIndicator,
    type ViewProps,
} from "react-native"
import {
    useAvatar,
    type AvatarProps as PrimitiveAvatarProps,
} from "@shared/components/primitives/avatar"

interface AvatarProps
    extends Omit<ViewProps, "children">, PrimitiveAvatarProps {
    className?: string
}

/**
 * Avatar component for Mobile (React Native + NativeWind)
 * Uses shared avatar logic from @shared/components/primitives/avatar
 * Styled with NativeWind using design tokens
 */
export function Avatar({
    src,
    alt,
    fallback,
    size = "md",
    showOnlineStatus,
    onlineStatus,
    loading,
    onImageLoad,
    onImageError,
    className = "",
    ...props
}: AvatarProps) {
    const { state, handlers, shouldShowImage, shouldShowFallback } = useAvatar({
        src,
        alt,
        fallback,
        size,
        showOnlineStatus,
        onlineStatus,
        loading,
        onImageLoad,
        onImageError,
    })

    const sizeClasses = {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
    }

    const textSizeClasses = {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-lg",
    }

    const statusSizeClasses = {
        sm: "h-2 w-2",
        md: "h-2.5 w-2.5",
        lg: "h-3 w-3",
        xl: "h-4 w-4",
    }

    const statusColorClasses = {
        online: "bg-green-500",
        offline: "bg-gray-400",
        away: "bg-yellow-500",
        busy: "bg-red-500",
    }

    return (
        <View
            className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-muted ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {/* Image */}
            {src && (
                <Image
                    source={{ uri: src }}
                    alt={alt || "Avatar"}
                    className={`h-full w-full ${shouldShowImage ? "opacity-100" : "opacity-0"}`}
                    resizeMode="cover"
                    onLoad={handlers.onLoad}
                    onError={handlers.onError}
                />
            )}

            {/* Fallback */}
            {shouldShowFallback && (
                <View className="flex h-full w-full items-center justify-center bg-muted">
                    {loading ? (
                        <ActivityIndicator size="small" color="currentColor" />
                    ) : (
                        <Text
                            className={`font-medium text-muted-foreground ${textSizeClasses[size]}`}
                        >
                            {state.fallbackText}
                        </Text>
                    )}
                </View>
            )}

            {/* Online Status Badge */}
            {showOnlineStatus && onlineStatus && (
                <View
                    className={`absolute bottom-0 right-0 rounded-full border-2 border-background ${statusSizeClasses[size]} ${statusColorClasses[onlineStatus]}`}
                    accessibilityLabel={`Status: ${onlineStatus}`}
                />
            )}
        </View>
    )
}

/**
 * AvatarGroup component - displays multiple avatars in a row with overlap
 */
export function AvatarGroup({
    className = "",
    children,
    ...props
}: ViewProps & { className?: string }) {
    return (
        <View className={`flex flex-row -space-x-2 ${className}`} {...props}>
            {children}
        </View>
    )
}
