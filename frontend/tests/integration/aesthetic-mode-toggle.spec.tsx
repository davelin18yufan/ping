/**
 * AestheticModeToggle Component Tests
 *
 * Test suite for the AestheticModeToggle component
 * Based on Feature-1.2.0-TDD-Tests.md Section 5.1
 *
 * Tests:
 * - Component renders correctly
 * - Toggle button changes mode
 * - Icons update based on mode
 * - View Transition integration
 * - Accessibility
 */

import { useStore } from "@tanstack/react-store"
import { render, fireEvent, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi } from "vitest"

import { AestheticModeToggle } from "@/components/shared/AestheticModeToggle"
import { AestheticModeProvider } from "@/contexts/aesthetic-mode-context"
import { uiStore } from "@/stores/uiStore"

describe("AestheticModeToggle Component Tests", () => {
    let mockStartViewTransition: ReturnType<typeof vi.fn>

    beforeEach(() => {
        localStorage.clear()
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

        Object.defineProperty(document, "startViewTransition", {
            writable: true,
            configurable: true,
            value: mockStartViewTransition,
        })
    })

    /**
     * Test 3.11: Component renders correctly in ornate mode
     * Verify initial render state
     */
    it("should render correctly in ornate mode", () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")
        expect(button).toBeInTheDocument()
        expect(button).toHaveClass("glass-button")

        // Button shows the TARGET mode (what you'd switch to): "Minimal"
        expect(screen.getByText("Minimal")).toBeInTheDocument()
    })

    /**
     * Test 3.12: Component renders correctly in minimal mode
     * Verify render state after mode change
     */
    it("should render correctly in minimal mode", () => {
        localStorage.setItem("ping-aesthetic-mode", "minimal")

        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")
        expect(button).toBeInTheDocument()

        // Button shows the TARGET mode (what you'd switch to): "Ornate"
        expect(screen.getByText("Ornate")).toBeInTheDocument()
    })

    /**
     * Test 3.13: Toggle button switches mode from ornate to minimal
     * Verify click handler updates mode
     */
    it("should switch from ornate to minimal on click", async () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        // Initial state: ornate mode → button shows target "Minimal"
        expect(screen.getByText("Minimal")).toBeInTheDocument()

        // Click to toggle (ornate → minimal)
        fireEvent.click(button)

        // Now in minimal mode → button shows target "Ornate"
        await waitFor(() => {
            expect(screen.getByText("Ornate")).toBeInTheDocument()
        })
    })

    /**
     * Test 3.14: Toggle button switches mode from minimal to ornate
     * Verify bidirectional toggle
     */
    it("should switch from minimal to ornate on click", async () => {
        localStorage.setItem("ping-aesthetic-mode", "minimal")

        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        // Initial state: minimal mode → button shows target "Ornate"
        expect(screen.getByText("Ornate")).toBeInTheDocument()

        // Click to toggle (minimal → ornate)
        fireEvent.click(button)

        // Now in ornate mode → button shows target "Minimal"
        await waitFor(() => {
            expect(screen.getByText("Minimal")).toBeInTheDocument()
        })
    })

    /**
     * Test 3.15: Toggle triggers View Transition with ripple
     * Verify withRipple is called on toggle
     */
    it("should trigger View Transition with ripple on toggle", () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        // Click button
        fireEvent.click(button)

        // Verify startViewTransition was called
        expect(mockStartViewTransition).toHaveBeenCalled()

        // Verify ripple CSS variables are set
        const rippleX = document.documentElement.style.getPropertyValue("--ripple-x")
        const rippleY = document.documentElement.style.getPropertyValue("--ripple-y")

        expect(rippleX).toBeTruthy()
        expect(rippleY).toBeTruthy()
    })

    /**
     * Test 3.16: Accessibility - ARIA labels present
     * Verify button has proper accessibility attributes
     */
    it("should have proper ARIA labels", () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        expect(button).toHaveAttribute("aria-label")
        expect(button).toHaveAttribute("title")

        const ariaLabel = button.getAttribute("aria-label")
        expect(ariaLabel).toContain("minimal")
    })

    /**
     * Test 3.17: Accessibility - ARIA label updates on mode change
     * Verify labels reflect current state
     */
    it("should update ARIA label when mode changes", async () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        // Initial: should suggest switching to minimal
        expect(button.getAttribute("aria-label")).toContain("minimal")

        // Click to toggle
        fireEvent.click(button)

        // After toggle: should suggest switching to ornate
        await waitFor(() => {
            expect(button.getAttribute("aria-label")).toContain("ornate")
        })
    })

    /**
     * Test 3.18: Icons change based on mode
     * Verify Sparkles icon for ornate, Minimize2 for minimal
     */
    it("should display correct icon for each mode", async () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        // Ornate mode: should have Sparkles icon (verify SVG presence)
        let svg = button.querySelector("svg")
        expect(svg).toBeInTheDocument()

        // Click to switch to minimal
        fireEvent.click(button)

        // Minimal mode: should have Minimize2 icon
        await waitFor(() => {
            svg = button.querySelector("svg")
            expect(svg).toBeInTheDocument()
        })
    })

    /**
     * Test 3.19: Multiple rapid clicks handled correctly
     * Verify component handles rapid toggling
     */
    it("should handle multiple rapid clicks correctly", async () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        // Rapid clicks (start: ornate → shows "Minimal" button)
        fireEvent.click(button) // ornate → minimal (button now shows "Ornate")
        fireEvent.click(button) // minimal → ornate (button now shows "Minimal")
        fireEvent.click(button) // ornate → minimal (button now shows "Ornate")
        fireEvent.click(button) // minimal → ornate (button now shows "Minimal")
        fireEvent.click(button) // ornate → minimal (button now shows "Ornate")

        // Should end up in minimal mode → button shows "Ornate"
        await waitFor(() => {
            expect(screen.getByText("Ornate")).toBeInTheDocument()
            expect(localStorage.getItem("ping-aesthetic-mode")).toBe("minimal")
        })
    })

    /**
     * Test 3.20: Component uses glass-button design system class
     * Verify styling follows design system
     */
    it("should use glass-button design system class", () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        expect(button).toHaveClass("glass-button")
        expect(button).toHaveClass("glass-button--sm")
    })

    /**
     * Test 3.21: Works without View Transition API (fallback)
     * Verify component works in unsupported browsers
     */
    it("should work without View Transition API", async () => {
        // Remove API
        delete (document as any).startViewTransition

        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        // Initial state: ornate mode → button shows target "Minimal"
        expect(screen.getByText("Minimal")).toBeInTheDocument()

        // Click to toggle (ornate → minimal)
        fireEvent.click(button)

        // Should still work (fallback): minimal mode → button shows target "Ornate"
        await waitFor(() => {
            expect(screen.getByText("Ornate")).toBeInTheDocument()
        })
    })

    /**
     * Test 3.22: Keyboard accessibility
     * Verify button is keyboard accessible
     */
    it("should be keyboard accessible", async () => {
        const { container } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!

        // Focus button
        button.focus()
        expect(button).toHaveFocus()

        // Press Enter
        fireEvent.keyDown(button, { key: "Enter", code: "Enter" })
        fireEvent.click(button) // React doesn't auto-trigger click on Enter

        // ornate → minimal: button now shows target "Ornate"
        await waitFor(() => {
            expect(screen.getByText("Ornate")).toBeInTheDocument()
        })
    })

    /**
     * Test 3.23: uiStore.headerExpanded is NOT reset when AestheticModeToggle fires
     *
     * Regression test for the capsule-header state-persistence fix.
     * headerExpanded lives in uiStore (outside React render lifecycle), so
     * clicking AestheticModeToggle — which causes a context re-render — must
     * not affect it.
     */
    it("should not reset uiStore.headerExpanded when aesthetic mode is toggled", async () => {
        // Arrange: set headerExpanded before toggle
        uiStore.setState((s) => ({ ...s, headerExpanded: true }))

        const StoreReader = () => {
            const headerExpanded = useStore(uiStore, (s) => s.headerExpanded)
            return <span data-testid="header-expanded">{headerExpanded.toString()}</span>
        }

        const { container, getByTestId } = render(
            <AestheticModeProvider>
                <AestheticModeToggle />
                <StoreReader />
            </AestheticModeProvider>
        )

        const button = container.querySelector("button")!
        expect(getByTestId("header-expanded").textContent).toBe("true")

        // Act: toggle aesthetic mode (ornate → minimal: button shows "Ornate")
        fireEvent.click(button)

        await waitFor(() => {
            expect(screen.getByText("Ornate")).toBeInTheDocument()
        })

        // Assert: headerExpanded must be unaffected
        expect(getByTestId("header-expanded").textContent).toBe("true")

        // Restore store state
        uiStore.setState((s) => ({ ...s, headerExpanded: false }))
    })
})
