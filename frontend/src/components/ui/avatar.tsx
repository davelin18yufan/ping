import {
    useAvatar,
    type AvatarProps as PrimitiveAvatarProps,
} from "@shared/components/primitives/avatar"
import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Avatar size variants using design tokens
 */
const avatarVariants = cva(
    "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-muted",
    {
        variants: {
            size: {
                sm: "h-8 w-8 text-xs",
                md: "h-10 w-10 text-sm",
                lg: "h-12 w-12 text-base",
                xl: "h-16 w-16 text-lg",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
)

/**
 * Online status badge variants
 */
const statusVariants = cva("absolute bottom-0 right-0 rounded-full border-2 border-background", {
    variants: {
        size: {
            sm: "h-2 w-2",
            md: "h-2.5 w-2.5",
            lg: "h-3 w-3",
            xl: "h-4 w-4",
        },
        status: {
            online: "bg-green-500",
            offline: "bg-gray-400",
            away: "bg-yellow-500",
            busy: "bg-red-500",
        },
    },
    defaultVariants: {
        size: "md",
        status: "offline",
    },
})

export interface AvatarProps
    extends
        Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
        VariantProps<typeof avatarVariants>,
        Omit<PrimitiveAvatarProps, "size"> {}

/**
 * Avatar component for Web
 * Uses shared avatar logic from @shared/components/primitives/avatar
 */
const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
    (
        { className, src, alt, fallback, size, showOnlineStatus, onlineStatus, loading, ...props },
        ref
    ) => {
        const { state, handlers, shouldShowImage, shouldShowFallback } = useAvatar({
            src,
            alt,
            fallback,
            size: size ?? undefined,
            showOnlineStatus,
            onlineStatus,
            loading,
        })

        return (
            <div ref={ref} className={cn(avatarVariants({ size, className }))} {...props}>
                {/* Image */}
                {src && (
                    <img
                        src={src}
                        alt={alt || "Avatar"}
                        className={cn(
                            "h-full w-full object-cover transition-opacity duration-200",
                            shouldShowImage ? "opacity-100" : "opacity-0"
                        )}
                        onLoad={handlers.onLoad}
                        onError={handlers.onError}
                        loading="lazy"
                    />
                )}

                {/* Fallback */}
                {shouldShowFallback && (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground font-medium">
                        {loading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <span>{state.fallbackText}</span>
                        )}
                    </div>
                )}

                {/* Online Status Badge */}
                {showOnlineStatus && onlineStatus && (
                    <span
                        className={cn(statusVariants({ size, status: onlineStatus }))}
                        aria-label={`Status: ${onlineStatus}`}
                    />
                )}
            </div>
        )
    }
)

Avatar.displayName = "Avatar"

/**
 * AvatarGroup component - displays multiple avatars in a row with overlap
 */
const AvatarGroup = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => (
        <div ref={ref} className={cn("flex -space-x-2 overflow-hidden", className)} {...props}>
            {children}
        </div>
    )
)
AvatarGroup.displayName = "AvatarGroup"

export { Avatar, AvatarGroup, avatarVariants, statusVariants }
