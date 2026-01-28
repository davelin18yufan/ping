import { useState, useCallback, useRef, useEffect } from "react"

import type { CardProps, CardState } from "./types"

/**
 * Headless card hook for managing card state
 * Provides consistent card behavior across Web and Mobile
 *
 * @param props - Card properties
 * @returns Card state and handlers
 */
export function useCard(props: CardProps) {
    // Lazy initialization: only compute initial state on first mount
    const [state, setState] = useState<CardState>(() => ({
        hovered: false,
        pressed: false,
        focused: false,
    }))

    // Store callback refs to avoid recreating handlers on every render
    const onPressRef = useRef(props.onPress)
    const pressableRef = useRef(props.pressable)
    const hoverableRef = useRef(props.hoverable)
    const disabledRef = useRef(props.disabled)

    // Update refs when props change (rerender-dependencies)
    useEffect(() => {
        onPressRef.current = props.onPress
    }, [props.onPress])

    useEffect(() => {
        pressableRef.current = props.pressable
    }, [props.pressable])

    useEffect(() => {
        hoverableRef.current = props.hoverable
    }, [props.hoverable])

    useEffect(() => {
        disabledRef.current = props.disabled
    }, [props.disabled])

    // Stable handlers with no props dependencies (advanced-event-handler-refs)
    const handlePressIn = useCallback(() => {
        if (pressableRef.current && !disabledRef.current) {
            setState((s) => ({ ...s, pressed: true }))
        }
    }, [])

    const handlePressOut = useCallback(() => {
        if (pressableRef.current && !disabledRef.current) {
            setState((s) => ({ ...s, pressed: false }))
        }
    }, [])

    const handleHoverIn = useCallback(() => {
        if (hoverableRef.current && !disabledRef.current) {
            setState((s) => ({ ...s, hovered: true }))
        }
    }, [])

    const handleHoverOut = useCallback(() => {
        if (hoverableRef.current && !disabledRef.current) {
            setState((s) => ({ ...s, hovered: false }))
        }
    }, [])

    const handleFocus = useCallback(() => {
        if (!disabledRef.current) {
            setState((s) => ({ ...s, focused: true }))
        }
    }, [])

    const handleBlur = useCallback(() => {
        if (!disabledRef.current) {
            setState((s) => ({ ...s, focused: false }))
        }
    }, [])

    const handlePress = useCallback(() => {
        if (!disabledRef.current && onPressRef.current) {
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
        isDisabled: props.disabled,
        isInteractive: props.hoverable || props.pressable || Boolean(props.onPress),
    }
}
