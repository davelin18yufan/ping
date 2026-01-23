import { Store } from "@tanstack/store"

/**
 * Socket state interface
 * Manages socket connection status and errors
 */
export interface SocketState {
    isConnected: boolean
    connectionError: string | null
}

/**
 * Initial state for socket store
 */
const initialState: SocketState = {
    isConnected: false,
    connectionError: null,
}

/**
 * Socket store instance
 * Shared state management for Socket.io connection across Mobile app
 * Compatible with Web frontend implementation
 */
export const socketStore = new Store<SocketState>(initialState)

/**
 * Helper functions for managing socket state
 * These are used by the Socket.io client implementation
 */

/**
 * Set socket connection status to connected
 */
export function setSocketConnected(): void {
    socketStore.setState((state) => ({
        ...state,
        isConnected: true,
        connectionError: null,
    }))
}

/**
 * Set socket connection status to disconnected
 */
export function setSocketDisconnected(): void {
    socketStore.setState((state) => ({
        ...state,
        isConnected: false,
    }))
}

/**
 * Set socket connection error
 *
 * @param error - Error message or Error object
 */
export function setSocketError(error: string | Error): void {
    const errorMessage = typeof error === "string" ? error : error.message
    socketStore.setState((state) => ({
        ...state,
        isConnected: false,
        connectionError: errorMessage,
    }))
}

/**
 * Clear socket connection error
 */
export function clearSocketError(): void {
    socketStore.setState((state) => ({
        ...state,
        connectionError: null,
    }))
}

/**
 * Reset socket store to initial state
 */
export function resetSocketStore(): void {
    socketStore.setState(initialState)
}
