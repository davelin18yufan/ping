/**
 * Socket.io event type definitions for Ping Mobile
 * Defines type-safe interfaces for client-to-server and server-to-client events
 */

/**
 * Message interface matching backend schema
 */
export interface Message {
    id: string
    content: string
    senderId: string
    conversationId: string
    createdAt: string
    status: "SENT" | "DELIVERED" | "READ"
}

/**
 * Message input for sending new messages
 */
export interface MessageInput {
    conversationId: string
    content: string
}

/**
 * Typing indicator data
 */
export interface TypingData {
    conversationId: string
    userId: string
}

/**
 * Events that the server can emit to the client
 * Used for type-safe Socket.io event listeners
 */
export interface ServerToClientEvents {
    /**
     * Emitted when a new message is received
     */
    messageReceived: (message: Message) => void

    /**
     * Emitted when a user comes online
     */
    userOnline: (userId: string) => void

    /**
     * Emitted when a user goes offline
     */
    userOffline: (userId: string) => void

    /**
     * Emitted when a user starts typing in a conversation
     */
    typingStart: (data: TypingData) => void

    /**
     * Emitted when a user stops typing in a conversation
     */
    typingStop: (data: TypingData) => void

    /**
     * Emitted when connection is established
     */
    connect: () => void

    /**
     * Emitted when connection is lost
     */
    disconnect: () => void

    /**
     * Emitted when there's a connection error
     */
    connect_error: (error: Error) => void
}

/**
 * Events that the client can emit to the server
 * Used for type-safe Socket.io event emitters
 */
export interface ClientToServerEvents {
    /**
     * Join a conversation room to receive updates
     */
    joinConversation: (conversationId: string) => void

    /**
     * Leave a conversation room
     */
    leaveConversation: (conversationId: string) => void

    /**
     * Send a message in a conversation
     */
    sendMessage: (message: MessageInput) => void

    /**
     * Notify others that user is typing
     */
    startTyping: (conversationId: string) => void

    /**
     * Notify others that user stopped typing
     */
    stopTyping: (conversationId: string) => void
}

/**
 * Socket connection status
 */
export type SocketStatus = "connected" | "disconnected" | "connecting" | "error"

/**
 * Socket error types
 */
export interface SocketError {
    type: "network" | "auth" | "unknown"
    message: string
    originalError?: Error
}
