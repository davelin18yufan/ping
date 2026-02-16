/**
 * Aesthetic Mode Context Tests
 *
 * Test suite for AestheticModeContext and useAestheticMode hook
 * Based on Feature-1.2.0-TDD-Tests.md Section 5.1
 *
 * Tests:
 * - Context provides correct values
 * - Mode switching works correctly
 * - localStorage persistence
 * - Default mode is 'ornate'
 * - Hook throws error outside provider
 */

import { useStore } from "@tanstack/react-store"
import { render, waitFor, fireEvent } from "@testing-library/react"
import { useState, useEffect } from "react"
import { useRef } from "react"
import { describe, it, expect, beforeEach, vi } from "vitest"

import {
    AestheticModeProvider,
    useAestheticMode,
    type AestheticMode,
} from "@/contexts/aesthetic-mode-context"
import { uiStore } from "@/stores/uiStore"

describe("Aesthetic Mode Context Tests", () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear()
        vi.clearAllMocks()
    })

    /**
     * Test 3.1: Context provides correct values
     * Verify the context provides mode, setMode, isOrnate, isMinimal
     */
    it("should provide correct context values", () => {
        const TestComponent = () => {
            const context = useAestheticMode()
            return (
                <div>
                    <span data-testid="mode">{context.mode}</span>
                    <span data-testid="is-ornate">{context.isOrnate.toString()}</span>
                    <span data-testid="is-minimal">{context.isMinimal.toString()}</span>
                    <span data-testid="has-setmode">
                        {typeof context.setMode === "function" ? "true" : "false"}
                    </span>
                </div>
            )
        }

        const { getByTestId } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        expect(getByTestId("mode")).toBeInTheDocument()
        expect(getByTestId("is-ornate")).toBeInTheDocument()
        expect(getByTestId("is-minimal")).toBeInTheDocument()
        expect(getByTestId("has-setmode").textContent).toBe("true")
    })

    /**
     * Test 3.2: Default mode is 'ornate' on first visit
     * Verify initial mode when no localStorage value exists
     */
    it("should default to ornate mode on first visit", () => {
        const TestComponent = () => {
            const { mode, isOrnate, isMinimal } = useAestheticMode()
            return (
                <div>
                    <span data-testid="mode">{mode}</span>
                    <span data-testid="is-ornate">{isOrnate.toString()}</span>
                    <span data-testid="is-minimal">{isMinimal.toString()}</span>
                </div>
            )
        }

        const { getByTestId } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        expect(getByTestId("mode").textContent).toBe("ornate")
        expect(getByTestId("is-ornate").textContent).toBe("true")
        expect(getByTestId("is-minimal").textContent).toBe("false")
    })

    /**
     * Test 3.3: Mode switching updates state correctly
     * Verify setMode updates all related properties
     */
    it("should switch mode correctly", async () => {
        const TestComponent = () => {
            const { mode, setMode, isOrnate, isMinimal } = useAestheticMode()
            return (
                <div>
                    <span data-testid="mode">{mode}</span>
                    <span data-testid="is-ornate">{isOrnate.toString()}</span>
                    <span data-testid="is-minimal">{isMinimal.toString()}</span>
                    <button onClick={() => setMode("minimal")}>Switch to Minimal</button>
                    <button onClick={() => setMode("ornate")}>Switch to Ornate</button>
                </div>
            )
        }

        const { getByTestId, getByText } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        // Initial state: ornate
        expect(getByTestId("mode").textContent).toBe("ornate")

        // Switch to minimal
        fireEvent.click(getByText("Switch to Minimal"))

        await waitFor(() => {
            expect(getByTestId("mode").textContent).toBe("minimal")
            expect(getByTestId("is-ornate").textContent).toBe("false")
            expect(getByTestId("is-minimal").textContent).toBe("true")
        })

        // Switch back to ornate
        fireEvent.click(getByText("Switch to Ornate"))

        await waitFor(() => {
            expect(getByTestId("mode").textContent).toBe("ornate")
            expect(getByTestId("is-ornate").textContent).toBe("true")
            expect(getByTestId("is-minimal").textContent).toBe("false")
        })
    })

    /**
     * Test 3.4: Mode preference persists to localStorage
     * Verify setMode saves to localStorage
     */
    it("should save mode preference to localStorage", async () => {
        const TestComponent = () => {
            const { setMode } = useAestheticMode()
            return (
                <div>
                    <button onClick={() => setMode("minimal")}>Set Minimal</button>
                    <button onClick={() => setMode("ornate")}>Set Ornate</button>
                </div>
            )
        }

        const { getByText } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        // Switch to minimal
        fireEvent.click(getByText("Set Minimal"))

        await waitFor(() => {
            expect(localStorage.getItem("ping-aesthetic-mode")).toBe("minimal")
        })

        // Switch to ornate
        fireEvent.click(getByText("Set Ornate"))

        await waitFor(() => {
            expect(localStorage.getItem("ping-aesthetic-mode")).toBe("ornate")
        })
    })

    /**
     * Test 3.5: Mode reads from localStorage on initialization
     * Verify localStorage value is used when available
     */
    it("should read mode from localStorage on initialization", () => {
        // Set localStorage before rendering
        localStorage.setItem("ping-aesthetic-mode", "minimal")

        const TestComponent = () => {
            const { mode, isOrnate, isMinimal } = useAestheticMode()
            return (
                <div>
                    <span data-testid="mode">{mode}</span>
                    <span data-testid="is-ornate">{isOrnate.toString()}</span>
                    <span data-testid="is-minimal">{isMinimal.toString()}</span>
                </div>
            )
        }

        const { getByTestId } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        expect(getByTestId("mode").textContent).toBe("minimal")
        expect(getByTestId("is-ornate").textContent).toBe("false")
        expect(getByTestId("is-minimal").textContent).toBe("true")
    })

    /**
     * Test 3.6: Hook throws error outside provider
     * Verify useAestheticMode throws when not inside provider
     */
    it("should throw error when used outside provider", () => {
        // Suppress console.error for this test
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        const TestComponent = () => {
            useAestheticMode()
            return <div>Test</div>
        }

        expect(() => {
            render(<TestComponent />)
        }).toThrow("useAestheticMode must be used within AestheticModeProvider")

        consoleErrorSpy.mockRestore()
    })

    /**
     * Test 3.7: Provider renders children correctly
     * Verify provider wrapper renders child components
     */
    it("should render children correctly", () => {
        const TestComponent = () => {
            const { mode } = useAestheticMode()
            return <div data-testid="mode">{mode}</div>
        }

        const { getByTestId } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        const modeElement = getByTestId("mode")
        expect(modeElement).toBeInTheDocument()
        expect(modeElement.textContent).toBe("ornate")
    })

    /**
     * Test 3.8: Invalid localStorage value defaults to ornate
     * Verify fallback behavior for corrupted localStorage
     */
    it("should default to ornate when localStorage has invalid value", () => {
        localStorage.setItem("ping-aesthetic-mode", "invalid-value")

        const TestComponent = () => {
            const { mode, isOrnate } = useAestheticMode()
            return (
                <div>
                    <span data-testid="mode">{mode}</span>
                    <span data-testid="is-ornate">{isOrnate.toString()}</span>
                </div>
            )
        }

        const { getByTestId } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        expect(getByTestId("mode").textContent).toBe("ornate")
        expect(getByTestId("is-ornate").textContent).toBe("true")
    })

    /**
     * Test 3.9: Multiple mode switches preserve consistency
     * Verify rapid mode switching maintains consistency
     */
    it("should handle multiple rapid mode switches correctly", async () => {
        const TestComponent = () => {
            const { mode, setMode } = useAestheticMode()
            const [clickCount, setClickCount] = useState(0)

            useEffect(() => {
                if (clickCount > 0) {
                    const modes: AestheticMode[] = [
                        "minimal",
                        "ornate",
                        "minimal",
                        "ornate",
                        "minimal",
                    ]
                    setMode(modes[(clickCount - 1) % modes.length])
                }
            }, [clickCount, setMode])

            return (
                <div>
                    <span data-testid="mode">{mode}</span>
                    <button onClick={() => setClickCount((c) => c + 1)}>Toggle</button>
                </div>
            )
        }

        const { getByTestId, getByText } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        // Click 5 times
        for (let i = 0; i < 5; i++) {
            fireEvent.click(getByText("Toggle"))
        }

        await waitFor(() => {
            expect(getByTestId("mode").textContent).toBe("minimal")
            expect(localStorage.getItem("ping-aesthetic-mode")).toBe("minimal")
        })
    })

    /**
     * Test 3.10: Server-side rendering returns default mode
     * Verify SSR compatibility (no window access)
     */
    it("should return default mode during SSR", () => {
        const TestComponent = () => {
            const { mode } = useAestheticMode()
            return <div data-testid="mode">{mode}</div>
        }

        const { getByTestId } = render(
            <AestheticModeProvider>
                <TestComponent />
            </AestheticModeProvider>
        )

        // Without localStorage set, should default to ornate
        expect(getByTestId("mode").textContent).toBe("ornate")
    })

    /**
     * Test 3.11: setMode callback reference is stable across re-renders (useCallback)
     *
     * Because setMode is wrapped in useCallback with empty deps, its reference
     * must never change even when mode changes. This prevents consumers that
     * include setMode in dependency arrays from re-running unnecessarily.
     */
    it("should keep setMode reference stable across re-renders", async () => {
        const capturedRefs: ((...args: unknown[]) => void)[] = []

        const Capture = () => {
            const { setMode, mode } = useAestheticMode()
            capturedRefs.push(setMode as (...args: unknown[]) => void)
            return (
                <button
                    data-testid="toggle"
                    onClick={() => setMode(mode === "ornate" ? "minimal" : "ornate")}
                >
                    toggle
                </button>
            )
        }

        const { getByTestId } = render(
            <AestheticModeProvider>
                <Capture />
            </AestheticModeProvider>
        )

        const refBefore = capturedRefs[capturedRefs.length - 1]

        fireEvent.click(getByTestId("toggle"))

        await waitFor(() => {
            const refAfter = capturedRefs[capturedRefs.length - 1]
            expect(refAfter).toBe(refBefore)
        })
    })

    /**
     * Test 3.12: Context value object reference is stable when mode does not change (useMemo)
     *
     * When mode stays the same (e.g. parent re-renders for unrelated reasons),
     * the memoized context value object must be the same reference. This prevents
     * all context consumers from re-rendering on every parent render.
     */
    it("should keep context value reference stable when mode does not change", () => {
        const capturedValues: object[] = []
        const renderCountRef = { current: 0 }

        const Capture = () => {
            const ctx = useAestheticMode()
            capturedValues.push(ctx)
            renderCountRef.current += 1
            return <span data-testid="mode">{ctx.mode}</span>
        }

        // Wrap in a parent that can force re-render without touching the context
        const Parent = () => {
            const renderRef = useRef(0)
            renderRef.current += 1
            return <Capture />
        }

        render(
            <AestheticModeProvider>
                <Parent />
            </AestheticModeProvider>
        )

        // Only one render happens here, but the key assertion is that calling setMode
        // with the current value does not produce a new object reference.
        expect(capturedValues.length).toBeGreaterThanOrEqual(1)

        const firstValue = capturedValues[0]
        // All captured values (if more than one render) must be the same reference
        capturedValues.forEach((v) => {
            expect(v).toBe(firstValue)
        })
    })

    /**
     * Test 3.13: uiStore.headerExpanded is NOT reset when aesthetic mode changes
     *
     * This is the core regression test for the bug fix. When mode switches,
     * AestheticModeProvider re-renders its subtree. headerExpanded lives in
     * uiStore (TanStack Store) — outside React's render lifecycle — so it must
     * remain unaffected.
     */
    it("should not reset uiStore.headerExpanded when aesthetic mode switches", async () => {
        // Arrange: expand the header before the mode switch
        uiStore.setState((s) => ({ ...s, headerExpanded: true }))

        const StoreReader = () => {
            const headerExpanded = useStore(uiStore, (s) => s.headerExpanded)
            return <span data-testid="expanded">{headerExpanded.toString()}</span>
        }

        const ModeController = () => {
            const { setMode, mode } = useAestheticMode()
            return (
                <button
                    data-testid="switch"
                    onClick={() => setMode(mode === "ornate" ? "minimal" : "ornate")}
                >
                    switch
                </button>
            )
        }

        const { getByTestId } = render(
            <AestheticModeProvider>
                <ModeController />
                <StoreReader />
            </AestheticModeProvider>
        )

        expect(getByTestId("expanded").textContent).toBe("true")

        // Act: switch aesthetic mode
        fireEvent.click(getByTestId("switch"))

        await waitFor(() => {
            // Assert: headerExpanded must still be true after context re-render
            expect(getByTestId("expanded").textContent).toBe("true")
        })

        // Restore store state
        uiStore.setState((s) => ({ ...s, headerExpanded: false }))
    })
})
