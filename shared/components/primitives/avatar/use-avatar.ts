import { useState, useEffect, useCallback, useRef } from "react"

import type { AvatarProps, AvatarState } from "./types"

/**
 * Headless avatar hook for managing avatar state
 * Provides consistent avatar behavior across Web and Mobile
 *
 * @param props - Avatar properties
 * @returns Avatar state and handlers
 */
export function useAvatar(props: AvatarProps) {
    // Lazy initialization: only compute initial state on first mount
    const [state, setState] = useState<AvatarState>(() => ({
        imageLoaded: false,
        imageError: false,
        fallbackText: generateFallbackText(props.fallback || props.alt || ""),
    }))

    // Store callback refs to avoid recreating handlers on every render
    const onImageLoadRef = useRef(props.onImageLoad)
    const onImageErrorRef = useRef(props.onImageError)
    const fallbackRef = useRef(props.fallback)
    const altRef = useRef(props.alt)

    // Update refs when props change (rerender-dependencies)
    useEffect(() => {
        onImageLoadRef.current = props.onImageLoad
    }, [props.onImageLoad])

    useEffect(() => {
        onImageErrorRef.current = props.onImageError
    }, [props.onImageError])

    useEffect(() => {
        fallbackRef.current = props.fallback
    }, [props.fallback])

    useEffect(() => {
        altRef.current = props.alt
    }, [props.alt])

    // Sync fallbackText when fallback or alt changes (controlled component support)
    useEffect(() => {
        const newFallbackText = generateFallbackText(props.fallback || props.alt || "")
        if (newFallbackText !== state.fallbackText) {
            setState((s) => ({ ...s, fallbackText: newFallbackText }))
        }
    }, [props.fallback, props.alt, state.fallbackText])

    // Reset state when src changes (controlled component support)
    useEffect(() => {
        if (props.src) {
            setState((s) => ({
                ...s,
                imageLoaded: false,
                imageError: false,
            }))
        }
    }, [props.src])

    // Stable handlers with no props dependencies (advanced-event-handler-refs)
    const handleImageLoad = useCallback(() => {
        setState((s) => ({
            ...s,
            imageLoaded: true,
            imageError: false,
        }))
        onImageLoadRef.current?.()
    }, [])

    const handleImageError = useCallback(() => {
        setState((s) => ({
            ...s,
            imageLoaded: false,
            imageError: true,
        }))
        onImageErrorRef.current?.()
    }, [])

    const shouldShowImage = props.src && state.imageLoaded && !state.imageError
    const shouldShowFallback = !props.src || state.imageError || props.loading

    return {
        state,
        handlers: {
            onLoad: handleImageLoad,
            onError: handleImageError,
        },
        shouldShowImage,
        shouldShowFallback,
        size: props.size || "md",
        onlineStatus: props.onlineStatus,
        showOnlineStatus: props.showOnlineStatus,
    }
}

/**
 * Generate fallback text from name (initials)
 * Examples:
 * - "John Doe" -> "JD"
 * - "Alice" -> "A"
 * - "" -> "?"
 */
function generateFallbackText(name: string): string {
    if (!name || name.trim() === "") {
        return "?"
    }

    const words = name
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0)

    if (words.length === 0) {
        return "?"
    }

    if (words.length === 1) {
        const firstWord = words[0]
        return firstWord && firstWord[0] ? firstWord[0].toUpperCase() : "?"
    }

    const firstWord = words[0]
    const lastWord = words[words.length - 1]
    if (firstWord && firstWord[0] && lastWord && lastWord[0]) {
        return (firstWord[0] + lastWord[0]).toUpperCase()
    }

    return "?"
}
