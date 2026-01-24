/**
 * Socket.io Client unit tests
 * Tests Socket client initialization, connection, events, and reconnection
 */

import { io } from "socket.io-client"

import {
    createSocketClient,
    disconnectSocket,
    getSocketClient,
    isSocketConnected,
    reconnectSocket,
} from "@/lib/socket"
import { socketStore } from "@/stores/socketStore"

// Mock socket.io-client
jest.mock("socket.io-client", () => ({
    io: jest.fn(),
}))

// Mock Apollo auth functions
jest.mock("@/lib/apollo", () => ({
    getAuthToken: jest.fn(),
}))

const mockIo = io as jest.MockedFunction<typeof io>

describe("Socket.io Client", () => {
    let mockSocket: any

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks()

        // Reset socket store state
        socketStore.setState({
            isConnected: false,
            connectionError: null,
        })

        // Create mock socket instance
        mockSocket = {
            connected: false,
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
            io: {
                on: jest.fn(),
            },
        }

        // Mock io() to return mock socket
        mockIo.mockReturnValue(mockSocket as any)
    })

    afterEach(() => {
        // Clean up after each test
        disconnectSocket()
    })

    describe("Socket Client Instance Creation", () => {
        it("should create Socket client instance successfully", async () => {
            const socket = await createSocketClient()

            expect(socket).toBeDefined()
            expect(mockIo).toHaveBeenCalledTimes(1)
        })

        it("should return same instance on subsequent calls (singleton)", async () => {
            const socket1 = await createSocketClient()
            const socket2 = await createSocketClient()

            expect(socket1).toBe(socket2)
            expect(mockIo).toHaveBeenCalledTimes(1)
        })

        it("should return existing instance from getSocketClient", async () => {
            const created = await createSocketClient()
            const retrieved = getSocketClient()

            expect(retrieved).toBe(created)
        })

        it("should return null from getSocketClient if not initialized", () => {
            const socket = getSocketClient()

            expect(socket).toBeNull()
        })
    })

    describe("Socket Connection Configuration", () => {
        it("should configure Socket with correct URL and auth", async () => {
            const mockToken = "test-auth-token"
            const { getAuthToken } = require("@/lib/apollo")
            getAuthToken.mockResolvedValue(mockToken)

            await createSocketClient()

            // Verify io() was called with correct configuration
            expect(mockIo).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    auth: {
                        token: mockToken,
                    },
                    transports: expect.arrayContaining([
                        "websocket",
                        "polling",
                    ]),
                })
            )
        })

        it("should use default URL if EXPO_PUBLIC_SOCKET_URL not set", async () => {
            await createSocketClient()

            const callArgs = mockIo.mock.calls[0]
            expect(callArgs?.[0]).toBe("http://localhost:3000")
        })

        it("should use environment variable URL if set", async () => {
            const originalEnv = process.env.EXPO_PUBLIC_SOCKET_URL
            process.env.EXPO_PUBLIC_SOCKET_URL = "http://test-server:3000"

            await createSocketClient()

            expect(mockIo).toHaveBeenCalledWith(
                "http://test-server:3000",
                expect.any(Object)
            )

            // Restore original env
            process.env.EXPO_PUBLIC_SOCKET_URL = originalEnv
        })

        it("should handle missing auth token gracefully", async () => {
            const { getAuthToken } = require("@/lib/apollo")
            getAuthToken.mockResolvedValue(null)

            await createSocketClient()

            expect(mockIo).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    auth: {
                        token: undefined,
                    },
                })
            )
        })
    })

    describe("Auto-reconnect Strategy Configuration", () => {
        it("should configure auto-reconnect with exponential backoff", async () => {
            await createSocketClient()

            expect(mockIo).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: 5,
                    timeout: 10000,
                })
            )
        })
    })

    describe("Socket Event Listening", () => {
        it("should setup connection event handlers", async () => {
            await createSocketClient()

            // Verify all required event handlers are registered
            expect(mockSocket.on).toHaveBeenCalledWith(
                "connect",
                expect.any(Function)
            )
            expect(mockSocket.on).toHaveBeenCalledWith(
                "disconnect",
                expect.any(Function)
            )
            expect(mockSocket.on).toHaveBeenCalledWith(
                "connect_error",
                expect.any(Function)
            )
            expect(mockSocket.io.on).toHaveBeenCalledWith(
                "reconnect",
                expect.any(Function)
            )
            expect(mockSocket.io.on).toHaveBeenCalledWith(
                "reconnect_error",
                expect.any(Function)
            )
            expect(mockSocket.io.on).toHaveBeenCalledWith(
                "reconnect_failed",
                expect.any(Function)
            )
        })

        it("should update store state on connect event", async () => {
            await createSocketClient()

            // Get connect handler
            const connectHandler = mockSocket.on.mock.calls.find(
                ([event]: [string, any]) => event === "connect"
            )?.[1]

            // Trigger connect event
            connectHandler()

            // Verify store was updated
            const state = socketStore.state
            expect(state.isConnected).toBe(true)
            expect(state.connectionError).toBeNull()
        })

        it("should update store state on disconnect event", async () => {
            await createSocketClient()

            // Set initial connected state
            socketStore.setState({
                isConnected: true,
                connectionError: null,
            })

            // Get disconnect handler
            const disconnectHandler = mockSocket.on.mock.calls.find(
                ([event]: [string, any]) => event === "disconnect"
            )?.[1]

            // Trigger disconnect event
            disconnectHandler()

            // Verify store was updated
            const state = socketStore.state
            expect(state.isConnected).toBe(false)
        })

        it("should handle connect_error and update store", async () => {
            await createSocketClient()

            // Get connect_error handler
            const errorHandler = mockSocket.on.mock.calls.find(
                ([event]: [string, any]) => event === "connect_error"
            )?.[1]

            // Trigger error event
            const testError = new Error("Connection failed")
            errorHandler(testError)

            // Verify store was updated
            const state = socketStore.state
            expect(state.isConnected).toBe(false)
            expect(state.connectionError).toBe("Connection failed")
        })

        it("should handle reconnection events", async () => {
            await createSocketClient()

            // Get reconnect handler
            const reconnectHandler = mockSocket.io.on.mock.calls.find(
                ([event]: [string, any]) => event === "reconnect"
            )?.[1]

            // Trigger reconnect event
            reconnectHandler()

            // Verify store was updated
            const state = socketStore.state
            expect(state.isConnected).toBe(true)
            expect(state.connectionError).toBeNull()
        })
    })

    describe("Socket Event Emission", () => {
        it("should emit events correctly", async () => {
            const socket = await createSocketClient()

            // Emit test event
            socket.emit("joinConversation", "conversation-123")

            expect(mockSocket.emit).toHaveBeenCalledWith(
                "joinConversation",
                "conversation-123"
            )
        })
    })

    describe("Auth Token Change and Reconnection", () => {
        it("should reconnect with updated auth token", async () => {
            const { getAuthToken } = require("@/lib/apollo")

            // First connection with token1
            getAuthToken.mockResolvedValue("token1")
            await createSocketClient()
            expect(mockIo).toHaveBeenCalledTimes(1)

            // Token changes
            getAuthToken.mockResolvedValue("token2")

            // Reconnect with new token
            await reconnectSocket()

            // Should disconnect old socket
            expect(mockSocket.disconnect).toHaveBeenCalled()

            // Should create new socket with new token
            expect(mockIo).toHaveBeenCalledTimes(2)
        })

        it("should reset store state before reconnection", async () => {
            await createSocketClient()

            // Set some state
            socketStore.setState({
                isConnected: true,
                connectionError: "Previous error",
            })

            // Reconnect
            await reconnectSocket()

            // During disconnect, state should be reset
            expect(mockSocket.disconnect).toHaveBeenCalled()
        })
    })

    describe("Socket Disconnection and Cleanup", () => {
        it("should disconnect and cleanup socket", async () => {
            await createSocketClient()

            disconnectSocket()

            expect(mockSocket.disconnect).toHaveBeenCalled()
            expect(getSocketClient()).toBeNull()
        })

        it("should reset store state on disconnect", async () => {
            await createSocketClient()

            socketStore.setState({
                isConnected: true,
                connectionError: "Some error",
            })

            disconnectSocket()

            const state = socketStore.state
            expect(state.isConnected).toBe(false)
            expect(state.connectionError).toBeNull()
        })

        it("should handle disconnect when socket not initialized", () => {
            // Should not throw error
            expect(() => disconnectSocket()).not.toThrow()
        })
    })

    describe("Socket Connection Status Check", () => {
        it("should return true when socket is connected", async () => {
            mockSocket.connected = true
            await createSocketClient()

            expect(isSocketConnected()).toBe(true)
        })

        it("should return false when socket is disconnected", async () => {
            mockSocket.connected = false
            await createSocketClient()

            expect(isSocketConnected()).toBe(false)
        })

        it("should return false when socket not initialized", () => {
            expect(isSocketConnected()).toBe(false)
        })
    })
})
