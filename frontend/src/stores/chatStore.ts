import { Store } from "@tanstack/store"

import type { Message } from "@/types/conversations"

export interface ChatState {
    currentConversationId: string | null
    draftMessages: Record<string, string>
    isTyping: Record<string, boolean>
    /** True when multi-select mode is active. */
    isMultiSelectMode: boolean
    /** Set of message IDs currently selected. */
    selectedMessageIds: Set<string>
    /** The conversationId whose messages are being selected. Null when inactive. */
    multiSelectConversationId: string | null
    /** The message the user is composing a reply to. Null when not replying. */
    replyToMessage: Message | null
}

const initialState: ChatState = {
    currentConversationId: null,
    draftMessages: {},
    isTyping: {},
    isMultiSelectMode: false,
    selectedMessageIds: new Set<string>(),
    multiSelectConversationId: null,
    replyToMessage: null,
}

export const chatStore = new Store<ChatState>(initialState)

/** Exit multi-select mode and clear all selected message IDs. */
export function exitMultiSelect(): void {
    chatStore.setState((s) => ({
        ...s,
        isMultiSelectMode: false,
        selectedMessageIds: new Set<string>(),
        multiSelectConversationId: null,
    }))
}

/** Toggle a message's selected state. Sets isMultiSelectMode to true. */
export function toggleMessageSelected(messageId: string, conversationId: string): void {
    chatStore.setState((s) => {
        const next = new Set(s.selectedMessageIds)
        if (next.has(messageId)) {
            next.delete(messageId)
        } else {
            next.add(messageId)
        }
        return {
            ...s,
            isMultiSelectMode: next.size > 0,
            selectedMessageIds: next,
            multiSelectConversationId: next.size > 0 ? conversationId : null,
        }
    })
}

/** Set the message being replied to, or clear it (pass null). */
export function setReplyToMessage(message: Message | null): void {
    chatStore.setState((s) => ({ ...s, replyToMessage: message }))
}
