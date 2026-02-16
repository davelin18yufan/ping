import { beforeEach, describe, expect, test } from "vitest"

import { uiStore } from "@/stores/uiStore"

describe("uiStore", () => {
    beforeEach(() => {
        uiStore.setState(() => ({
            headerExpanded: false,
            isViewTransitioning: false,
        }))
    })

    // ── Initial state ────────────────────────────────────────────────────────

    test("should initialize with headerExpanded set to false", () => {
        expect(uiStore.state.headerExpanded).toBe(false)
    })

    test("should initialize with isViewTransitioning set to false", () => {
        expect(uiStore.state.isViewTransitioning).toBe(false)
    })

    // ── headerExpanded ───────────────────────────────────────────────────────

    test("should set headerExpanded to true", () => {
        uiStore.setState((s) => ({ ...s, headerExpanded: true }))

        expect(uiStore.state.headerExpanded).toBe(true)
    })

    test("should set headerExpanded back to false", () => {
        uiStore.setState((s) => ({ ...s, headerExpanded: true }))
        uiStore.setState((s) => ({ ...s, headerExpanded: false }))

        expect(uiStore.state.headerExpanded).toBe(false)
    })

    test("should toggle headerExpanded from false to true and back", () => {
        uiStore.setState((s) => ({ ...s, headerExpanded: !s.headerExpanded }))
        expect(uiStore.state.headerExpanded).toBe(true)

        uiStore.setState((s) => ({ ...s, headerExpanded: !s.headerExpanded }))
        expect(uiStore.state.headerExpanded).toBe(false)
    })

    // ── State isolation ──────────────────────────────────────────────────────

    test("should contain headerExpanded and isViewTransitioning in state shape", () => {
        const state = uiStore.state
        expect(Object.keys(state)).toEqual(["headerExpanded", "isViewTransitioning"])
    })

    test("should preserve state after spread update", () => {
        uiStore.setState((s) => ({ ...s, headerExpanded: true }))

        expect(uiStore.state.headerExpanded).toBe(true)
    })
})
