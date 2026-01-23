/**
 * Custom hook for accessing Apollo Client in React Native
 * Handles client initialization and auth state changes
 */

import { useEffect, useRef } from "react"

import { getApolloClient, resetApolloClient } from "@/lib/apollo"

/**
 * Custom hook to get Apollo Client instance
 * Automatically resets client when user authentication state changes
 *
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Apollo Client instance
 */
export function useApolloClient(
    isAuthenticated?: boolean
): ReturnType<typeof getApolloClient> {
    const clientRef = useRef<ReturnType<typeof getApolloClient> | null>(null)
    const wasAuthenticatedRef = useRef<boolean | undefined>(isAuthenticated)

    useEffect(() => {
        // Reset client when authentication state changes
        if (
            wasAuthenticatedRef.current !== undefined &&
            isAuthenticated !== undefined &&
            wasAuthenticatedRef.current !== isAuthenticated
        ) {
            resetApolloClient()
            clientRef.current = null
        }

        wasAuthenticatedRef.current = isAuthenticated
    }, [isAuthenticated])

    // Get or create client instance
    if (!clientRef.current) {
        clientRef.current = getApolloClient()
    }

    return clientRef.current
}
