/**
 * useSocket hook unit tests
 * Tests Socket hook functionality, event handling, and typing indicators
 */

import { renderHook, waitFor } from "@testing-library/react-native"

import {
    useConversationSocket,
    useSocket,
    useTypingIndicator,
} from "@/hooks/useSocket"
import { socketStore } from "@/stores/socketStore"

// Mock socket client
jest.mock("@/lib/socket", () => ({
    createSocketClient: jest.fn(),
    getSocketClient: jest.fn(),
    disconnectSocket: jest.fn(),
}))

describe("useSocket Hook", () => {
    let mockSocket: any

    beforeEach(() => {
        // Reset socket store
        socketStore.setState({
            isConnected: false,
            connectionError: null,
        })

        // Create mock socket
        mockSocket = {
            connected: true,
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
        }

        const { createSocketClient, getSocketClient } = require("@/lib/socket")
        createSocketClient.mockResolvedValue(mockSocket)
        getSocketClient.mockReturnValue(mockSocket)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe("Basic Hook Functionality", () => {
        it("should initialize socket on mount", async () => {
            const { createSocketClient } = require("@/lib/socket")

            const { result } = renderHook(() => useSocket())

            await waitFor(() => {
                expect(createSocketClient).toHaveBeenCalled()
            })

            expect(result.current.socket).toBeDefined()
        })

        it("should not auto-connect if autoConnect is false", () => {
            const { createSocketClient } = require("@/lib/socket")

            renderHook(() => useSocket(false))

            expect(createSocketClient).not.toHaveBeenCalled()
        })

        it("should expose connection state from store", async () => {
            const { result } = renderHook(() => useSocket())

            // Initially disconnected
            expect(result.current.isConnected).toBe(false)

            // Update store state
            socketStore.setState({
                isConnected: true,
                connectionError: null,
            })

            await waitFor(() => {
                expect(result.current.isConnected).toBe(true)
            })
        })

        it("should expose connection error from store", async () => {
            const { result } = renderHook(() => useSocket())

            // Update store with error
            socketStore.setState({
                isConnected: false,
                connectionError: "Connection failed",
            })

            await waitFor(() => {
                expect(result.current.connectionError).toBe("Connection failed")
            })
        })
    })

    describe("Event Emission", () => {
        it("should emit events using type-safe emit function", async () => {
            const { result } = renderHook(() => useSocket())

            await waitFor(() => {
                expect(result.current.socket).toBeDefined()
            })

            // Emit test event
            result.current.emit("joinConversation", "conv-123")

            expect(mockSocket.emit).toHaveBeenCalledWith(
                "joinConversation",
                "conv-123"
            )
        })

        it("should handle emit when socket not connected", async () => {
            const { getSocketClient } = require("@/lib/socket")
            getSocketClient.mockReturnValue(null)

            const { result } = renderHook(() => useSocket(false))

            // Should not throw error
            expect(() => {
                result.current.emit("joinConversation", "conv-123")
            }).not.toThrow()
        })

        it("should emit message with correct payload", async () => {
            const { result } = renderHook(() => useSocket())

            await waitFor(() => {
                expect(result.current.socket).toBeDefined()
            })

            const messageData = {
                conversationId: "conv-123",
                content: "Hello world",
            }

            result.current.emit("sendMessage", messageData)

            expect(mockSocket.emit).toHaveBeenCalledWith(
                "sendMessage",
                messageData
            )
        })
    })

    describe("Event Listening", () => {
        it("should register event listener using on function", async () => {
            const { result } = renderHook(() => useSocket())

            await waitFor(() => {
                expect(result.current.socket).toBeDefined()
            })

            const handler = jest.fn()
            result.current.on("messageReceived", handler)

            expect(mockSocket.on).toHaveBeenCalledWith(
                "messageReceived",
                handler
            )
        })

        it("should remove event listener using off function", async () => {
            const { result } = renderHook(() => useSocket())

            await waitFor(() => {
                expect(result.current.socket).toBeDefined()
            })

            const handler = jest.fn()
            result.current.off("messageReceived", handler)

            expect(mockSocket.off).toHaveBeenCalledWith(
                "messageReceived",
                handler
            )
        })

        it("should handle on when socket not connected", async () => {
            const { getSocketClient } = require("@/lib/socket")
            getSocketClient.mockReturnValue(null)

            const { result } = renderHook(() => useSocket(false))

            const handler = jest.fn()

            // Should not throw error
            expect(() => {
                result.current.on("messageReceived", handler)
            }).not.toThrow()
        })

        it("should handle off when socket not connected", async () => {
            const { getSocketClient } = require("@/lib/socket")
            getSocketClient.mockReturnValue(null)

            const { result } = renderHook(() => useSocket(false))

            const handler = jest.fn()

            // Should not throw error
            expect(() => {
                result.current.off("messageReceived", handler)
            }).not.toThrow()
        })
    })
})

describe("useConversationSocket Hook", () => {
    let mockSocket: any

    beforeEach(() => {
        socketStore.setState({
            isConnected: true,
            connectionError: null,
        })

        mockSocket = {
            connected: true,
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
        }

        const { createSocketClient, getSocketClient } = require("@/lib/socket")
        createSocketClient.mockResolvedValue(mockSocket)
        getSocketClient.mockReturnValue(mockSocket)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it("should join conversation on mount", async () => {
        const conversationId = "conv-123"

        renderHook(() => useConversationSocket(conversationId))

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith(
                "joinConversation",
                conversationId
            )
        })
    })

    it("should leave conversation on unmount", async () => {
        const conversationId = "conv-123"

        const { unmount } = renderHook(() =>
            useConversationSocket(conversationId)
        )

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith(
                "joinConversation",
                conversationId
            )
        })

        unmount()

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "leaveConversation",
            conversationId
        )
    })

    it("should not join if conversationId is null", () => {
        renderHook(() => useConversationSocket(null))

        expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it("should not join if socket is not connected", async () => {
        socketStore.setState({
            isConnected: false,
            connectionError: null,
        })

        renderHook(() => useConversationSocket("conv-123"))

        // Wait a bit to ensure no emit happens
        await new Promise<void>((resolve) => setTimeout(resolve, 100))

        expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it("should rejoin when conversationId changes", async () => {
        const { rerender } = renderHook(
            ({ id }: { id: string }) => useConversationSocket(id),
            {
                initialProps: { id: "conv-1" },
            }
        )

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith(
                "joinConversation",
                "conv-1"
            )
        })

        // Change conversation
        rerender({ id: "conv-2" })

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith(
                "leaveConversation",
                "conv-1"
            )
            expect(mockSocket.emit).toHaveBeenCalledWith(
                "joinConversation",
                "conv-2"
            )
        })
    })
})

describe("useTypingIndicator Hook", () => {
    let mockSocket: any

    beforeEach(() => {
        socketStore.setState({
            isConnected: true,
            connectionError: null,
        })

        mockSocket = {
            connected: true,
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
        }

        const { createSocketClient, getSocketClient } = require("@/lib/socket")
        createSocketClient.mockResolvedValue(mockSocket)
        getSocketClient.mockReturnValue(mockSocket)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it("should emit startTyping event", async () => {
        const conversationId = "conv-123"

        const { result } = renderHook(() => useTypingIndicator(conversationId))

        await waitFor(() => {
            expect(result.current.startTyping).toBeDefined()
        })

        result.current.startTyping()

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "startTyping",
            conversationId
        )
    })

    it("should emit stopTyping event", async () => {
        const conversationId = "conv-123"

        const { result } = renderHook(() => useTypingIndicator(conversationId))

        await waitFor(() => {
            expect(result.current.stopTyping).toBeDefined()
        })

        result.current.stopTyping()

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "stopTyping",
            conversationId
        )
    })

    it("should not emit if conversationId is null", async () => {
        const { result } = renderHook(() => useTypingIndicator(null))

        await waitFor(() => {
            expect(result.current.startTyping).toBeDefined()
        })

        result.current.startTyping()
        result.current.stopTyping()

        expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it("should not emit if socket is not connected", async () => {
        socketStore.setState({
            isConnected: false,
            connectionError: null,
        })

        const { result } = renderHook(() => useTypingIndicator("conv-123"))

        await waitFor(() => {
            expect(result.current.startTyping).toBeDefined()
        })

        result.current.startTyping()
        result.current.stopTyping()

        expect(mockSocket.emit).not.toHaveBeenCalled()
    })
})
