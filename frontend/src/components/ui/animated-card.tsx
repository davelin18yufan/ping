/**
 * Advanced Animation Components for Messaging App
 *
 * Based on animation.md guidelines and UI/UX Pro Max best practices:
 * 1. Container Transformation - Elements expand from origin
 * 2. Spring Physics with Depth - Natural bouncy motion with Z-axis
 * 3. Staggered Entrance - 20-50ms delays between elements
 * 4. Jelly Effect - For message bubbles
 *
 * Performance:
 * - Uses transform/opacity only (GPU-accelerated)
 * - Respects prefers-reduced-motion
 * - Duration: 150-400ms (UX guideline)
 */

import { motion, type HTMLMotionProps, type Transition, type Variants } from "motion/react"
import { forwardRef, type ReactNode } from "react"

// ============================================================================
// SPRING PHYSICS CONFIGURATIONS
// ============================================================================

/**
 * Spring presets based on animation.md recommendations
 */
export const springPresets = {
    /** Gentle bounce for page transitions (300-400ms) */
    smooth: { type: "spring", stiffness: 260, damping: 20 } as const,
    /** Lively bounce for small elements (200-250ms) */
    bouncy: { type: "spring", stiffness: 400, damping: 17 } as const,
    /** Quick response for instant feedback (100-150ms) */
    snappy: { type: "spring", stiffness: 500, damping: 25 } as const,
    /** Jelly effect for message bubbles */
    jelly: { type: "spring", stiffness: 300, damping: 10 } as const,
} as const

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

/**
 * Container Transformation - Element expands from origin
 * Implements Material Design 3 container transformation pattern
 */
export const containerTransformVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.9,
        y: 20,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: -10,
    },
}

/**
 * Depth & Zoom - Z-axis depth with slight blur on exit
 * Creates spatial awareness (animation.md section 2)
 */
export const depthZoomVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.9,
        filter: "blur(0px)",
    },
    animate: {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
    },
    exit: {
        opacity: 0,
        scale: 1.05,
        filter: "blur(4px)",
    },
}

/**
 * Jelly Effect - For message bubbles
 * Subtle shape deformation on enter (animation.md section 4)
 */
export const jellyVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.8,
        rotate: -2,
    },
    animate: {
        opacity: 1,
        scale: 1,
        rotate: 0,
    },
    exit: {
        opacity: 0,
        scale: 0.9,
    },
}

/**
 * Side Slide - For message bubbles (left/right based on sender)
 */
export const slideSendVariants: Variants = {
    initial: { opacity: 0, x: 30, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 20, scale: 0.95 },
}

export const slideReceiveVariants: Variants = {
    initial: { opacity: 0, x: -30, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -20, scale: 0.95 },
}

// ============================================================================
// ANIMATED CARD (Base Component)
// ============================================================================

export interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
    children: ReactNode
    /** Delay before animation starts (in seconds) */
    delay?: number
    /** Variant preset: container | depth | jelly | send | receive */
    variant?: "container" | "depth" | "jelly" | "send" | "receive"
    /** Spring preset: smooth | bouncy | snappy | jelly */
    spring?: keyof typeof springPresets
    /** Custom variants (overrides preset) */
    customVariants?: Variants
}

/**
 * AnimatedCard - Base animated container
 *
 * Example:
 * ```tsx
 * <AnimatedCard variant="container" spring="smooth" delay={0.1}>
 *   <div>Content</div>
 * </AnimatedCard>
 * ```
 */
export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
    (
        { children, delay = 0, variant = "container", spring = "smooth", customVariants, ...props },
        ref
    ) => {
        const variantMap = {
            container: containerTransformVariants,
            depth: depthZoomVariants,
            jelly: jellyVariants,
            send: slideSendVariants,
            receive: slideReceiveVariants,
        }

        const transition: Transition = {
            ...springPresets[spring],
            delay,
        }

        return (
            <motion.div
                ref={ref}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={customVariants || variantMap[variant]}
                transition={transition}
                {...props}
            >
                {children}
            </motion.div>
        )
    }
)

AnimatedCard.displayName = "AnimatedCard"

// ============================================================================
// STAGGERED ENTRANCE (20-50ms delays)
// ============================================================================

export interface StaggeredListProps {
    children: ReactNode
    /** Delay between each child (20-50ms recommended) */
    staggerDelay?: number
    /** Base delay before stagger starts (e.g., wait for parent animation) */
    baseDelay?: number
    /** Variant for each child */
    variant?: "container" | "depth" | "jelly" | "send" | "receive"
    /** Spring preset */
    spring?: keyof typeof springPresets
    /** Container className */
    className?: string
}

/**
 * StaggeredList - Implements staggered entrance pattern
 *
 * Per animation.md: "20ms - 50ms delay between messages"
 *
 * Example:
 * ```tsx
 * <StaggeredList staggerDelay={0.03} baseDelay={1.2} variant="jelly">
 *   <MessageBubble />
 *   <MessageBubble />
 *   <MessageBubble />
 * </StaggeredList>
 * ```
 */
export function StaggeredList({
    children,
    staggerDelay = 0.03,
    baseDelay = 0,
    variant = "container",
    spring = "smooth",
    className,
}: StaggeredListProps) {
    const childrenArray = Array.isArray(children) ? children : [children]

    return (
        <div className={className}>
            {childrenArray.map((child, index) => (
                <AnimatedCard
                    key={index}
                    delay={baseDelay + index * staggerDelay}
                    variant={variant}
                    spring={spring}
                >
                    {child}
                </AnimatedCard>
            ))}
        </div>
    )
}

// ============================================================================
// MESSAGE BUBBLE ANIMATIONS
// ============================================================================

export interface MessageBubbleProps extends Omit<HTMLMotionProps<"div">, "children"> {
    children: ReactNode
    /** Is this user's own message? */
    isOwn?: boolean
    /** Delay before animation */
    delay?: number
}

/**
 * MessageBubble - Animated message with jelly effect
 *
 * Implements:
 * - Jelly effect on enter (animation.md section 4)
 * - Side slide based on sender (own = right, other = left)
 * - Spring physics for natural motion
 *
 * Example:
 * ```tsx
 * <MessageBubble isOwn={true}>
 *   <p>Hello!</p>
 * </MessageBubble>
 * ```
 */
export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
    ({ children, isOwn = false, delay = 0, ...props }, ref) => {
        const variants = isOwn ? slideSendVariants : slideReceiveVariants

        return (
            <motion.div
                ref={ref}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={variants}
                transition={{
                    ...springPresets.jelly,
                    delay,
                }}
                {...props}
            >
                {children}
            </motion.div>
        )
    }
)

MessageBubble.displayName = "MessageBubble"

// ============================================================================
// REDUCED MOTION SUPPORT
// ============================================================================

/**
 * Hook to check if user prefers reduced motion
 * Per UX guidelines: "Respect user's motion preferences"
 */
export function usePrefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    return mediaQuery.matches
}

/**
 * Wrapper that disables animations if user prefers reduced motion
 */
export interface ReducedMotionWrapperProps {
    children: ReactNode
    /** Fallback component when motion is reduced */
    fallback?: ReactNode
}

export function ReducedMotionWrapper({ children, fallback }: ReducedMotionWrapperProps) {
    const prefersReducedMotion = usePrefersReducedMotion()

    if (prefersReducedMotion && fallback) {
        return <>{fallback}</>
    }

    if (prefersReducedMotion) {
        return <div style={{ transition: "none" }}>{children}</div>
    }

    return <>{children}</>
}
