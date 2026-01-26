import { useState } from "react"

import type { ButtonProps, ButtonState } from "./types"

/**
 * Headless button hook for managing button state
 * Provides consistent button behavior across Web and Mobile
 *
 * @param props - Button properties
 * @returns Button state and handlers
 */
export function useButton(props: ButtonProps) {
    const [state, setState] = useState<ButtonState>({
        pressed: false,
        hovered: false,
        focused: false,
    })

    const handlePressIn = () => setState((s) => ({ ...s, pressed: true }))
    const handlePressOut = () => setState((s) => ({ ...s, pressed: false }))
    const handleHoverIn = () => setState((s) => ({ ...s, hovered: true }))
    const handleHoverOut = () => setState((s) => ({ ...s, hovered: false }))
    const handleFocus = () => setState((s) => ({ ...s, focused: true }))
    const handleBlur = () => setState((s) => ({ ...s, focused: false }))

    return {
        state,
        handlers: {
            onPressIn: handlePressIn,
            onPressOut: handlePressOut,
            onMouseEnter: handleHoverIn,
            onMouseLeave: handleHoverOut,
            onFocus: handleFocus,
            onBlur: handleBlur,
        },
        isDisabled: props.disabled || props.loading,
    }
}
