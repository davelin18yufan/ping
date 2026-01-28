import React from "react"
import { View, Text, Pressable, type ViewProps } from "react-native"
import {
    useCard,
    type CardProps as PrimitiveCardProps,
} from "@shared/components/primitives/card"

interface CardProps
    extends
        Omit<ViewProps, "children">,
        Pick<
            PrimitiveCardProps,
            "variant" | "hoverable" | "pressable" | "disabled" | "onPress"
        > {
    className?: string
    children?: React.ReactNode
}

/**
 * Card component for Mobile (React Native + NativeWind)
 * Uses shared card logic from @shared/components/primitives/card
 * Styled with NativeWind using design tokens
 */
export function Card({
    variant = "default",
    hoverable = false,
    pressable = false,
    disabled,
    onPress,
    className = "",
    children,
    ...props
}: CardProps) {
    const { state, handlers, isInteractive } = useCard({
        variant,
        hoverable,
        pressable,
        disabled,
        onPress,
    })

    const baseClasses = "rounded-lg transition-all duration-200"

    const variantClasses = {
        default: "bg-card border border-border",
        elevated: "bg-card shadow-md",
        outlined: "bg-transparent border-2 border-border",
    }

    const stateClasses = state.pressed ? "opacity-90 scale-[0.98]" : ""
    const disabledClasses = disabled ? "opacity-50" : ""

    const Component = isInteractive ? Pressable : View

    return (
        <Component
            className={`${baseClasses} ${variantClasses[variant]} ${stateClasses} ${disabledClasses} ${className}`}
            disabled={disabled}
            onPress={isInteractive ? handlers.onPress : undefined}
            onPressIn={handlers.onPressIn}
            onPressOut={handlers.onPressOut}
            accessible={isInteractive}
            accessibilityRole={isInteractive ? "button" : undefined}
            accessibilityState={{ disabled: disabled }}
            {...props}
        >
            {children}
        </Component>
    )
}

/**
 * CardHeader component - top section of card
 */
export function CardHeader({
    className = "",
    children,
    ...props
}: ViewProps & { className?: string }) {
    return (
        <View
            className={`flex flex-col space-y-1.5 p-6 ${className}`}
            {...props}
        >
            {children}
        </View>
    )
}

/**
 * CardTitle component - main heading of card
 */
export function CardTitle({
    className = "",
    children,
    ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
    return (
        <Text
            className={`text-2xl font-semibold leading-tight text-card-foreground ${className}`}
            {...props}
        >
            {children}
        </Text>
    )
}

/**
 * CardDescription component - subtitle/description text
 */
export function CardDescription({
    className = "",
    children,
    ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
    return (
        <Text
            className={`text-sm text-muted-foreground ${className}`}
            {...props}
        >
            {children}
        </Text>
    )
}

/**
 * CardContent component - main content area
 */
export function CardContent({
    className = "",
    children,
    ...props
}: ViewProps & { className?: string }) {
    return (
        <View className={`p-6 pt-0 ${className}`} {...props}>
            {children}
        </View>
    )
}

/**
 * CardFooter component - bottom section with actions
 */
export function CardFooter({
    className = "",
    children,
    ...props
}: ViewProps & { className?: string }) {
    return (
        <View
            className={`flex flex-row items-center p-6 pt-0 ${className}`}
            {...props}
        >
            {children}
        </View>
    )
}
