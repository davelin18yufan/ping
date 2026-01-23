import { Store } from "@tanstack/store"

/**
 * Chat state interface
 * Manages current conversation, draft messages, and typing indicators
 */
export interface ChatState {
    currentConversationId: string | null
    draftMessages: Record<string, string>
    isTyping: Record<string, boolean>
}

/**
 * Initial state for chat store
 */
const initialState: ChatState = {
    currentConversationId: null,
    draftMessages: {},
    isTyping: {},
}

/**
 * Chat store instance
 * Shared state management for chat features across Mobile app
 * Compatible with Web frontend implementation
 */
export const chatStore = new Store<ChatState>(initialState)
