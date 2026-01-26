import React from "react"
import { Pressable, Text, ActivityIndicator } from "react-native"
import {
    useButton,
    type ButtonProps as PrimitiveButtonProps,
} from "@shared/components/primitives/button"

interface ButtonProps extends Omit<PrimitiveButtonProps, "children"> {
    className?: string
    children?: string
}

/**
 * Button component for Mobile (React Native + NativeWind)
 * Uses shared button logic from @shared/components/primitives/button
 * Styled with NativeWind using design tokens
 */
export function Button({
    variant = "default",
    size = "default",
    disabled,
    loading,
    onPress,
    children,
    className = "",
}: ButtonProps) {
    const { isDisabled, handlers } = useButton({
        variant,
        size,
        disabled,
        loading,
    })

    const baseClasses =
        "flex-row items-center justify-center rounded-md active:opacity-80"

    const variantClasses = {
        default: "bg-primary",
        destructive: "bg-destructive",
        outline: "border border-input bg-background",
        secondary: "bg-secondary",
        ghost: "bg-transparent",
        link: "bg-transparent",
    }

    const sizeClasses = {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
    }

    const textVariantClasses = {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: "text-foreground",
        secondary: "text-secondary-foreground",
        ghost: "text-foreground",
        link: "text-primary underline",
    }

    const textSizeClasses = {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
        icon: "text-sm",
    }

    const disabledClasses = isDisabled ? "opacity-50" : ""

    return (
        <Pressable
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
            disabled={isDisabled}
            onPress={onPress}
            {...handlers}
        >
            {loading && <ActivityIndicator className="mr-2" />}
            <Text
                className={`font-medium ${textVariantClasses[variant]} ${textSizeClasses[size]}`}
            >
                {children}
            </Text>
        </Pressable>
    )
}
