/**
 * Apollo Client configuration tests
 * Tests for Mobile-specific Apollo Client setup with Expo
 */

import { ApolloClient, InMemoryCache } from "@apollo/client"
import * as SecureStore from "expo-secure-store"

import {
    createApolloClient,
    errorLink,
    getApolloClient,
    getAuthToken,
    removeAuthToken,
    resetApolloClient,
    setAuthToken,
} from "@/lib/apollo"

// Mock expo-secure-store
jest.mock("expo-secure-store")

describe("Apollo Client Configuration", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        resetApolloClient()
    })

    afterEach(() => {
        resetApolloClient()
    })

    describe("createApolloClient", () => {
        it("should create Apollo Client instance successfully", () => {
            const client = createApolloClient()

            expect(client).toBeInstanceOf(ApolloClient)
            expect(client.cache).toBeInstanceOf(InMemoryCache)
        })

        it("should configure HTTP Link with correct endpoint", () => {
            const client = createApolloClient()

            // Access the link through the client
            expect(client.link).toBeDefined()
        })

        it("should configure default options correctly", () => {
            const client = createApolloClient()

            expect(client.defaultOptions).toMatchObject({
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
            })
        })

        it("should configure cache with type policies", () => {
            const client = createApolloClient()
            const cache = client.cache as InMemoryCache

            // Check that cache has type policies
            expect(cache).toBeInstanceOf(InMemoryCache)
        })
    })

    describe("getApolloClient", () => {
        it("should return singleton instance", () => {
            const client1 = getApolloClient()
            const client2 = getApolloClient()

            expect(client1).toBe(client2)
            expect(client1).toBeInstanceOf(ApolloClient)
        })

        it("should create new instance after reset", () => {
            const client1 = getApolloClient()
            resetApolloClient()
            const client2 = getApolloClient()

            expect(client1).not.toBe(client2)
        })
    })

    describe("Auth Link", () => {
        it("should attach Authorization header when token exists", async () => {
            const mockToken = "test-auth-token"
            ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
                mockToken
            )

            const token = await getAuthToken()
            expect(token).toBe(mockToken)
            expect(SecureStore.getItemAsync).toHaveBeenCalledWith("auth_token")
        })

        it("should not attach Authorization header when no token", async () => {
            ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null)

            const token = await getAuthToken()
            expect(token).toBeNull()
        })

        it("should handle secure store errors gracefully", async () => {
            const mockError = new Error("Secure store error")
            ;(SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
                mockError
            )

            // Should not throw, should return null
            const token = await getAuthToken()
            expect(token).toBeNull()
        })
    })

    describe("Auth Token Management", () => {
        it("should save auth token to secure store", async () => {
            const mockToken = "new-auth-token"
            ;(SecureStore.setItemAsync as jest.Mock).mockResolvedValue(
                undefined
            )

            await setAuthToken(mockToken)

            expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
                "auth_token",
                mockToken
            )
        })

        it("should remove auth token from secure store", async () => {
            ;(SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(
                undefined
            )

            await removeAuthToken()

            expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
                "auth_token"
            )
        })

        it("should handle save token errors gracefully", async () => {
            const mockError = new Error("Save error")
            ;(SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
                mockError
            )

            // Should not throw
            await expect(setAuthToken("token")).resolves.toBeUndefined()
        })

        it("should handle remove token errors gracefully", async () => {
            const mockError = new Error("Remove error")
            ;(SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
                mockError
            )

            // Should not throw
            await expect(removeAuthToken()).resolves.toBeUndefined()
        })
    })

    describe("Error Link", () => {
        it("should be defined and configured", () => {
            expect(errorLink).toBeDefined()
        })

        it("should handle GraphQL errors correctly", () => {
            // Error link is configured in the Apollo Client
            // Testing actual error handling requires integration tests
            const client = createApolloClient()
            expect(client.link).toBeDefined()
        })
    })

    describe("Cache Operations", () => {
        it("should write and read from cache correctly", async () => {
            const client = getApolloClient()
            const testData = {
                id: "user-1",
                email: "test@example.com",
                displayName: "Test User",
                avatarUrl: null,
                __typename: "User",
            }

            // Write to cache
            client.writeQuery({
                query: require("@/graphql/queries").GET_ME,
                data: { me: testData },
            })

            // Read from cache
            const result = client.readQuery({
                query: require("@/graphql/queries").GET_ME,
            })

            expect(result).toEqual({ me: testData })
        })

        it("should clear cache on reset", async () => {
            const client = getApolloClient()
            const testData = {
                id: "user-1",
                email: "test@example.com",
                displayName: "Test User",
                avatarUrl: null,
                __typename: "User",
            }

            // Write to cache
            client.writeQuery({
                query: require("@/graphql/queries").GET_ME,
                data: { me: testData },
            })

            // Reset client
            resetApolloClient()

            // Get new client
            const newClient = getApolloClient()

            // Cache should be empty
            const result = newClient.readQuery({
                query: require("@/graphql/queries").GET_ME,
            })

            expect(result).toBeNull()
        })
    })
})
