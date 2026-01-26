import {
    useInput,
    type InputProps as PrimitiveInputProps,
} from "@shared/components/primitives/input"
import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Input variants using design tokens
 * Uses Tailwind CSS with design tokens from /frontend/src/styles.css
 */
const inputVariants = cva(
    "flex w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "border-input hover:border-ring/50",
                error: "border-destructive focus-visible:ring-destructive",
                disabled: "border-input cursor-not-allowed opacity-50",
            },
            size: {
                sm: "h-9 text-xs",
                md: "h-10 text-sm",
                lg: "h-11 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)

export interface InputProps
    extends
        Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange">,
        VariantProps<typeof inputVariants>,
        Pick<PrimitiveInputProps, "error" | "leftIcon" | "rightIcon"> {
    onChange?: (value: string) => void
    onSubmit?: () => void
}

/**
 * Input component for Web
 * Uses shared input logic from @shared/components/primitives/input
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            className,
            variant,
            size,
            disabled,
            readOnly,
            error,
            leftIcon,
            rightIcon,
            type = "text",
            value,
            defaultValue,
            placeholder,
            maxLength,
            onChange,
            onFocus,
            onBlur,
            onKeyDown,
            onSubmit,
            ...props
        },
        ref
    ) => {
        const { handlers, isDisabled, isReadOnly } = useInput({
            variant: variant ?? undefined,
            size: size ?? undefined,
            disabled,
            readOnly,
            error,
            type,
            value: typeof value === "string" ? value : String(value ?? ""),
            defaultValue:
                typeof defaultValue === "string" ? defaultValue : String(defaultValue ?? ""),
            placeholder,
            maxLength,
            onChange,
            onSubmit,
        })

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && onSubmit) {
                e.preventDefault()
                handlers.onSubmit()
            }
            onKeyDown?.(e)
        }

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            handlers.onChange(e.target.value)
        }

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            handlers.onFocus()
            onFocus?.(e)
        }

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            handlers.onBlur()
            onBlur?.(e)
        }

        const inputVariant = error ? "error" : disabled ? "disabled" : variant || "default"

        return (
            <div className="relative w-full">
                {leftIcon && (
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {leftIcon}
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        inputVariants({ variant: inputVariant, size, className }),
                        leftIcon && "pl-10",
                        rightIcon && "pr-10"
                    )}
                    ref={ref}
                    disabled={isDisabled}
                    readOnly={isReadOnly}
                    value={value}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onMouseEnter={handlers.onMouseEnter}
                    onMouseLeave={handlers.onMouseLeave}
                    onKeyDown={handleKeyDown}
                    {...props}
                />
                {rightIcon && (
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {rightIcon}
                    </div>
                )}
                {error && typeof error === "string" && (
                    <p className="mt-1.5 text-xs text-destructive">{error}</p>
                )}
            </div>
        )
    }
)

Input.displayName = "Input"

export { Input, inputVariants }
