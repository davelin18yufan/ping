import { io, type Socket } from "socket.io-client"

import { socketStore } from "@/stores/socketStore"

let socketInstance: Socket | null = null

/**
 * Create Socket.io client with authentication and error handling
 */
export function createSocketClient(): Socket {
    if (socketInstance) {
        return socketInstance
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"

    socketInstance = io(socketUrl, {
        withCredentials: true, // Better Auth session cookie is included automatically
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    })

    // Connection event handlers
    socketInstance.on("connect", () => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: true,
            connectionError: null,
        }))
    })

    socketInstance.on("disconnect", () => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: false,
        }))
    })

    socketInstance.on("connect_error", (error) => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: false,
            connectionError: error.message,
        }))

        // Redirect to auth page on Unauthorized errors
        if (error.message.includes("Unauthorized")) {
            if (typeof window !== "undefined") {
                window.location.href = "/auth"
            }
        }
    })

    socketInstance.on("reconnect", () => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: true,
            connectionError: null,
        }))
    })

    socketInstance.on("reconnect_error", (error) => {
        socketStore.setState((state) => ({
            ...state,
            connectionError: error.message,
        }))
    })

    socketInstance.on("reconnect_failed", () => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: false,
            connectionError: "Reconnection failed after maximum attempts",
        }))
    })

    return socketInstance
}

/**
 * Get existing Socket.io client instance
 */
export function getSocketClient(): Socket | null {
    return socketInstance
}

/**
 * Disconnect and clean up Socket.io client
 */
export function disconnectSocket(): void {
    if (socketInstance) {
        socketInstance.disconnect()
        socketInstance = null
        socketStore.setState((state) => ({
            ...state,
            isConnected: false,
            connectionError: null,
        }))
    }
}
