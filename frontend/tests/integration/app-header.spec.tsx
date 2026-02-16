/**
 * AppHeader Integration Tests
 *
 * Capsule morphing header state model (single headerExpanded field):
 *
 *   mouseEnter  → headerExpanded = true
 *   mouseLeave  → headerExpanded = false  (always collapses)
 *   logo click  → toggle headerExpanded
 *   scroll down → minimal state, overrides expanded
 *
 * Priority order for effectiveState:
 *   scroll-down  >  headerExpanded  >  default
 */

import { render, fireEvent, act, waitFor } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi } from "vitest"

import AppHeader from "@/components/shared/AppHeader"
import { AestheticModeProvider } from "@/contexts/aesthetic-mode-context"
import { uiStore } from "@/stores/uiStore"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockScrollDirection = vi.fn(() => "up")

vi.mock("@/lib/auth-client", () => ({
    useSession: () => ({ data: null, isPending: false }),
    signOut: vi.fn(),
}))

vi.mock("@/hooks/useScrollDirection", () => ({
    useScrollDirection: () => mockScrollDirection(),
}))

vi.mock("@/components/shared/UserStatusAvatar", () => ({
    UserStatusAvatar: () => <span data-testid="user-avatar" />,
}))

vi.mock("@/components/shared/AestheticModeToggle", () => ({
    AestheticModeToggle: () => <button data-testid="aesthetic-toggle">Aesthetic</button>,
}))

vi.mock("@/components/shared/ThemeToggle", () => ({
    ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}))

vi.mock("@/components/shared/SoundWaveLoader", () => ({
    SoundWaveLoader: () => <span data-testid="loader" />,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHeader() {
    return render(
        <AestheticModeProvider>
            <AppHeader />
        </AestheticModeProvider>
    )
}

function getHeader(container: HTMLElement) {
    return container.querySelector("header")!
}

/**
 * Fire a realistic mouseleave that passes the bounding-box guard in AppHeader.
 *
 * AppHeader checks: if clientX/Y is still inside getBoundingClientRect(), skip.
 * In jsdom, getBoundingClientRect() always returns {top:0,right:0,bottom:0,left:0},
 * so any clientX > 0 or clientY > 0 is "outside" the zero-width/height rect.
 * We also provide a relatedTarget so it isn't filtered by the old null-guard path.
 */
function fireRealMouseLeave(element: Element) {
    fireEvent.mouseLeave(element, { clientX: 9999, clientY: 9999, relatedTarget: document.body })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AppHeader – capsule state binding", () => {
    beforeEach(() => {
        mockScrollDirection.mockReturnValue("up")
        act(() => {
            uiStore.setState(() => ({ headerExpanded: false, isViewTransitioning: false }))
        })
        vi.clearAllMocks()
        mockScrollDirection.mockReturnValue("up")
    })

    /**
     * T-01: mouseEnter sets headerExpanded to true
     */
    it("should set headerExpanded on mouseEnter", async () => {
        const { container } = renderHeader()
        const header = getHeader(container)

        act(() => {
            fireEvent.mouseEnter(header)
        })

        await waitFor(() => {
            expect(uiStore.state.headerExpanded).toBe(true)
            expect(header).toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-02: mouseLeave clears headerExpanded — header collapses
     */
    it("should clear headerExpanded and collapse on mouseLeave", async () => {
        const { container } = renderHeader()
        const header = getHeader(container)

        act(() => {
            fireEvent.mouseEnter(header)
        })
        await waitFor(() => expect(uiStore.state.headerExpanded).toBe(true))

        act(() => {
            fireRealMouseLeave(header)
        })

        await waitFor(() => {
            expect(uiStore.state.headerExpanded).toBe(false)
            expect(header).not.toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-03: Logo click CLOSES the header (toggles headerExpanded false)
     */
    it("should close the header when logo is clicked while expanded", async () => {
        const { container } = renderHeader()
        const header = getHeader(container)

        act(() => {
            fireEvent.mouseEnter(header)
        })
        await waitFor(() => expect(uiStore.state.headerExpanded).toBe(true))

        const logoBtn = container.querySelector(".capsule-header__logo")!
        act(() => {
            fireEvent.click(logoBtn)
        })

        await waitFor(() => {
            expect(uiStore.state.headerExpanded).toBe(false)
            expect(header).not.toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-04: Logo click OPENS the header when collapsed
     */
    it("should open the header when logo is clicked while collapsed", async () => {
        const { container } = renderHeader()
        const header = getHeader(container)

        expect(uiStore.state.headerExpanded).toBe(false)

        const logoBtn = container.querySelector(".capsule-header__logo")!
        act(() => {
            fireEvent.click(logoBtn)
        })

        await waitFor(() => {
            expect(uiStore.state.headerExpanded).toBe(true)
            expect(header).toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-05: mouseLeave always collapses — no sticky pin behavior
     */
    it("should collapse header on mouseLeave even after logo-click open", async () => {
        const { container } = renderHeader()
        const header = getHeader(container)

        // Open via logo click
        const logoBtn = container.querySelector(".capsule-header__logo")!
        act(() => {
            fireEvent.click(logoBtn)
        })
        await waitFor(() => expect(uiStore.state.headerExpanded).toBe(true))

        // Mouse leaves — simplified model always collapses on mouseLeave
        act(() => {
            fireRealMouseLeave(header)
        })

        await waitFor(() => {
            expect(uiStore.state.headerExpanded).toBe(false)
            expect(header).not.toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-06: logo aria-expanded mirrors uiStore.headerExpanded
     */
    it("should reflect uiStore.headerExpanded in logo aria-expanded", async () => {
        const { container } = renderHeader()
        const logoBtn = container.querySelector(".capsule-header__logo")!

        expect(logoBtn).toHaveAttribute("aria-expanded", "false")

        act(() => {
            uiStore.setState((s) => ({ ...s, headerExpanded: true }))
        })

        await waitFor(() => expect(logoBtn).toHaveAttribute("aria-expanded", "true"))
    })

    /**
     * T-07: Header stays collapsed when headerExpanded is false
     */
    it("should not show expanded class when headerExpanded is false", async () => {
        const { container } = renderHeader()
        const header = getHeader(container)

        await waitFor(() => {
            expect(uiStore.state.headerExpanded).toBe(false)
            expect(header).not.toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-08: After logo closes, re-hovering opens the header again
     */
    it("should re-open on mouseEnter after being explicitly closed via logo", async () => {
        const { container } = renderHeader()
        const header = getHeader(container)
        const logoBtn = container.querySelector(".capsule-header__logo")!

        act(() => {
            fireEvent.mouseEnter(header)
        })
        await waitFor(() => expect(uiStore.state.headerExpanded).toBe(true))

        act(() => {
            fireEvent.click(logoBtn)
        })
        await waitFor(() => expect(uiStore.state.headerExpanded).toBe(false))

        act(() => {
            fireEvent.mouseEnter(header)
        })

        await waitFor(() => {
            expect(uiStore.state.headerExpanded).toBe(true)
            expect(header).toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-09: Scroll DOWN applies minimal class — overrides expanded state
     */
    it("should show minimal class on scroll-down, overriding expanded state", async () => {
        const { container, rerender } = render(
            <AestheticModeProvider>
                <AppHeader />
            </AestheticModeProvider>
        )

        const header = getHeader(container)

        act(() => {
            fireEvent.mouseEnter(header)
        })
        await waitFor(() => expect(header).toHaveClass("capsule-header--expanded"))

        mockScrollDirection.mockReturnValue("down")
        rerender(
            <AestheticModeProvider>
                <AppHeader />
            </AestheticModeProvider>
        )

        await waitFor(() => {
            expect(header).toHaveClass("capsule-header--minimal")
            expect(header).not.toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-10: Scroll DOWN also overrides logo-click expanded state
     */
    it("should show minimal class on scroll-down even when logo-opened", async () => {
        const { container, rerender } = render(
            <AestheticModeProvider>
                <AppHeader />
            </AestheticModeProvider>
        )

        const header = getHeader(container)

        const logoBtn = container.querySelector(".capsule-header__logo")!
        act(() => {
            fireEvent.click(logoBtn)
        })
        await waitFor(() => expect(uiStore.state.headerExpanded).toBe(true))

        mockScrollDirection.mockReturnValue("down")
        rerender(
            <AestheticModeProvider>
                <AppHeader />
            </AestheticModeProvider>
        )

        await waitFor(() => {
            expect(header).toHaveClass("capsule-header--minimal")
            expect(header).not.toHaveClass("capsule-header--expanded")
        })
    })

    /**
     * T-12: mouseleave during a View Transition does NOT collapse the header
     *
     * When isViewTransitioning is true, the onMouseLeave handler must be a no-op
     * so that synthetic mouseleave events fired by the browser during DOM freeze
     * do not collapse the expanded header.
     */
    it("should not collapse header on mouseleave during a View Transition", async () => {
        const { container } = renderHeader()
        const header = getHeader(container)

        // Expand the header first
        act(() => {
            fireEvent.mouseEnter(header)
        })
        await waitFor(() => expect(uiStore.state.headerExpanded).toBe(true))

        // Simulate a View Transition starting
        act(() => {
            uiStore.setState((s) => ({ ...s, isViewTransitioning: true }))
        })

        // Fire a real-looking mouseleave (same as fireRealMouseLeave)
        act(() => {
            fireRealMouseLeave(header)
        })

        // headerExpanded must remain true — the guard blocked the collapse
        await waitFor(() => {
            expect(uiStore.state.headerExpanded).toBe(true)
            expect(header).toHaveClass("capsule-header--expanded")
        })
    })
})
