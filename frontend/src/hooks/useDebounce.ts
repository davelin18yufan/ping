import { useCallback, useEffect, useRef, useState } from "react"

/**
 * useDebouncedValue Hook
 *
 * Debounces a value with configurable delay.
 * Returns the debounced value that updates only after the delay has passed.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced value
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *     const [query, setQuery] = useState("")
 *     const debouncedQuery = useDebouncedValue(query, 300)
 *
 *     return <input value={query} onChange={(e) => setQuery(e.target.value)} />
 * }
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => clearTimeout(timeoutId)
    }, [value, delay])

    return debouncedValue
}

/**
 * useDebouncedCallback Hook
 *
 * Debounces a callback function with configurable delay.
 * Returns a stable debounced function that only executes after the delay
 * has passed since the last call.
 *
 * Uses useRef for the timeout handle (not useState) to avoid triggering
 * re-renders on every debounce call — vercel/react rerender-use-ref-transient-values.
 *
 * @param callback - The callback function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Stable debounced callback (via useCallback)
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *     const debouncedSearch = useDebouncedCallback((query: string) => {
 *         fetchSearchResults(query)
 *     }, 300)
 *
 *     return (
 *         <input
 *             onChange={(e) => debouncedSearch(e.target.value)}
 *             placeholder="Search..."
 *         />
 *     )
 * }
 * ```
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
    callback: T,
    delay = 300
): T {
    // useRef: transient value — changes don't need to trigger re-renders
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const callbackRef = useRef<T>(callback)

    // Keep callbackRef current without adding it to useCallback deps
    useEffect(() => {
        callbackRef.current = callback
    }, [callback])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    // useCallback: stable reference — won't change across renders
    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }

            timeoutRef.current = setTimeout(() => {
                callbackRef.current(...args)
            }, delay)
        },
        [delay]
    ) as T
}
