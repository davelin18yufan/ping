/**
 * useViewTransition Hook
 *
 * Advanced View Transition API wrapper with:
 * - Circular ripple effect from click position
 * - Named transitions for different contexts
 * - Fallback for unsupported browsers
 * - Type-safe implementation
 *
 * Usage:
 * ```tsx
 * const transition = useViewTransition()
 *
 * // Theme toggle with ripple from button position
 * const handleThemeToggle = (event: MouseEvent) => {
 *   transition.withRipple(event, 'theme-toggle', () => {
 *     setTheme(theme === 'dark' ? 'light' : 'dark')
 *   })
 * }
 *
 * // Aesthetic mode toggle (simple fade)
 * const handleModeToggle = () => {
 *   transition.start('aesthetic-toggle', () => {
 *     setMode(mode === 'ornate' ? 'minimal' : 'ornate')
 *   })
 * }
 * ```
 */

import { useCallback } from "react"

import { uiStore } from "@/stores/uiStore"

// ============================================================================
// TYPES
// ============================================================================

interface ViewTransition {
    finished: Promise<void>
    ready: Promise<void>
    updateCallbackDone: Promise<void>
    skipTransition(): void
}

type TransitionName = "theme-toggle" | "aesthetic-toggle" | "acoustic-field" | "root"

type UpdateCallback = () => void | Promise<void>

// ============================================================================
// HOOK
// ============================================================================

export function useViewTransition() {
    /**
     * Check if View Transition API is supported
     */
    const isSupported = useCallback(() => {
        return typeof window !== "undefined" && "startViewTransition" in document
    }, [])

    /**
     * Start a basic view transition
     *
     * @param _name - Transition name (unused, kept for API compatibility)
     * @param callback - Function that updates the DOM
     */
    const start = useCallback(
        (_name: TransitionName | null, callback: UpdateCallback): void => {
            if (!isSupported()) {
                // Fallback: execute callback directly
                void Promise.resolve(callback())
                return
            }

            // Start View Transition (CSS handles all animations globally)
            uiStore.setState((s) => ({ ...s, isViewTransitioning: true }))
            const transition = (
                document as Document & {
                    startViewTransition: (callback: UpdateCallback) => ViewTransition
                }
            ).startViewTransition(callback)

            void transition.finished.finally(() => {
                uiStore.setState((s) => ({ ...s, isViewTransitioning: false }))
            })
        },
        [isSupported]
    )

    /**
     * Start a view transition with circular ripple effect from click position
     *
     * @param event - Mouse/Touch event to get click position
     * @param _name - Transition name (unused, kept for API compatibility)
     * @param callback - Function that updates the DOM
     */
    const withRipple = useCallback(
        (
            event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
            _name: TransitionName,
            callback: UpdateCallback
        ): void => {
            if (!isSupported()) {
                void Promise.resolve(callback())
                return
            }

            // Get click position
            const x =
                "clientX" in event
                    ? event.clientX
                    : (event.touches?.[0]?.clientX ?? window.innerWidth / 2)
            const y =
                "clientY" in event
                    ? event.clientY
                    : (event.touches?.[0]?.clientY ?? window.innerHeight / 2)

            // Calculate position as percentage
            const rippleX = (x / window.innerWidth) * 100
            const rippleY = (y / window.innerHeight) * 100

            // Set CSS custom properties for ripple position
            document.documentElement.style.setProperty("--ripple-x", `${rippleX}%`)
            document.documentElement.style.setProperty("--ripple-y", `${rippleY}%`)

            // Start View Transition
            uiStore.setState((s) => ({ ...s, isViewTransitioning: true }))
            const transition = (
                document as Document & {
                    startViewTransition: (callback: UpdateCallback) => ViewTransition
                }
            ).startViewTransition(callback)

            // Clean up after completion
            void transition.finished.finally(() => {
                document.documentElement.style.removeProperty("--ripple-x")
                document.documentElement.style.removeProperty("--ripple-y")
                uiStore.setState((s) => ({ ...s, isViewTransitioning: false }))
            })
        },
        [isSupported]
    )

    return {
        /** Check if View Transition API is supported */
        isSupported: isSupported(),
        /** Start a basic view transition */
        start,
        /** Start a view transition with circular ripple effect */
        withRipple,
    }
}
