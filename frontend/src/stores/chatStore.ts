import { Store } from "@tanstack/store"

export interface ChatState {
    currentConversationId: string | null
    draftMessages: Record<string, string>
    isTyping: Record<string, boolean>
}

const initialState: ChatState = {
    currentConversationId: null,
    draftMessages: {},
    isTyping: {},
}

export const chatStore = new Store<ChatState>(initialState)
