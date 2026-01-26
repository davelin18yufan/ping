import type { ReactNode } from "react"

export type CardVariant = "default" | "elevated" | "outlined"

export interface CardProps {
    variant?: CardVariant
    hoverable?: boolean
    pressable?: boolean
    disabled?: boolean
    children?: ReactNode
    onPress?: () => void
}

export interface CardState {
    hovered: boolean
    pressed: boolean
    focused: boolean
}
