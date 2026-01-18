import { Store } from "@tanstack/store"

export interface SocketState {
    isConnected: boolean
    connectionError: string | null
}

const initialState: SocketState = {
    isConnected: false,
    connectionError: null,
}

export const socketStore = new Store<SocketState>(initialState)
