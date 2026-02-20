/**
 * TanStack Query Client Configuration
 *
 * Centralized QueryClient with global error handling.
 * Equivalent to Apollo Client's ErrorLink pattern.
 */

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query"

import { signOut } from "@/lib/auth-client"
import { GraphQLClientError } from "@/lib/graphql-client"

/**
 * Global error handler for GraphQL errors
 *
 * Equivalent to Apollo Client's ErrorLink.
 * Handles common error codes (UNAUTHENTICATED, FORBIDDEN, etc.)
 * across all queries and mutations.
 *
 * @param error - Error thrown by query or mutation
 */
function handleGraphQLError(error: unknown) {
    // Handle GraphQLClientError (from graphql-client.ts)
    if (error instanceof GraphQLClientError) {
        error.errors.forEach(({ message, extensions }) => {
            console.error(`[GraphQL error]: ${message}`)

            // Handle UNAUTHENTICATED error code
            if (extensions?.code === "UNAUTHENTICATED") {
                console.warn("User not authenticated, redirecting to login")

                // Sign out and redirect to auth page
                if (typeof window !== "undefined") {
                    signOut()
                        .then(() => {
                            window.location.href = "/auth"
                        })
                        .catch((signOutError) => {
                            console.error("Sign out failed:", signOutError)
                            // Force redirect even if sign out fails
                            window.location.href = "/auth"
                        })
                }
            }

            // Handle FORBIDDEN error code
            if (extensions?.code === "FORBIDDEN") {
                console.error("User does not have permission for this action")
                // Optional: Show toast notification
                // toast.error("You don't have permission to perform this action")
            }

            // Handle other error codes
            if (extensions?.code === "BAD_USER_INPUT") {
                console.error("Invalid input:", message)
            }

            if (extensions?.code === "INTERNAL_SERVER_ERROR") {
                console.error("Server error:", message)
                // Optional: Show generic error toast
            }
        })
    } else if (error instanceof Error) {
        // Network error or other non-GraphQL errors
        console.error("[Network error]:", error.message)
    } else {
        console.error("[Unknown error]:", error)
    }
}

/**
 * Create QueryClient with global error handling
 *
 * @returns QueryClient instance with configured caches and defaults
 */
export function createQueryClient() {
    return new QueryClient({
        queryCache: new QueryCache({
            // Catch all query errors globally
            onError: (error) => {
                handleGraphQLError(error)
            },
        }),
        mutationCache: new MutationCache({
            // Catch all mutation errors globally
            onError: (error) => {
                handleGraphQLError(error)
            },
        }),
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                gcTime: 1000 * 60 * 60, // 1 hour
                refetchOnWindowFocus: false,
                retry: (failureCount, error) => {
                    // Don't retry on authentication errors
                    if (error instanceof GraphQLClientError) {
                        const hasAuthError = error.errors.some(
                            (e) =>
                                e.extensions?.code === "UNAUTHENTICATED" ||
                                e.extensions?.code === "FORBIDDEN"
                        )
                        if (hasAuthError) return false
                    }

                    // Retry up to 3 times for other errors
                    return failureCount < 3
                },
            },
            mutations: {
                retry: false, // Don't retry mutations by default
            },
        },
    })
}

/**
 * Singleton QueryClient instance
 * Only created once and reused across the application
 */
let queryClient: QueryClient | null = null

/**
 * Get or create QueryClient singleton
 *
 * @returns QueryClient singleton instance
 */
export function getQueryClient(): QueryClient {
    if (!queryClient) {
        queryClient = createQueryClient()
    }
    return queryClient
}
