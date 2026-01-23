import { socketStore } from "@/stores/socketStore"

describe("socketStore", () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        socketStore.setState(() => ({
            isConnected: false,
            connectionError: null,
        }))
    })

    describe("Initialization", () => {
        it("should create socketStore with initial state", () => {
            const state = socketStore.state

            expect(state.isConnected).toBe(false)
            expect(state.connectionError).toBeNull()
        })
    })

    describe("Connection Status", () => {
        it("should update connection status to connected", () => {
            socketStore.setState((state) => ({
                ...state,
                isConnected: true,
            }))

            expect(socketStore.state.isConnected).toBe(true)
        })

        it("should update connection status to disconnected", () => {
            // Connect first
            socketStore.setState((state) => ({
                ...state,
                isConnected: true,
            }))

            // Then disconnect
            socketStore.setState((state) => ({
                ...state,
                isConnected: false,
            }))

            expect(socketStore.state.isConnected).toBe(false)
        })
    })

    describe("Connection Error Management", () => {
        it("should set connection error message", () => {
            const errorMessage = "Failed to connect to server"

            socketStore.setState((state) => ({
                ...state,
                connectionError: errorMessage,
            }))

            expect(socketStore.state.connectionError).toBe(errorMessage)
        })

        it("should clear connection error", () => {
            // Set error first
            socketStore.setState((state) => ({
                ...state,
                connectionError: "Connection failed",
            }))

            // Clear error
            socketStore.setState((state) => ({
                ...state,
                connectionError: null,
            }))

            expect(socketStore.state.connectionError).toBeNull()
        })

        it("should handle connection error with reconnection", () => {
            // Simulate connection error
            socketStore.setState((state) => ({
                ...state,
                isConnected: false,
                connectionError: "Network timeout",
            }))

            expect(socketStore.state.isConnected).toBe(false)
            expect(socketStore.state.connectionError).toBe("Network timeout")

            // Simulate successful reconnection
            socketStore.setState((state) => ({
                ...state,
                isConnected: true,
                connectionError: null,
            }))

            expect(socketStore.state.isConnected).toBe(true)
            expect(socketStore.state.connectionError).toBeNull()
        })
    })

    describe("Complete State Updates", () => {
        it("should update both connection status and error simultaneously", () => {
            socketStore.setState(() => ({
                isConnected: false,
                connectionError: "Server unreachable",
            }))

            expect(socketStore.state.isConnected).toBe(false)
            expect(socketStore.state.connectionError).toBe("Server unreachable")
        })

        it("should reset to initial state", () => {
            // Set some state
            socketStore.setState(() => ({
                isConnected: true,
                connectionError: "Some error",
            }))

            // Reset to initial
            socketStore.setState(() => ({
                isConnected: false,
                connectionError: null,
            }))

            expect(socketStore.state.isConnected).toBe(false)
            expect(socketStore.state.connectionError).toBeNull()
        })
    })
})
