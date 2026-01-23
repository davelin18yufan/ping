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
