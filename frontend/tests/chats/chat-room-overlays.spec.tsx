/**
 * ChatRoomOverlays Tests — Phase 3 Ritual System
 *
 * Test cases covered:
 * - TC-F-18: sonicPing:incoming DOM event shows overlay with sender name
 * - TC-F-19: ritual:incoming DOM event shows correct overlay text per ritual type
 * - TC-F-20: Overlay auto-dismisses after 1600 ms (timer-based)
 * - TC-F-21: Rapid successive events restart the dismiss timer (debounce behaviour)
 * - TC-F-22: Overlay is removed from DOM on unmount (no timer leak)
 */

import { render, screen, act } from "@testing-library/react"
import React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// ---------------------------------------------------------------------------
// Use fake timers so we can control setTimeout precisely
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Mock motion/react — render without animation overhead
// ---------------------------------------------------------------------------

vi.mock("motion/react", () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
            <div {...props}>{children}</div>
        ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ---------------------------------------------------------------------------
// Lazy import (ensures mocks are applied before module evaluation)
// ---------------------------------------------------------------------------

let ChatRoomOverlays: React.ComponentType

beforeEach(async () => {
    try {
        const mod = await import("@/components/chats/ChatRoomOverlays")
        ChatRoomOverlays = mod.ChatRoomOverlays as React.ComponentType
    } catch {
        ChatRoomOverlays = () => <div data-testid="not-implemented">Not implemented</div>
    }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dispatchSonicPing(senderName: string, conversationId = "conv-001") {
    window.dispatchEvent(
        new CustomEvent("sonicPing:incoming", {
            detail: { conversationId, senderName },
        })
    )
}

function dispatchRitual(ritualType: string, senderName = "Bob Wang", conversationId = "conv-001") {
    window.dispatchEvent(
        new CustomEvent("ritual:incoming", {
            detail: { conversationId, senderName, ritualType },
        })
    )
}

// ---------------------------------------------------------------------------
// TC-F-18: sonicPing:incoming shows overlay
// ---------------------------------------------------------------------------

describe("TC-F-18: sonicPing:incoming DOM event shows overlay", () => {
    it("renders sonic ping overlay with 'Anybody home?' text on event", () => {
        render(<ChatRoomOverlays />)

        act(() => {
            dispatchSonicPing("Alice Chen")
        })

        expect(screen.getByText("Anybody home?")).toBeInTheDocument()
        expect(screen.getByLabelText("Alice Chen sent a Sonic Ping")).toBeInTheDocument()
    })

    it("does not render overlay before any event fires", () => {
        render(<ChatRoomOverlays />)

        expect(screen.queryByText("Anybody home?")).not.toBeInTheDocument()
    })

    it("cleans up the event listener on unmount (no stale listener)", () => {
        const { unmount } = render(<ChatRoomOverlays />)
        unmount()

        // Dispatching after unmount should not throw and should not show overlay
        act(() => {
            dispatchSonicPing("Ghost Sender")
        })
        // No overlay element remains in document after unmount
        expect(document.querySelector(".sonic-incoming-overlay")).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-19: ritual:incoming shows correct text per ritual type
// ---------------------------------------------------------------------------

describe("TC-F-19: ritual:incoming shows correct overlay text per ritual type", () => {
    const EXPECTED_TEXTS: Record<string, string> = {
        APOLOGY: "嗚嗚嗚…",
        CELEBRATE: "🎉🎉🎉",
        TAUNT: "哈哈哈！",
        LONGING: "想你了…",
        QUESTION: "幹嘛？",
        REJECTION: "不要！",
    }

    for (const [ritualType, expectedText] of Object.entries(EXPECTED_TEXTS)) {
        it(`${ritualType}: shows "${expectedText}" and sender name`, () => {
            render(<ChatRoomOverlays />)

            act(() => {
                dispatchRitual(ritualType, "Carol Lin")
            })

            expect(screen.getByText(expectedText)).toBeInTheDocument()
            expect(screen.getByText("Carol Lin")).toBeInTheDocument()
        })
    }

    it("unknown ritual type: shows nothing (graceful no-op)", () => {
        render(<ChatRoomOverlays />)

        act(() => {
            dispatchRitual("UNKNOWN_RITUAL", "Bob")
        })

        // No overlay should appear for an unknown type
        expect(document.querySelector(".sonic-incoming-overlay")).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-20: Overlay auto-dismisses after 1600 ms
// ---------------------------------------------------------------------------

describe("TC-F-20: overlay auto-dismisses after 1600 ms", () => {
    it("hides sonic ping overlay after 1600 ms", () => {
        render(<ChatRoomOverlays />)

        act(() => {
            dispatchSonicPing("Alice Chen")
        })

        expect(screen.getByText("Anybody home?")).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(1600)
        })

        expect(screen.queryByText("Anybody home?")).not.toBeInTheDocument()
    })

    it("hides ritual overlay after 1600 ms", () => {
        render(<ChatRoomOverlays />)

        act(() => {
            dispatchRitual("APOLOGY", "Bob Wang")
        })

        expect(screen.getByText("嗚嗚嗚…")).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(1600)
        })

        expect(screen.queryByText("嗚嗚嗚…")).not.toBeInTheDocument()
    })

    it("overlay still visible at 1599 ms (not prematurely dismissed)", () => {
        render(<ChatRoomOverlays />)

        act(() => {
            dispatchSonicPing("Alice Chen")
        })

        act(() => {
            vi.advanceTimersByTime(1599)
        })

        expect(screen.getByText("Anybody home?")).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-21: Rapid successive events restart the dismiss timer
// ---------------------------------------------------------------------------

describe("TC-F-21: rapid successive sonicPing events restart dismiss timer", () => {
    it("second event at 1000 ms resets timer — overlay persists until 2600 ms total", () => {
        render(<ChatRoomOverlays />)

        act(() => {
            dispatchSonicPing("Alice")
        })

        // Advance to 1000 ms (overlay still visible, timer not expired)
        act(() => {
            vi.advanceTimersByTime(1000)
        })

        // Fire a second event — should restart the 1600 ms countdown
        act(() => {
            dispatchSonicPing("Alice")
        })

        // At 2500 ms total (1000 + 1500), should still be showing
        act(() => {
            vi.advanceTimersByTime(1500)
        })
        expect(screen.getByText("Anybody home?")).toBeInTheDocument()

        // At 2600 ms total (1000 + 1600), should be gone
        act(() => {
            vi.advanceTimersByTime(100)
        })
        expect(screen.queryByText("Anybody home?")).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-22: No timer leak on unmount
// ---------------------------------------------------------------------------

describe("TC-F-22: no timer leak on unmount", () => {
    it("clears pending dismiss timer when component unmounts", () => {
        const clearTimeoutSpy = vi.spyOn(window, "clearTimeout")

        const { unmount } = render(<ChatRoomOverlays />)

        act(() => {
            dispatchSonicPing("Alice")
        })

        // Timer is running — unmount before it fires
        unmount()

        // clearTimeout should have been called (timer cleaned up)
        expect(clearTimeoutSpy).toHaveBeenCalled()

        // Advancing time after unmount should not throw
        act(() => {
            vi.advanceTimersByTime(2000)
        })
    })
})
