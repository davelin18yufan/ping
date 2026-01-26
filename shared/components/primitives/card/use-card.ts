import { useState, useCallback } from "react"

import type { CardProps, CardState } from "./types"

/**
 * Headless card hook for managing card state
 * Provides consistent card behavior across Web and Mobile
 *
 * @param props - Card properties
 * @returns Card state and handlers
 */
export function useCard(props: CardProps) {
    const [state, setState] = useState<CardState>({
        hovered: false,
        pressed: false,
        focused: false,
    })

    const handlePressIn = useCallback(() => {
        if (props.pressable && !props.disabled) {
            setState((s) => ({ ...s, pressed: true }))
        }
    }, [props.pressable, props.disabled])

    const handlePressOut = useCallback(() => {
        if (props.pressable && !props.disabled) {
            setState((s) => ({ ...s, pressed: false }))
        }
    }, [props.pressable, props.disabled])

    const handleHoverIn = useCallback(() => {
        if (props.hoverable && !props.disabled) {
            setState((s) => ({ ...s, hovered: true }))
        }
    }, [props.hoverable, props.disabled])

    const handleHoverOut = useCallback(() => {
        if (props.hoverable && !props.disabled) {
            setState((s) => ({ ...s, hovered: false }))
        }
    }, [props.hoverable, props.disabled])

    const handleFocus = useCallback(() => {
        if (!props.disabled) {
            setState((s) => ({ ...s, focused: true }))
        }
    }, [props.disabled])

    const handleBlur = useCallback(() => {
        if (!props.disabled) {
            setState((s) => ({ ...s, focused: false }))
        }
    }, [props.disabled])

    const handlePress = useCallback(() => {
        if (!props.disabled && props.onPress) {
            props.onPress()
        }
    }, [props.disabled, props.onPress])

    return {
        state,
        handlers: {
            onPressIn: handlePressIn,
            onPressOut: handlePressOut,
            onMouseEnter: handleHoverIn,
            onMouseLeave: handleHoverOut,
            onFocus: handleFocus,
            onBlur: handleBlur,
            onPress: handlePress,
        },
        isDisabled: props.disabled,
        isInteractive: props.hoverable || props.pressable || Boolean(props.onPress),
    }
}
