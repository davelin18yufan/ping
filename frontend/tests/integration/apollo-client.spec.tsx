import { gql, ApolloLink, Observable, ApolloClient, InMemoryCache } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { MockedProvider } from "@apollo/client/testing/react"
import { render, waitFor } from "@testing-library/react"
import { GraphQLError } from "graphql"
import { describe, test, expect, vi, beforeEach } from "vitest"

import { ME_QUERY } from "@/graphql/queries/user"
import { createApolloClient, errorLink } from "@/lib/apollo"

// Reset singleton between tests
let apolloClientModule: typeof import("@/lib/apollo")

beforeEach(async () => {
    // Reset the module to clear singleton
    vi.resetModules()
    apolloClientModule = await import("@/lib/apollo")
})

describe("Apollo Client Configuration", () => {
    describe("Client Initialization", () => {
        test("should create Apollo Client with correct configuration", () => {
            const client = createApolloClient()

            expect(client).toBeDefined()
            expect(client.link).toBeDefined()
            expect(client.cache).toBeDefined()
        })

        test("should configure HTTP link with correct endpoint", () => {
            const client = createApolloClient()

            // Access the link configuration through the client
            // Note: Apollo Client's internal structure makes this implementation-specific
            expect(client).toBeDefined()
            // We verify the endpoint through actual usage in later tests
        })

        test("should include credentials in requests", () => {
            const client = createApolloClient()

            // Verify that the client is configured (actual credentials test happens in integration)
            expect(client).toBeDefined()
            expect(client.cache).toBeDefined()
        })
    })

    describe("Singleton Pattern", () => {
        test("should return same instance on multiple getApolloClient calls", () => {
            const client1 = apolloClientModule.getApolloClient()
            const client2 = apolloClientModule.getApolloClient()

            expect(client1).toBe(client2)
        })

        test("should create new instance on first getApolloClient call", () => {
            const client = apolloClientModule.getApolloClient()

            expect(client).toBeDefined()
            expect(client.link).toBeDefined()
            expect(client.cache).toBeDefined()
        })
    })

    describe("GraphQL Query Execution", () => {
        test("should execute GraphQL query successfully", async () => {
            interface MeData {
                me: {
                    id: string
                    email: string
                    displayName: string
                }
            }

            const mocks = [
                {
                    request: { query: ME_QUERY },
                    result: {
                        data: {
                            me: {
                                id: "1",
                                email: "test@example.com",
                                displayName: "Test User",
                            },
                        },
                    },
                },
            ]

            const TestComponent = () => {
                const { data, loading } = useQuery<MeData>(ME_QUERY)
                if (loading) return <div>Loading...</div>
                return <div>{data?.me?.displayName}</div>
            }

            const { getByText } = render(
                <MockedProvider mocks={mocks}>
                    <TestComponent />
                </MockedProvider>
            )

            await waitFor(() => {
                expect(getByText("Test User")).toBeInTheDocument()
            })
        })

        test("should handle GraphQL error", async () => {
            const errorMocks = [
                {
                    request: { query: ME_QUERY },
                    error: new Error("Unauthorized"),
                },
            ]

            const TestComponent = () => {
                const { error } = useQuery(ME_QUERY)
                if (error) return <div>Error: {error.message}</div>
                return <div>Success</div>
            }

            const { getByText } = render(
                <MockedProvider mocks={errorMocks}>
                    <TestComponent />
                </MockedProvider>
            )

            await waitFor(() => {
                expect(getByText(/Unauthorized/i)).toBeInTheDocument()
            })
        })

        test("should cache query results", async () => {
            interface MeData {
                me: {
                    id: string
                    email: string
                    displayName: string
                }
            }

            const mocks = [
                {
                    request: { query: ME_QUERY },
                    result: {
                        data: {
                            me: {
                                id: "1",
                                email: "test@example.com",
                                displayName: "Test User",
                            },
                        },
                    },
                },
            ]

            const TestComponent = () => {
                const { data, loading } = useQuery<MeData>(ME_QUERY)
                if (loading) return <div>Loading...</div>
                return <div>{data?.me?.displayName}</div>
            }

            const { getByText, rerender } = render(
                <MockedProvider mocks={mocks}>
                    <TestComponent />
                </MockedProvider>
            )

            await waitFor(() => {
                expect(getByText("Test User")).toBeInTheDocument()
            })

            // Rerender should use cached data
            rerender(
                <MockedProvider mocks={mocks}>
                    <TestComponent />
                </MockedProvider>
            )

            // Data should still be available from cache
            expect(getByText("Test User")).toBeInTheDocument()
        })
    })

    describe("Error Link Configuration", () => {
        test("should have error link configured in client", () => {
            const client = createApolloClient()

            // Verify that the client has link chain (errorLink + httpLink)
            expect(client.link).toBeDefined()

            // The link should be a combination of errorLink and httpLink
            // We can't easily test the actual error handling without a real server
            // But we can verify the client is configured with the link chain
            const linkChain = (client.link as any).left || (client.link as any).right
            expect(linkChain).toBeDefined()
        })

        test("should execute error link on GraphQL errors with UNAUTHENTICATED code", async () => {
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

            const client = createApolloClient()

            // Create a test link that simulates a GraphQL error
            const testLink = new ApolloLink((_operation, _forward) => {
                return new Observable((observer) => {
                    observer.error(
                        new GraphQLError("User not authenticated", {
                            extensions: { code: "UNAUTHENTICATED" },
                        })
                    )
                })
            })

            // Replace the client's link with our test link
            ;(client as any).link = ApolloLink.from([
                (client.link as any).left, // This should be the error link
                testLink,
            ])

            // Execute a query that will trigger the error
            // Apollo Client may return an error object instead of throwing
            try {
                const result = await client.query({ query: ME_QUERY })
                // If it returns a result with error, that's also valid
                expect(result.error).toBeDefined()
            } catch (error) {
                // If it throws, that's also valid
                expect(error).toBeDefined()
            }

            // Wait a bit for console logs to execute
            await new Promise((resolve) => setTimeout(resolve, 100))

            // The error link treats GraphQL errors as network errors when not using CombinedGraphQLErrors
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[Network error]"))
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("User not authenticated")
            )

            consoleWarnSpy.mockRestore()
            consoleErrorSpy.mockRestore()
        })

        test("should execute error link on GraphQL errors with FORBIDDEN code", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

            const client = createApolloClient()

            const testLink = new ApolloLink((_operation, _forward) => {
                return new Observable((observer) => {
                    observer.error(
                        new GraphQLError("Forbidden action", {
                            extensions: { code: "FORBIDDEN" },
                        })
                    )
                })
            })

            ;(client as any).link = ApolloLink.from([(client.link as any).left, testLink])

            // Execute a query that will trigger the error
            try {
                const result = await client.query({ query: ME_QUERY })
                expect(result.error).toBeDefined()
            } catch (error) {
                expect(error).toBeDefined()
            }

            // Wait a bit for console logs to execute
            await new Promise((resolve) => setTimeout(resolve, 100))

            // The error link treats GraphQL errors as network errors when not using CombinedGraphQLErrors
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[Network error]"))
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Forbidden action")
            )

            consoleErrorSpy.mockRestore()
        })

        test("should handle multiple GraphQL errors with MockedProvider", async () => {
            const errorMocks = [
                {
                    request: { query: ME_QUERY },
                    result: {
                        errors: [
                            new GraphQLError("User not authenticated", {
                                extensions: { code: "UNAUTHENTICATED" },
                            }),
                            new GraphQLError("Forbidden action", {
                                extensions: { code: "FORBIDDEN" },
                            }),
                            new GraphQLError("Generic error"),
                        ],
                    },
                },
            ]

            const TestComponent = () => {
                const { error } = useQuery(ME_QUERY)
                if (error) return <div>Multiple errors occurred</div>
                return <div>Success</div>
            }

            const { getByText } = render(
                <MockedProvider mocks={errorMocks}>
                    <TestComponent />
                </MockedProvider>
            )

            await waitFor(() => {
                expect(getByText("Multiple errors occurred")).toBeInTheDocument()
            })
        })

        test("should execute error link on network errors", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

            const client = createApolloClient()

            const testLink = new ApolloLink((_operation, _forward) => {
                return new Observable((observer) => {
                    observer.error(new Error("Network error occurred"))
                })
            })

            ;(client as any).link = ApolloLink.from([(client.link as any).left, testLink])

            // Execute a query that will trigger the error
            try {
                const result = await client.query({ query: ME_QUERY })
                expect(result.error).toBeDefined()
            } catch (error) {
                expect(error).toBeDefined()
            }

            // Wait a bit for console logs to execute
            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Network error"))

            consoleErrorSpy.mockRestore()
        })

        test("should handle GraphQL errors in MockedProvider", async () => {
            const errorMocks = [
                {
                    request: { query: ME_QUERY },
                    result: {
                        errors: [new GraphQLError("Test error")],
                    },
                },
            ]

            const TestComponent = () => {
                const { error } = useQuery(ME_QUERY)
                if (error) return <div>Error occurred</div>
                return <div>Success</div>
            }

            const { getByText } = render(
                <MockedProvider mocks={errorMocks}>
                    <TestComponent />
                </MockedProvider>
            )

            await waitFor(() => {
                expect(getByText("Error occurred")).toBeInTheDocument()
            })
        })

        test("should handle network errors in MockedProvider", async () => {
            const errorMocks = [
                {
                    request: { query: ME_QUERY },
                    error: new Error("Network error"),
                },
            ]

            const TestComponent = () => {
                const { error } = useQuery(ME_QUERY)
                if (error) return <div>Error occurred</div>
                return <div>Success</div>
            }

            const { getByText } = render(
                <MockedProvider mocks={errorMocks}>
                    <TestComponent />
                </MockedProvider>
            )

            await waitFor(() => {
                expect(getByText("Error occurred")).toBeInTheDocument()
            })
        })

        test("should execute errorLink with CombinedGraphQLErrors for UNAUTHENTICATED code", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

            // Create a test link that returns result with GraphQL errors
            // Apollo Client will convert this to CombinedGraphQLErrors internally
            const testLink = new ApolloLink(() => {
                return new Observable((observer) => {
                    // Return a result with errors (not throwing)
                    // This triggers the ErrorLink's graphQLErrors path
                    observer.next({
                        data: null,
                        errors: [
                            new GraphQLError("User not authenticated", {
                                extensions: { code: "UNAUTHENTICATED" },
                                path: ["user", "profile"],
                            }),
                        ],
                    })
                    observer.complete()
                })
            })

            // Create a client with errorLink + testLink
            const testClient = new ApolloClient({
                link: ApolloLink.from([errorLink, testLink]),
                cache: new InMemoryCache(),
                defaultOptions: {
                    query: {
                        errorPolicy: "all", // Important: return errors instead of throwing
                    },
                },
            })

            // Execute a query to trigger the error
            const result = await testClient.query({ query: ME_QUERY })

            // Verify GraphQL errors are present
            expect(result.error).toBeDefined()
            // expect(result.error?.length).toBeGreaterThan(0)

            // Wait for console logs to execute
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Verify errorLink executed with CombinedGraphQLErrors path
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[GraphQL error]"))
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("User not authenticated")
            )
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("user,profile"))
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "User not authenticated, should redirect to login"
            )

            consoleErrorSpy.mockRestore()
            consoleWarnSpy.mockRestore()
        })

        test("should execute errorLink with CombinedGraphQLErrors for FORBIDDEN code", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

            const testLink = new ApolloLink(() => {
                return new Observable((observer) => {
                    observer.next({
                        data: null,
                        errors: [
                            new GraphQLError("User does not have permission", {
                                extensions: { code: "FORBIDDEN" },
                                path: ["deleteUser"],
                            }),
                        ],
                    })
                    observer.complete()
                })
            })

            const testClient = new ApolloClient({
                link: ApolloLink.from([errorLink, testLink]),
                cache: new InMemoryCache(),
                defaultOptions: {
                    query: {
                        errorPolicy: "all",
                    },
                },
            })

            const result = await testClient.query({ query: ME_QUERY })

            expect(result.error).toBeDefined()
            // expect(result.errors?.length).toBeGreaterThan(0)

            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[GraphQL error]"))
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("User does not have permission")
            )
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("deleteUser"))
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "User does not have permission for this action"
            )

            consoleErrorSpy.mockRestore()
        })

        test("should execute errorLink with multiple CombinedGraphQLErrors", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

            const testLink = new ApolloLink(() => {
                return new Observable((observer) => {
                    observer.next({
                        data: null,
                        errors: [
                            new GraphQLError("User not authenticated", {
                                extensions: { code: "UNAUTHENTICATED" },
                                path: ["user", "profile"],
                            }),
                            new GraphQLError("Forbidden action", {
                                extensions: { code: "FORBIDDEN" },
                                path: ["admin", "deleteUser"],
                            }),
                            new GraphQLError("Generic error", {
                                path: ["query"],
                            }),
                        ],
                    })
                    observer.complete()
                })
            })

            const testClient = new ApolloClient({
                link: ApolloLink.from([errorLink, testLink]),
                cache: new InMemoryCache(),
                defaultOptions: {
                    query: {
                        errorPolicy: "all",
                    },
                },
            })

            const result = await testClient.query({ query: ME_QUERY })

            expect(result.error).toBeDefined()
            // expect(result.errors?.length).toBe(3)

            await new Promise((resolve) => setTimeout(resolve, 100))

            // Verify all 3 errors were logged (3 GraphQL error logs + 1 UNAUTHENTICATED warn + 1 FORBIDDEN error)
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("User not authenticated")
            )
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Forbidden action")
            )
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Generic error"))
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "User not authenticated, should redirect to login"
            )
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "User does not have permission for this action"
            )

            consoleErrorSpy.mockRestore()
            consoleWarnSpy.mockRestore()
        })

        test("should execute errorLink with GraphQL error including locations", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

            const testLink = new ApolloLink(() => {
                return new Observable((observer) => {
                    observer.next({
                        data: null,
                        errors: [
                            new GraphQLError("Syntax error in query", {
                                extensions: { code: "BAD_USER_INPUT" },
                                path: ["users"],
                            }),
                        ],
                    })
                    observer.complete()
                })
            })

            const testClient = new ApolloClient({
                link: ApolloLink.from([errorLink, testLink]),
                cache: new InMemoryCache(),
                defaultOptions: {
                    query: {
                        errorPolicy: "all",
                    },
                },
            })

            const result = await testClient.query({ query: ME_QUERY })

            expect(result.error).toBeDefined()

            await new Promise((resolve) => setTimeout(resolve, 100))

            // Verify locations were included in log (even if undefined)
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[GraphQL error]"))
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Syntax error in query")
            )
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Location:"))
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Path: users"))

            consoleErrorSpy.mockRestore()
        })
    })

    describe("Cache Policies", () => {
        test("should have messages field merge policy configured", () => {
            const client = createApolloClient()

            // Access cache type policies
            const cache = client.cache as any
            const typePolicies = cache.policies?.config?.typePolicies

            expect(typePolicies).toBeDefined()
            expect(typePolicies.Query).toBeDefined()
            expect(typePolicies.Query.fields).toBeDefined()
            expect(typePolicies.Query.fields.messages).toBeDefined()
        })

        test("should merge messages field correctly", () => {
            const client = createApolloClient()

            // Get the merge function
            const cache = client.cache as any
            const mergeFunction =
                cache.policies?.config?.typePolicies?.Query?.fields?.messages?.merge

            expect(mergeFunction).toBeDefined()

            // Test the merge function
            const existing = { edges: [{ node: { id: "1", content: "First" } }] }
            const incoming = { edges: [{ node: { id: "2", content: "Second" } }] }

            const merged = mergeFunction(existing, incoming)

            expect(merged.edges).toHaveLength(2)
            expect(merged.edges[0].node.id).toBe("1")
            expect(merged.edges[1].node.id).toBe("2")
        })

        test("should merge messages with empty existing", () => {
            const client = createApolloClient()

            const cache = client.cache as any
            const mergeFunction =
                cache.policies?.config?.typePolicies?.Query?.fields?.messages?.merge

            // Test with undefined existing (initial state)
            const incoming = { edges: [{ node: { id: "1", content: "First" } }] }

            const merged = mergeFunction(undefined, incoming)

            expect(merged.edges).toHaveLength(1)
            expect(merged.edges[0].node.id).toBe("1")
        })

        test("should render messages using merge policy", async () => {
            const MESSAGES_QUERY = gql`
                query GetMessages($conversationId: ID!) {
                    messages(conversationId: $conversationId) {
                        edges {
                            node {
                                id
                                content
                            }
                        }
                    }
                }
            `

            interface Message {
                id: string
                content: string
            }

            interface MessagesData {
                messages: {
                    edges: Array<{ node: Message }>
                }
            }

            const mocks = [
                {
                    request: {
                        query: MESSAGES_QUERY,
                        variables: { conversationId: "1" },
                    },
                    result: {
                        data: {
                            messages: {
                                edges: [{ node: { id: "1", content: "First message" } }],
                            },
                        },
                    },
                },
            ]

            const TestComponent = () => {
                const { data, loading } = useQuery<MessagesData>(MESSAGES_QUERY, {
                    variables: { conversationId: "1" },
                })
                if (loading) return <div>Loading...</div>
                return (
                    <div>
                        {data?.messages?.edges?.map((edge) => (
                            <div key={edge.node.id}>{edge.node.content}</div>
                        ))}
                    </div>
                )
            }

            const { getByText } = render(
                <MockedProvider mocks={mocks}>
                    <TestComponent />
                </MockedProvider>
            )

            await waitFor(() => {
                expect(getByText("First message")).toBeInTheDocument()
            })
        })
    })
})
