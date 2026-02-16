import { Store } from "@tanstack/store"

export interface UIState {
    /** True when the AppHeader should show its expanded zone. */
    headerExpanded: boolean
    /** True while a View Transition is in progress. */
    isViewTransitioning: boolean
}

const initialState: UIState = {
    headerExpanded: false,
    isViewTransitioning: false,
}

export const uiStore = new Store<UIState>(initialState)
