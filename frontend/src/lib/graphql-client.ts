/**
 * GraphQL Client
 * Simple fetch-based client for GraphQL requests
 */

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

const GRAPHQL_ENDPOINT = getGraphQLEndpoint()

export interface GraphQLError {
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: string[]
    extensions?: Record<string, unknown>
}

export interface GraphQLResponse<T = unknown> {
    data?: T
    errors?: GraphQLError[]
}

export class GraphQLClientError extends Error {
    constructor(
        message: string,
        public errors: GraphQLError[]
    ) {
        super(message)
        this.name = "GraphQLClientError"
    }
}

/**
 * Execute a GraphQL query or mutation
 *
 * @param query - GraphQL query/mutation string
 * @param variables - Query variables
 * @param signal - AbortSignal for cancellation
 * @returns Parsed response data
 * @throws GraphQLClientError if query fails
 */
export async function graphqlFetch<TData = unknown, TVariables = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
    signal?: AbortSignal
): Promise<TData> {
    const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for Better Auth session
        body: JSON.stringify({ query, variables }),
        signal,
    })

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const json = (await response.json()) as GraphQLResponse<TData>

    if (json.errors && json.errors.length > 0) {
        throw new GraphQLClientError(
            json.errors.map((e) => e.message).join(", "),
            json.errors
        )
    }

    if (!json.data) {
        throw new Error("No data returned from GraphQL query")
    }

    return json.data
}
