import type { ReactNode } from "react"

export type InputVariant = "default" | "error" | "disabled"

export type InputSize = "sm" | "md" | "lg"

export interface InputProps {
    variant?: InputVariant
    size?: InputSize
    value?: string
    defaultValue?: string
    placeholder?: string
    disabled?: boolean
    readOnly?: boolean
    error?: string | boolean
    leftIcon?: ReactNode
    rightIcon?: ReactNode
    type?: string
    maxLength?: number
    onChange?: (value: string) => void
    onFocus?: () => void
    onBlur?: () => void
    onSubmit?: () => void
}

export interface InputState {
    focused: boolean
    hovered: boolean
    value: string
    hasError: boolean
}
