import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"
import { CombinedGraphQLErrors } from "@apollo/client/errors"
import { ErrorLink } from "@apollo/client/link/error"

/**
 * Get GraphQL endpoint from environment variable
 * Default to http://localhost:3000/graphql for development
 */
const getGraphQLEndpoint = (): string => {
    return (
        import.meta.env.VITE_GRAPHQL_ENDPOINT ||
        (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/graphql` : undefined) ||
        "http://localhost:3000/graphql"
    )
}

/**
 * Error handling link for Apollo Client
 * Handles GraphQL errors and network errors
 */
const errorLink = new ErrorLink(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
        error.errors.forEach(({ message, locations, path, extensions }) => {
            console.error(
                `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
            )

            // Handle specific error codes
            if (extensions?.code === "UNAUTHENTICATED") {
                // Clear session and redirect to login
                // This will be implemented with Better Auth integration
                if (typeof window !== "undefined") {
                    console.warn("User not authenticated, should redirect to login")
                }
            }

            if (extensions?.code === "FORBIDDEN") {
                console.error("User does not have permission for this action")
            }
        })
    } else {
        console.error(`[Network error]: ${error}`)
    }
})

/**
 * HTTP Link configuration for GraphQL requests
 * Includes credentials (cookies) for Better Auth session
 */
const httpLink = new HttpLink({
    uri: getGraphQLEndpoint(),
    credentials: "include", // Important: Include cookies for Better Auth session
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
        link: errorLink.concat(httpLink),
        cache: new InMemoryCache({
            typePolicies: {
                Query: {
                    fields: {
                        // Configure cache policies for specific fields if needed
                        // Example: messages field with cursor-based pagination
                        messages: {
                            keyArgs: ["conversationId"],
                            merge(existing = { edges: [] }, incoming) {
                                return {
                                    ...incoming,
                                    edges: [...existing.edges, ...incoming.edges],
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let apolloClient: ApolloClient | null = null

/**
 * Get or create Apollo Client singleton
 * Use this function in your application to get the client instance
 *
 * @returns ApolloClient singleton instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getApolloClient(): ApolloClient {
    if (!apolloClient) {
        apolloClient = createApolloClient()
    }
    return apolloClient
}
