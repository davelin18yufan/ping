/**
 * Socket.io Client configuration for React Native + Expo
 * Provides singleton Socket instance with authentication and auto-reconnect
 */

import { io, Socket } from "socket.io-client"

import { getAuthToken } from "./apollo"
import { socketStore } from "@/stores/socketStore"
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket"

/**
 * Type-safe Socket.io client
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Singleton Socket instance
 */
let socketInstance: TypedSocket | null = null

/**
 * Get Socket.io endpoint from environment variable
 * Default to http://localhost:3000 for development
 */
const getSocketEndpoint = (): string => {
    return (
        process.env.EXPO_PUBLIC_SOCKET_URL ||
        process.env.EXPO_PUBLIC_API_URL ||
        "http://localhost:3000"
    )
}

/**
 * Create Socket.io client with authentication and error handling
 * Uses exponential backoff for reconnection strategy
 *
 * @returns Type-safe Socket.io client instance
 */
export async function createSocketClient(): Promise<TypedSocket> {
    if (socketInstance) {
        return socketInstance
    }

    const socketUrl = getSocketEndpoint()
    const token = await getAuthToken()

    // Create Socket.io client with configuration
    socketInstance = io(socketUrl, {
        auth: {
            token: token || undefined,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000, // Start with 1s delay
        reconnectionDelayMax: 5000, // Max 5s delay
        reconnectionAttempts: 5, // Try 5 times before giving up
        timeout: 10000, // 10s connection timeout
    }) as TypedSocket

    // Set up event handlers
    setupSocketEventHandlers(socketInstance)

    return socketInstance
}

/**
 * Setup Socket event handlers for connection lifecycle
 * Updates socketStore state based on connection events
 *
 * @param socket - Socket.io client instance
 */
function setupSocketEventHandlers(socket: TypedSocket): void {
    // Connection established
    socket.on("connect", () => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: true,
            connectionError: null,
        }))
    })

    // Connection lost
    socket.on("disconnect", () => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: false,
        }))
    })

    // Connection error occurred
    socket.on("connect_error", (error) => {
        const errorMessage = error.message || "Unknown connection error"
        socketStore.setState((state) => ({
            ...state,
            isConnected: false,
            connectionError: errorMessage,
        }))
    })

    // Socket reconnected successfully
    socket.io.on("reconnect", () => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: true,
            connectionError: null,
        }))
    })

    // Socket reconnection error
    socket.io.on("reconnect_error", (error) => {
        const errorMessage = error.message || "Reconnection error"
        socketStore.setState((state) => ({
            ...state,
            connectionError: errorMessage,
        }))
    })

    // Socket reconnection failed after all attempts
    socket.io.on("reconnect_failed", () => {
        socketStore.setState((state) => ({
            ...state,
            isConnected: false,
            connectionError: "Reconnection failed after maximum attempts",
        }))
    })
}

/**
 * Get existing Socket.io client instance
 * Returns null if socket hasn't been created yet
 *
 * @returns Socket instance or null
 */
export function getSocketClient(): TypedSocket | null {
    return socketInstance
}

/**
 * Disconnect and clean up Socket.io client
 * Resets socketStore state to disconnected
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

/**
 * Reconnect Socket.io client with updated auth token
 * Useful when user logs in/out or token is refreshed
 */
export async function reconnectSocket(): Promise<void> {
    // Disconnect existing socket
    disconnectSocket()

    // Create new socket with updated token
    await createSocketClient()
}

/**
 * Check if Socket is currently connected
 *
 * @returns True if socket is connected
 */
export function isSocketConnected(): boolean {
    return socketInstance?.connected ?? false
}
