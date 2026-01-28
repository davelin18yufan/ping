import { useState, useCallback, useRef, useEffect } from "react"

import type { InputProps, InputState } from "./types"

/**
 * Headless input hook for managing input state
 * Provides consistent input behavior across Web and Mobile
 *
 * @param props - Input properties
 * @returns Input state and handlers
 */
export function useInput(props: InputProps) {
    // Use lazy initialization to avoid re-computing on every render
    const [state, setState] = useState<InputState>(() => ({
        focused: false,
        hovered: false,
        value: props.defaultValue || props.value || "",
        hasError: Boolean(props.error),
    }))

    // Store callback refs to avoid recreating handlers on every render
    const onFocusRef = useRef(props.onFocus)
    const onBlurRef = useRef(props.onBlur)
    const onChangeRef = useRef(props.onChange)
    const onSubmitRef = useRef(props.onSubmit)
    const maxLengthRef = useRef(props.maxLength)

    // Update refs when props change
    useEffect(() => {
        onFocusRef.current = props.onFocus
    }, [props.onFocus])

    useEffect(() => {
        onBlurRef.current = props.onBlur
    }, [props.onBlur])

    useEffect(() => {
        onChangeRef.current = props.onChange
    }, [props.onChange])

    useEffect(() => {
        onSubmitRef.current = props.onSubmit
    }, [props.onSubmit])

    useEffect(() => {
        maxLengthRef.current = props.maxLength
    }, [props.maxLength])

    // Sync controlled value from props
    useEffect(() => {
        if (props.value !== undefined && props.value !== state.value) {
            setState((s) => ({ ...s, value: props.value! }))
        }
    }, [props.value, state.value])

    // Sync error state from props
    useEffect(() => {
        const hasError = Boolean(props.error)
        if (hasError !== state.hasError) {
            setState((s) => ({ ...s, hasError }))
        }
    }, [props.error, state.hasError])

    // Stable handlers with no props dependencies
    const handleFocus = useCallback(() => {
        setState((s) => ({ ...s, focused: true }))
        onFocusRef.current?.()
    }, [])

    const handleBlur = useCallback(() => {
        setState((s) => ({ ...s, focused: false }))
        onBlurRef.current?.()
    }, [])

    const handleHoverIn = useCallback(() => {
        setState((s) => ({ ...s, hovered: true }))
    }, [])

    const handleHoverOut = useCallback(() => {
        setState((s) => ({ ...s, hovered: false }))
    }, [])

    const handleChange = useCallback((value: string) => {
        // Apply maxLength constraint if specified
        const newValue = maxLengthRef.current ? value.slice(0, maxLengthRef.current) : value

        setState((s) => ({ ...s, value: newValue }))
        onChangeRef.current?.(newValue)
    }, [])

    const handleSubmit = useCallback(() => {
        onSubmitRef.current?.()
    }, [])

    return {
        state,
        handlers: {
            onFocus: handleFocus,
            onBlur: handleBlur,
            onMouseEnter: handleHoverIn,
            onMouseLeave: handleHoverOut,
            onChange: handleChange,
            onSubmit: handleSubmit,
        },
        isDisabled: props.disabled,
        isReadOnly: props.readOnly,
        variant: props.variant || "default",
        size: props.size || "md",
    }
}
