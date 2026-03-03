import { Store } from "@tanstack/store"

export interface UIState {
    /** True when the AppHeader should show its expanded zone. */
    headerExpanded: boolean
    /** True while a View Transition is in progress. */
    isViewTransitioning: boolean
    /**
     * The conversation currently open in the chat panel.
     * Null when no conversation is selected (e.g. on the conversations list route).
     */
    activeConversationId: string | null
    /**
     * Map of conversationId → list of display names currently typing.
     * Updated via Socket.io typing_start / typing_stop events.
     */
    typingMap: Record<string, string[]>
    /**
     * Map of userId → online status.
     * Updated via Socket.io presence events and initial conversation payload.
     */
    presenceMap: Record<string, boolean>
}

const initialState: UIState = {
    headerExpanded: false,
    isViewTransitioning: false,
    activeConversationId: null,
    typingMap: {},
    presenceMap: {},
}

export const uiStore = new Store<UIState>(initialState)
