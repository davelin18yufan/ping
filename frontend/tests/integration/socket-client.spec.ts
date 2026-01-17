/**
 * @vitest-environment node
 */
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { io as ioc, type Socket as ClientSocket } from "socket.io-client"
import { Server, type Socket as ServerSocket } from "socket.io"

function waitFor(
    socket: ServerSocket | ClientSocket,
    event: string
): Promise<unknown> {
    return new Promise((resolve) => {
        socket.once(event, resolve)
    })
}

describe("Socket.io Client", () => {
    let io: Server
    let serverSocket: ServerSocket
    let clientSocket: ClientSocket

    beforeAll(() => {
        return new Promise<void>((resolve) => {
            const httpServer = createServer()
            io = new Server(httpServer)

            httpServer.listen(() => {
                const port = (httpServer.address() as AddressInfo).port
                clientSocket = ioc(`http://localhost:${port}`)

                io.on("connection", (socket) => {
                    serverSocket = socket
                })

                clientSocket.on("connect", () => {
                    resolve()
                })
            })
        })
    })

    afterAll(() => {
        io.close()
        clientSocket.disconnect()
    })

    describe("Initialization", () => {
        it("should create Socket.io client with correct configuration", () => {
            expect(clientSocket).toBeDefined()
            expect(clientSocket.connected).toBe(true)
        })

        it("should include auth in handshake", () => {
            // Auth is configured on client creation
            // For this test, we verify the client accepts auth configuration
            const testSocket = ioc("http://localhost:3000", {
                auth: {
                    token: "test-token-123",
                },
                autoConnect: false,
            })

            expect(testSocket.auth).toBeDefined()
            expect((testSocket.auth as { token: string }).token).toBe(
                "test-token-123"
            )

            testSocket.close()
        })
    })

    describe("Connection", () => {
        it("should connect to Socket.io server", () => {
            expect(clientSocket.connected).toBe(true)
            expect(serverSocket).toBeDefined()
        })

        it("should handle connection error", async () => {
            const errorSocket = ioc("http://localhost:9999", {
                timeout: 1000,
                reconnection: false,
            })

            const error = await waitFor(errorSocket, "connect_error")
            expect(error).toBeDefined()
            errorSocket.close()
        })
    })

    describe("Events", () => {
        it("should receive server events", async () => {
            const eventPromise = waitFor(clientSocket, "test_event")
            serverSocket.emit("test_event", { message: "Hello from server" })

            const data = (await eventPromise) as { message: string }
            expect(data.message).toBe("Hello from server")
        })

        it("should send events to server", async () => {
            const eventPromise = waitFor(serverSocket, "client_event")
            clientSocket.emit("client_event", { message: "Hello from client" })

            const data = (await eventPromise) as { message: string }
            expect(data.message).toBe("Hello from client")
        })
    })
})
