import { useButton } from "@shared/components/primitives/button"
import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Button variants using design tokens
 * Uses Tailwind CSS with design tokens from /frontend/src/styles.css
 */
const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline:
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    loading?: boolean
}

/**
 * Button component for Web
 * Uses shared button logic from @shared/components/primitives/button
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, disabled, loading, children, onClick, ...props }, ref) => {
        const { isDisabled } = useButton({
            variant: variant ?? undefined,
            size: size ?? undefined,
            disabled,
            loading,
        })

        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={isDisabled}
                onClick={onClick}
                {...props}
            >
                {loading && <span className="mr-2">⏳</span>}
                {children}
            </button>
        )
    }
)

Button.displayName = "Button"

export { Button, buttonVariants }
