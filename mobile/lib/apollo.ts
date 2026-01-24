/**
 * Apollo Client configuration for React Native + Expo
 * Adapted from Web frontend with Expo-specific authentication
 */

import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client"
import { CombinedGraphQLErrors } from "@apollo/client/errors"
import { SetContextLink } from "@apollo/client/link/context"
import { ErrorLink } from "@apollo/client/link/error"
import * as SecureStore from "expo-secure-store"

/**
 * Storage key for auth token in Expo Secure Store
 */
const AUTH_TOKEN_KEY = "auth_token"

/**
 * Get GraphQL endpoint from environment variable
 * Default to http://localhost:3000/graphql for development
 */
const getGraphQLEndpoint = (): string => {
    return (
        process.env.EXPO_PUBLIC_GRAPHQL_URL ||
        (process.env.EXPO_PUBLIC_API_URL
            ? `${process.env.EXPO_PUBLIC_API_URL}/graphql`
            : undefined) ||
        "http://localhost:3000/graphql"
    )
}

/**
 * Get auth token from Expo Secure Store
 * Returns null if no token is found
 */
export async function getAuthToken(): Promise<string | null> {
    try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY)
        return token
    } catch (error) {
        console.error("Failed to get auth token from secure store:", error)
        return null
    }
}

/**
 * Save auth token to Expo Secure Store
 */
export async function setAuthToken(token: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token)
    } catch (error) {
        console.error("Failed to save auth token to secure store:", error)
    }
}

/**
 * Remove auth token from Expo Secure Store
 */
export async function removeAuthToken(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY)
    } catch (error) {
        console.error("Failed to remove auth token from secure store:", error)
    }
}

/**
 * Auth link that adds Authorization header to requests
 * Uses Expo Secure Store to retrieve token
 */
export const authLink = new SetContextLink(async (_operation, prevContext) => {
    const token = await getAuthToken()
    const existingHeaders =
        (prevContext &&
        typeof prevContext === "object" &&
        "headers" in prevContext
            ? prevContext.headers
            : {}) || {}

    return {
        headers: {
            ...existingHeaders,
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
    }
})

/**
 * Error handling link for Apollo Client
 * Handles GraphQL errors and network errors
 */
export const errorLink = new ErrorLink(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
        error.errors.forEach(({ message, locations, path, extensions }) => {
            console.error(
                `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
            )

            // Handle specific error codes
            if (extensions?.code === "UNAUTHENTICATED") {
                // Clear session when authentication fails
                removeAuthToken().catch((err) => {
                    console.error("Failed to clear auth token:", err)
                })

                // In Mobile, navigation to login should be handled by the app
                console.warn(
                    "User not authenticated, app should navigate to login"
                )
            }

            if (extensions?.code === "FORBIDDEN") {
                console.error("User does not have permission for this action")
            }
        })
    } else {
        console.error(`[Network error]:`, error)
    }
})

/**
 * HTTP Link configuration for GraphQL requests
 * For React Native, credentials are handled via Authorization header
 */
const httpLink = new HttpLink({
    uri: getGraphQLEndpoint(),
    headers: {
        "Content-Type": "application/json",
    },
})

/**
 * Create Apollo Client instance with configured links and cache
 *
 * @returns ApolloClient instance
 */
export function createApolloClient() {
    return new ApolloClient({
        link: from([errorLink, authLink, httpLink]),
        cache: new InMemoryCache({
            typePolicies: {
                Query: {
                    fields: {
                        // Configure cache policies for specific fields
                        // Example: messages field with cursor-based pagination
                        messages: {
                            keyArgs: ["conversationId"],
                            merge(existing = { edges: [] }, incoming) {
                                return {
                                    ...incoming,
                                    edges: [
                                        ...existing.edges,
                                        ...incoming.edges,
                                    ],
                                }
                            },
                        },
                    },
                },
            },
        }),
        defaultOptions: {
            watchQuery: {
                fetchPolicy: "cache-and-network",
                errorPolicy: "all",
            },
            query: {
                fetchPolicy: "network-only",
                errorPolicy: "all",
            },
            mutate: {
                errorPolicy: "all",
            },
        },
    })
}

/**
 * Singleton Apollo Client instance
 * Only created once and reused across the application
 */
let apolloClient: ReturnType<typeof createApolloClient> | null = null

/**
 * Get or create Apollo Client singleton
 * Use this function in your application to get the client instance
 *
 * @returns ApolloClient singleton instance
 */
export function getApolloClient(): ReturnType<typeof createApolloClient> {
    if (!apolloClient) {
        apolloClient = createApolloClient()
    }
    return apolloClient
}

/**
 * Reset Apollo Client singleton
 * Useful for testing or when user logs out
 */
export function resetApolloClient(): void {
    if (apolloClient) {
        apolloClient.clearStore().catch((error: Error) => {
            console.error("Failed to clear Apollo Client cache:", error)
        })
        apolloClient = null
    }
}
