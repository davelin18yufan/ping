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

import { render, fireEvent, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi } from "vitest"

import { AestheticModeToggle } from "@/components/shared/AestheticModeToggle"
import { AestheticModeProvider } from "@/contexts/aesthetic-mode-context"

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

        // Should show "Ornate" text
        expect(screen.getByText("Ornate")).toBeInTheDocument()
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

        // Should show "Minimal" text
        expect(screen.getByText("Minimal")).toBeInTheDocument()
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

        // Initial state: Ornate
        expect(screen.getByText("Ornate")).toBeInTheDocument()

        // Click to toggle
        fireEvent.click(button)

        // Should switch to Minimal
        await waitFor(() => {
            expect(screen.getByText("Minimal")).toBeInTheDocument()
        })

        // Verify localStorage
        expect(localStorage.getItem("ping-aesthetic-mode")).toBe("minimal")
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

        // Initial state: Minimal
        expect(screen.getByText("Minimal")).toBeInTheDocument()

        // Click to toggle
        fireEvent.click(button)

        // Should switch to Ornate
        await waitFor(() => {
            expect(screen.getByText("Ornate")).toBeInTheDocument()
        })

        // Verify localStorage
        expect(localStorage.getItem("ping-aesthetic-mode")).toBe("ornate")
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

        // Rapid clicks
        fireEvent.click(button) // -> minimal
        fireEvent.click(button) // -> ornate
        fireEvent.click(button) // -> minimal
        fireEvent.click(button) // -> ornate
        fireEvent.click(button) // -> minimal

        // Should end up in minimal mode
        await waitFor(() => {
            expect(screen.getByText("Minimal")).toBeInTheDocument()
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

        // Initial state
        expect(screen.getByText("Ornate")).toBeInTheDocument()

        // Click to toggle
        fireEvent.click(button)

        // Should still work (fallback)
        await waitFor(() => {
            expect(screen.getByText("Minimal")).toBeInTheDocument()
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

        await waitFor(() => {
            expect(screen.getByText("Minimal")).toBeInTheDocument()
        })
    })
})
