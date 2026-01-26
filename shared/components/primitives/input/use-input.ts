import { useState, useCallback } from "react"

import type { InputProps, InputState } from "./types"

/**
 * Headless input hook for managing input state
 * Provides consistent input behavior across Web and Mobile
 *
 * @param props - Input properties
 * @returns Input state and handlers
 */
export function useInput(props: InputProps) {
    const [state, setState] = useState<InputState>({
        focused: false,
        hovered: false,
        value: props.defaultValue || props.value || "",
        hasError: Boolean(props.error),
    })

    const handleFocus = useCallback(() => {
        setState((s) => ({ ...s, focused: true }))
        props.onFocus?.()
    }, [props])

    const handleBlur = useCallback(() => {
        setState((s) => ({ ...s, focused: false }))
        props.onBlur?.()
    }, [props])

    const handleHoverIn = useCallback(() => {
        setState((s) => ({ ...s, hovered: true }))
    }, [])

    const handleHoverOut = useCallback(() => {
        setState((s) => ({ ...s, hovered: false }))
    }, [])

    const handleChange = useCallback(
        (value: string) => {
            // Apply maxLength constraint if specified
            const newValue = props.maxLength ? value.slice(0, props.maxLength) : value

            setState((s) => ({ ...s, value: newValue }))
            props.onChange?.(newValue)
        },
        [props]
    )

    const handleSubmit = useCallback(() => {
        props.onSubmit?.()
    }, [props])

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
