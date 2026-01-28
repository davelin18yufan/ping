import { useState, useCallback, useRef, useEffect } from "react"

import type { ButtonProps, ButtonState } from "./types"

/**
 * Headless button hook for managing button state
 * Provides consistent button behavior across Web and Mobile
 *
 * @param props - Button properties
 * @returns Button state and handlers
 */
export function useButton(props: ButtonProps) {
    // Lazy initialization: only compute initial state on first mount
    const [state, setState] = useState<ButtonState>(() => ({
        pressed: false,
        hovered: false,
        focused: false,
    }))

    // Store callback refs to avoid recreating handlers on every render
    const onPressRef = useRef(props.onPress)
    const disabledRef = useRef(props.disabled)
    const loadingRef = useRef(props.loading)

    // Update refs when props change (rerender-dependencies)
    useEffect(() => {
        onPressRef.current = props.onPress
    }, [props.onPress])

    useEffect(() => {
        disabledRef.current = props.disabled
    }, [props.disabled])

    useEffect(() => {
        loadingRef.current = props.loading
    }, [props.loading])

    // Stable handlers with no props dependencies (advanced-event-handler-refs)
    const handlePressIn = useCallback(() => {
        setState((s) => ({ ...s, pressed: true }))
    }, [])

    const handlePressOut = useCallback(() => {
        setState((s) => ({ ...s, pressed: false }))
    }, [])

    const handleHoverIn = useCallback(() => {
        setState((s) => ({ ...s, hovered: true }))
    }, [])

    const handleHoverOut = useCallback(() => {
        setState((s) => ({ ...s, hovered: false }))
    }, [])

    const handleFocus = useCallback(() => {
        setState((s) => ({ ...s, focused: true }))
    }, [])

    const handleBlur = useCallback(() => {
        setState((s) => ({ ...s, focused: false }))
    }, [])

    const handlePress = useCallback(() => {
        if (!disabledRef.current && !loadingRef.current && onPressRef.current) {
            onPressRef.current()
        }
    }, [])

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
        isDisabled: props.disabled || props.loading,
    }
}
