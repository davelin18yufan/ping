import React from "react"
import {
    View,
    TextInput,
    Text,
    type TextInputProps,
    type TextInputSubmitEditingEvent,
} from "react-native"
import {
    useInput,
    type InputProps as PrimitiveInputProps,
} from "@shared/components/primitives/input"

interface InputProps
    extends
        Omit<TextInputProps, "onChange" | "onFocus" | "onBlur">,
        Pick<
            PrimitiveInputProps,
            | "variant"
            | "size"
            | "disabled"
            | "readOnly"
            | "error"
            | "leftIcon"
            | "rightIcon"
            | "onChange"
            | "onFocus"
            | "onBlur"
            | "onSubmit"
        > {
    className?: string
}

/**
 * Input component for Mobile (React Native + NativeWind)
 * Uses shared input logic from @shared/components/primitives/input
 * Styled with NativeWind using design tokens
 */
export function Input({
    variant = "default",
    size = "md",
    disabled,
    editable = true,
    error,
    leftIcon,
    rightIcon,
    value,
    defaultValue,
    placeholder,
    maxLength,
    onChange,
    onFocus,
    onBlur,
    onSubmitEditing,
    onSubmit,
    className = "",
    ...props
}: InputProps) {
    const { handlers, isDisabled } = useInput({
        variant,
        size,
        disabled,
        readOnly: !editable,
        error,
        value,
        defaultValue,
        placeholder,
        maxLength,
        onChange,
        onFocus,
        onBlur,
        onSubmit,
    })

    const handleChangeText = (text: string) => {
        handlers.onChange(text)
    }

    const handleSubmit = (e: TextInputSubmitEditingEvent) => {
        handlers.onSubmit()
        onSubmitEditing?.(e)
    }

    const baseClasses =
        "w-full rounded-md border bg-background px-3 transition-colors"

    const variantClasses = {
        default: "border-input",
        error: "border-destructive",
        disabled: "border-input opacity-50",
    }

    const sizeClasses = {
        sm: "h-9 text-xs",
        md: "h-10 text-sm",
        lg: "h-11 text-base",
    }

    const textClasses = "text-foreground"
    const placeholderClasses = "text-muted-foreground"

    const inputVariant = error ? "error" : disabled ? "disabled" : variant

    return (
        <View className="w-full">
            <View className="relative">
                {leftIcon && (
                    <View className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                        {leftIcon}
                    </View>
                )}
                <TextInput
                    className={`${baseClasses} ${variantClasses[inputVariant]} ${sizeClasses[size]} ${textClasses} ${leftIcon ? "pl-10" : ""} ${rightIcon ? "pr-10" : ""} ${className}`}
                    editable={!isDisabled && editable}
                    value={value}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderClasses}
                    maxLength={maxLength}
                    onChangeText={handleChangeText}
                    onFocus={handlers.onFocus}
                    onBlur={handlers.onBlur}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="done"
                    {...props}
                />
                {rightIcon && (
                    <View className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2">
                        {rightIcon}
                    </View>
                )}
            </View>
            {error && typeof error === "string" && (
                <Text className="mt-1.5 text-xs text-destructive">{error}</Text>
            )}
        </View>
    )
}
