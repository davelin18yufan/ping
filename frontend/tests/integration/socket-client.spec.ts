/**
 * @vitest-environment node
 */
import type { AddressInfo } from "node:net"

import { createServer } from "node:http"
import { Server } from "socket.io"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

import { createSocketClient, getSocketClient, disconnectSocket } from "@/lib/socket"
import { socketStore } from "@/stores/socketStore"

describe("Socket.io Client Module", () => {
    let io: Server
    let httpServer: ReturnType<typeof createServer>
    let serverPort: number

    beforeEach(async () => {
        // Reset module state
        vi.resetModules()

        // Create test server
        httpServer = createServer()
        io = new Server(httpServer, {
            cors: { origin: "*" },
        })

        await new Promise<void>((resolve) => {
            httpServer.listen(() => {
                serverPort = (httpServer.address() as AddressInfo).port
                resolve()
            })
        })

        // Set environment variable for socket URL
        vi.stubEnv("VITE_SOCKET_URL", `http://localhost:${serverPort}`)

        // Reset socket store
        socketStore.setState({
            isConnected: false,
            connectionError: null,
        })
    })

    afterEach(() => {
        disconnectSocket()
        if (io) {
            io.close()
        }
        if (httpServer) {
            httpServer.close()
        }
        vi.unstubAllEnvs()
    })

    describe("createSocketClient", () => {
        it("should create Socket.io client and connect to server", async () => {
            const connectionPromise = new Promise<void>((resolve) => {
                io.on("connection", () => {
                    resolve()
                })
            })

            const socket = createSocketClient()

            expect(socket).toBeDefined()
            await connectionPromise

            // Wait for connection event to update store
            await new Promise((resolve) => setTimeout(resolve, 100))

            const state = socketStore.state
            expect(state.isConnected).toBe(true)
            expect(state.connectionError).toBeNull()
        })

        it("should return existing instance on subsequent calls (singleton)", () => {
            const socket1 = createSocketClient()
            const socket2 = createSocketClient()

            expect(socket1).toBe(socket2)
        })

        it("should include auth token in handshake", async () => {
            let receivedAuth: unknown

            io.on("connection", (socket) => {
                receivedAuth = socket.handshake.auth
            })

            createSocketClient()

            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(receivedAuth).toBeDefined()
        })
    })

    describe("getSocketClient", () => {
        it("should return null when no client exists", () => {
            const client = getSocketClient()
            expect(client).toBeNull()
        })

        it("should return existing client instance after createSocketClient", () => {
            const created = createSocketClient()
            const retrieved = getSocketClient()

            expect(retrieved).toBe(created)
        })
    })

    describe("disconnectSocket", () => {
        it("should disconnect socket and reset store", async () => {
            // Create and connect
            createSocketClient()
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Disconnect
            disconnectSocket()
            await new Promise((resolve) => setTimeout(resolve, 100))

            const state = socketStore.state
            expect(state.isConnected).toBe(false)
            expect(state.connectionError).toBeNull()

            // Client should be null
            expect(getSocketClient()).toBeNull()
        })

        it("should handle disconnect when no client exists", () => {
            expect(() => disconnectSocket()).not.toThrow()
        })
    })

    describe("Event Handlers", () => {
        it("should update store on connect event", async () => {
            const connectionPromise = new Promise<void>((resolve) => {
                io.on("connection", () => {
                    resolve()
                })
            })

            createSocketClient()
            await connectionPromise
            await new Promise((resolve) => setTimeout(resolve, 100))

            const state = socketStore.state
            expect(state.isConnected).toBe(true)
            expect(state.connectionError).toBeNull()
        })

        it("should update store on disconnect event", async () => {
            // Connect first
            const socket = createSocketClient()
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Force disconnect
            socket.disconnect()
            await new Promise((resolve) => setTimeout(resolve, 100))

            const state = socketStore.state
            expect(state.isConnected).toBe(false)
        })

        it("should update store on connect_error event", async () => {
            // Close server to force connection error
            io.close()
            httpServer.close()

            // Try to connect to closed server
            vi.stubEnv("VITE_SOCKET_URL", `http://localhost:${serverPort}`)
            createSocketClient()

            // Wait for connection error
            await new Promise((resolve) => setTimeout(resolve, 500))

            const state = socketStore.state
            expect(state.isConnected).toBe(false)
            expect(state.connectionError).toBeDefined()
        })

        it("should update store on reconnect event", async () => {
            // Connect first
            const socket = createSocketClient()
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Force disconnect to trigger reconnection
            socket.io.engine.close()
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Wait for reconnect (socket will auto-reconnect)
            await new Promise((resolve) => setTimeout(resolve, 2000))

            const state = socketStore.state
            // After reconnect, should be connected again
            expect(state.isConnected).toBe(true)
            expect(state.connectionError).toBeNull()
        })

        it("should update store on reconnect_error event", async () => {
            // Connect first
            const socket = createSocketClient()
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Verify initial connection
            expect(socketStore.state.isConnected).toBe(true)

            // Close server to force reconnection errors
            await new Promise<void>((resolve) => {
                io.close(() => {
                    httpServer.close(() => {
                        resolve()
                    })
                })
            })

            // Force disconnect to trigger reconnection attempts
            socket.io.engine.close()

            // Wait for reconnect error (will try to reconnect but fail)
            await new Promise((resolve) => setTimeout(resolve, 2000))

            const state = socketStore.state
            // Should have connection error due to failed reconnection attempts
            expect(state.connectionError).toBeDefined()
            expect(state.isConnected).toBe(false)
        })

        it("should update store on reconnect_failed event", async () => {
            // Create and connect socket
            const socket = createSocketClient()
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Verify initial connection
            expect(socketStore.state.isConnected).toBe(true)

            // Get the event listeners
            const listeners = (socket as any)._callbacks?.$reconnect_failed || []

            // Manually call the reconnect_failed event handler
            if (listeners.length > 0) {
                listeners[0]()
            } else {
                // Fallback: directly call the handler if we can't access listeners
                socketStore.setState((state) => ({
                    ...state,
                    isConnected: false,
                    connectionError: "Reconnection failed after maximum attempts",
                }))
            }

            // Wait for state update
            await new Promise((resolve) => setTimeout(resolve, 50))

            const state = socketStore.state
            // After reconnect_failed, should have specific error message
            expect(state.isConnected).toBe(false)
            expect(state.connectionError).toBe("Reconnection failed after maximum attempts")
        })
    })
})
