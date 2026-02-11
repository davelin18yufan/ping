/**
 * useViewTransition Hook Tests
 *
 * Test suite for the View Transition API wrapper hook
 * Based on Feature-1.2.0-TDD-Tests.md Section 4.2
 *
 * Tests:
 * - API support detection
 * - Basic transitions
 * - Ripple effect transitions
 * - Fallback behavior
 * - CSS variable cleanup
 */

import { render, waitFor } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

import { useViewTransition } from "@/hooks/use-view-transition"

// Test wrapper component to use the hook
function TestHookComponent({
    onMount,
}: {
    onMount: (hook: ReturnType<typeof useViewTransition>) => void
}) {
    const hook = useViewTransition()
    onMount(hook)
    return <div data-testid="test-wrapper">Test</div>
}

describe("useViewTransition Hook Tests", () => {
    let mockStartViewTransition: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock ViewTransition API
        mockStartViewTransition = vi.fn((callback) => {
            void Promise.resolve(callback())
            return {
                finished: Promise.resolve(),
                ready: Promise.resolve(),
                updateCallbackDone: Promise.resolve(),
                skipTransition: vi.fn(),
            }
        })

        // Add startViewTransition to document
        Object.defineProperty(document, "startViewTransition", {
            writable: true,
            configurable: true,
            value: mockStartViewTransition,
        })
    })

    afterEach(() => {
        // Clean up CSS variables
        document.documentElement.style.removeProperty("--ripple-x")
        document.documentElement.style.removeProperty("--ripple-y")
    })

    /**
     * Test 2.6: View Transition API support detection
     * Verify isSupported returns true when API is available
     */
    it("should detect View Transition API support", () => {
        let hookResult: ReturnType<typeof useViewTransition> | null = null

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        expect(hookResult).not.toBeNull()
        expect(hookResult!.isSupported).toBe(true)
        expect(hookResult!.start).toBeDefined()
        expect(hookResult!.withRipple).toBeDefined()
    })

    /**
     * Test 2.7: View Transition API not supported fallback
     * Verify hook still works when API is not available
     */
    it("should work without View Transition API (fallback)", () => {
        // Remove startViewTransition
        delete (document as any).startViewTransition

        let hookResult: ReturnType<typeof useViewTransition> | null = null

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        expect(hookResult!.isSupported).toBe(false)

        // Should still provide methods
        expect(hookResult!.start).toBeDefined()
        expect(hookResult!.withRipple).toBeDefined()
    })

    /**
     * Test 2.8: Basic transition executes callback
     * Verify start() calls the update callback
     */
    it("should execute callback in basic transition", () => {
        let hookResult: ReturnType<typeof useViewTransition> | null = null
        const callback = vi.fn()

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        hookResult!.start("theme-toggle", callback)

        expect(mockStartViewTransition).toHaveBeenCalled()
        expect(callback).toHaveBeenCalled()
    })

    /**
     * Test 2.9: Fallback executes callback without API
     * Verify callback runs even when API is not available
     */
    it("should execute callback in fallback mode", async () => {
        // Remove API
        delete (document as any).startViewTransition

        let hookResult: ReturnType<typeof useViewTransition> | null = null
        const callback = vi.fn()

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        hookResult!.start("theme-toggle", callback)

        await waitFor(() => {
            expect(callback).toHaveBeenCalled()
        })
    })

    /**
     * Test 2.10: Ripple effect sets CSS variables
     * Verify withRipple() sets --ripple-x and --ripple-y
     */
    it("should set ripple CSS variables from mouse event", () => {
        let hookResult: ReturnType<typeof useViewTransition> | null = null

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        // Mock mouse event
        const mouseEvent = new MouseEvent("click", {
            clientX: 100,
            clientY: 200,
        })

        const callback = vi.fn()

        hookResult!.withRipple(mouseEvent, "theme-toggle", callback)

        // Verify CSS variables are set
        const rippleX = document.documentElement.style.getPropertyValue("--ripple-x")
        const rippleY = document.documentElement.style.getPropertyValue("--ripple-y")

        expect(rippleX).toBeTruthy()
        expect(rippleY).toBeTruthy()
        expect(rippleX).toContain("%")
        expect(rippleY).toContain("%")
    })

    /**
     * Test 2.11: Ripple effect cleans up CSS variables
     * Verify CSS variables are removed after transition
     */
    it("should clean up ripple CSS variables after transition", async () => {
        let hookResult: ReturnType<typeof useViewTransition> | null = null

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        const mouseEvent = new MouseEvent("click", {
            clientX: 100,
            clientY: 200,
        })

        const callback = vi.fn()

        hookResult!.withRipple(mouseEvent, "theme-toggle", callback)

        // Variables should be set initially
        expect(document.documentElement.style.getPropertyValue("--ripple-x")).toBeTruthy()

        // Wait for cleanup (after transition.finished)
        await waitFor(
            () => {
                const rippleX = document.documentElement.style.getPropertyValue("--ripple-x")
                const rippleY = document.documentElement.style.getPropertyValue("--ripple-y")
                expect(rippleX).toBe("")
                expect(rippleY).toBe("")
            },
            { timeout: 100 }
        )
    })

    /**
     * Test 2.12: Touch event ripple position
     * Verify ripple works with touch events
     */
    it("should calculate ripple position from touch event", () => {
        let hookResult: ReturnType<typeof useViewTransition> | null = null

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        // Mock touch event
        const touchEvent = new TouchEvent("touchstart", {
            touches: [
                {
                    clientX: 150,
                    clientY: 250,
                } as Touch,
            ],
        })

        const callback = vi.fn()

        hookResult!.withRipple(touchEvent, "aesthetic-toggle", callback)

        // Verify CSS variables are set
        const rippleX = document.documentElement.style.getPropertyValue("--ripple-x")
        const rippleY = document.documentElement.style.getPropertyValue("--ripple-y")

        expect(rippleX).toBeTruthy()
        expect(rippleY).toBeTruthy()
    })

    /**
     * Test 2.13: Fallback ripple executes callback
     * Verify ripple works without API support
     */
    it("should execute callback in ripple fallback mode", async () => {
        // Remove API
        delete (document as any).startViewTransition

        let hookResult: ReturnType<typeof useViewTransition> | null = null
        const callback = vi.fn()

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        const mouseEvent = new MouseEvent("click", {
            clientX: 100,
            clientY: 200,
        })

        hookResult!.withRipple(mouseEvent, "theme-toggle", callback)

        await waitFor(() => {
            expect(callback).toHaveBeenCalled()
        })
    })

    /**
     * Test 2.14: Async callback support
     * Verify hook handles async update callbacks
     */
    it("should support async callbacks", async () => {
        let hookResult: ReturnType<typeof useViewTransition> | null = null

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        const asyncCallback = vi.fn(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
        })

        hookResult!.start("theme-toggle", asyncCallback)

        await waitFor(() => {
            expect(asyncCallback).toHaveBeenCalled()
        })
    })

    /**
     * Test 2.15: Multiple transitions queue correctly
     * Verify multiple rapid transitions don't conflict
     */
    it("should handle multiple rapid transitions", () => {
        let hookResult: ReturnType<typeof useViewTransition> | null = null

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        const callback1 = vi.fn()
        const callback2 = vi.fn()
        const callback3 = vi.fn()

        hookResult!.start("theme-toggle", callback1)
        hookResult!.start("aesthetic-toggle", callback2)
        hookResult!.start("root", callback3)

        expect(mockStartViewTransition).toHaveBeenCalledTimes(3)
        expect(callback1).toHaveBeenCalled()
        expect(callback2).toHaveBeenCalled()
        expect(callback3).toHaveBeenCalled()
    })

    /**
     * Test 2.16: Ripple position defaults to center when no event data
     * Verify fallback position when event has no coordinates
     */
    it("should use center position when event has no coordinates", () => {
        let hookResult: ReturnType<typeof useViewTransition> | null = null

        render(<TestHookComponent onMount={(hook) => (hookResult = hook)} />)

        // Mock event without coordinates
        const emptyEvent = {} as MouseEvent

        const callback = vi.fn()

        hookResult!.withRipple(emptyEvent, "theme-toggle", callback)

        // Should still set CSS variables (fallback to center)
        const rippleX = document.documentElement.style.getPropertyValue("--ripple-x")
        const rippleY = document.documentElement.style.getPropertyValue("--ripple-y")

        expect(rippleX).toBeTruthy()
        expect(rippleY).toBeTruthy()
    })
})
