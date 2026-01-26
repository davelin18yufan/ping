import { useCard, type CardProps as PrimitiveCardProps } from "@shared/components/primitives/card"
import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Card variants using design tokens
 * Uses Tailwind CSS with design tokens from /frontend/src/styles.css
 */
const cardVariants = cva(
    "rounded-lg text-card-foreground transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    {
        variants: {
            variant: {
                default: "bg-card border border-border",
                elevated: "bg-card shadow-md hover:shadow-lg",
                outlined: "bg-transparent border-2 border-border",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface CardProps
    extends
        React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof cardVariants>,
        Pick<PrimitiveCardProps, "hoverable" | "pressable" | "disabled" | "onPress"> {}

/**
 * Card component for Web
 * Uses shared card logic from @shared/components/primitives/card
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            className,
            variant,
            hoverable = false,
            pressable = false,
            disabled,
            onPress,
            onClick,
            children,
            ...props
        },
        ref
    ) => {
        const { state, handlers, isInteractive } = useCard({
            variant: variant ?? undefined,
            hoverable,
            pressable,
            disabled,
            onPress,
        })

        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
            if (!disabled) {
                handlers.onPress()
                onClick?.(e)
            }
        }

        return (
            <div
                ref={ref}
                className={cn(
                    cardVariants({ variant, className }),
                    isInteractive && "cursor-pointer",
                    state.hovered && variant === "default" && "border-ring/50",
                    state.hovered && variant === "outlined" && "border-ring",
                    state.pressed && "scale-[0.98]",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleClick}
                onMouseEnter={handlers.onMouseEnter}
                onMouseLeave={handlers.onMouseLeave}
                onFocus={handlers.onFocus}
                onBlur={handlers.onBlur}
                tabIndex={isInteractive && !disabled ? 0 : undefined}
                role={isInteractive ? "button" : undefined}
                aria-disabled={disabled}
                {...props}
            >
                {children}
            </div>
        )
    }
)

Card.displayName = "Card"

/**
 * CardHeader component - top section of card
 */
const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
    )
)
CardHeader.displayName = "CardHeader"

/**
 * CardTitle component - main heading of card
 */
const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    )
)
CardTitle.displayName = "CardTitle"

/**
 * CardDescription component - subtitle/description text
 */
const CardDescription = forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

/**
 * CardContent component - main content area
 */
const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
    )
)
CardContent.displayName = "CardContent"

/**
 * CardFooter component - bottom section with actions
 */
const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
    )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
