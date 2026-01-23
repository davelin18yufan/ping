/**
 * React Hook for Socket.io integration
 * Provides access to Socket instance and connection state
 */

import { useEffect, useRef, useState } from "react"
import { useStore } from "@tanstack/react-store"

import {
    createSocketClient,
    getSocketClient,
    type TypedSocket,
} from "@/lib/socket"
import { socketStore } from "@/stores/socketStore"
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket"

/**
 * Hook return type
 */
interface UseSocketReturn {
    socket: TypedSocket | null
    isConnected: boolean
    connectionError: string | null
    emit: <K extends keyof ClientToServerEvents>(
        event: K,
        ...args: Parameters<ClientToServerEvents[K]>
    ) => void
    on: <K extends keyof ServerToClientEvents>(
        event: K,
        handler: ServerToClientEvents[K]
    ) => void
    off: <K extends keyof ServerToClientEvents>(
        event: K,
        handler: ServerToClientEvents[K]
    ) => void
}

/**
 * Custom hook for Socket.io integration
 * Automatically connects when component mounts and disconnects when unmounts
 *
 * @param autoConnect - Whether to automatically connect socket on mount (default: true)
 * @returns Socket instance and connection state
 */
export function useSocket(autoConnect = true): UseSocketReturn {
    const [socket, setSocket] = useState<TypedSocket | null>(null)
    const socketRef = useRef<TypedSocket | null>(null)

    // Subscribe to socket store for connection state
    const { isConnected, connectionError } = useStore(socketStore)

    // Initialize socket on mount
    useEffect(() => {
        if (!autoConnect) return

        const initializeSocket = async () => {
            try {
                const socketClient = await createSocketClient()
                socketRef.current = socketClient
                setSocket(socketClient)
            } catch (error) {
                console.error("Failed to initialize socket:", error)
            }
        }

        initializeSocket()

        // Cleanup on unmount
        return () => {
            // Don't disconnect on unmount as socket is a singleton
            // It will be reused across components
            // Only disconnect when app is closed or user logs out
        }
    }, [autoConnect])

    /**
     * Type-safe emit function
     */
    const emit = <K extends keyof ClientToServerEvents>(
        event: K,
        ...args: Parameters<ClientToServerEvents[K]>
    ) => {
        const currentSocket = socketRef.current || getSocketClient()
        if (!currentSocket) {
            console.warn(`Cannot emit ${String(event)}: Socket not connected`)
            return
        }

        currentSocket.emit(event, ...args)
    }

    /**
     * Type-safe event listener registration
     */
    const on = <K extends keyof ServerToClientEvents>(
        event: K,
        handler: ServerToClientEvents[K]
    ) => {
        const currentSocket = socketRef.current || getSocketClient()
        if (!currentSocket) {
            console.warn(
                `Cannot listen to ${String(event)}: Socket not connected`
            )
            return
        }

        currentSocket.on(event, handler as any)
    }

    /**
     * Type-safe event listener removal
     */
    const off = <K extends keyof ServerToClientEvents>(
        event: K,
        handler: ServerToClientEvents[K]
    ) => {
        const currentSocket = socketRef.current || getSocketClient()
        if (!currentSocket) {
            return
        }

        currentSocket.off(event, handler as any)
    }

    return {
        socket,
        isConnected,
        connectionError,
        emit,
        on,
        off,
    }
}

/**
 * Hook for managing conversation room subscriptions
 * Automatically joins conversation on mount and leaves on unmount
 *
 * @param conversationId - ID of the conversation to join
 * @returns Socket connection state
 */
export function useConversationSocket(conversationId: string | null) {
    const { emit, isConnected, connectionError } = useSocket()

    useEffect(() => {
        if (!conversationId || !isConnected) return

        // Join conversation room
        emit("joinConversation", conversationId)

        // Leave conversation on unmount
        return () => {
            emit("leaveConversation", conversationId)
        }
    }, [conversationId, isConnected, emit])

    return { isConnected, connectionError }
}

/**
 * Hook for managing typing indicators
 * Provides helper functions for start/stop typing events
 *
 * @param conversationId - ID of the conversation
 * @returns Typing control functions
 */
export function useTypingIndicator(conversationId: string | null) {
    const { emit, isConnected } = useSocket()

    const startTyping = () => {
        if (!conversationId || !isConnected) return
        emit("startTyping", conversationId)
    }

    const stopTyping = () => {
        if (!conversationId || !isConnected) return
        emit("stopTyping", conversationId)
    }

    return { startTyping, stopTyping }
}
