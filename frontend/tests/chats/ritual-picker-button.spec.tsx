/**
 * RitualPickerButton Tests — Phase 3 Ritual System
 *
 * Test cases covered:
 * - TC-F-23: Trigger button renders with correct aria attributes
 * - TC-F-24: Clicking trigger opens the picker popover (aria-expanded=true)
 * - TC-F-25: All 6 ritual items appear in the picker with correct labels
 * - TC-F-26: Clicking a ritual item fires the sendRitual mutation
 * - TC-F-27: Picker closes after selecting a ritual
 * - TC-F-28: Click outside closes the picker
 * - TC-F-29: Clicking trigger again closes the picker (toggle behaviour)
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { describe, it, expect, beforeEach, vi } from "vitest"

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// graphqlFetch — we control what the mutation resolves to
const mockGraphqlFetch = vi.fn()

vi.mock("@/lib/graphql-client", () => ({
    graphqlFetch: (...args: unknown[]) => mockGraphqlFetch(...args),
}))

vi.mock("@/graphql/options/conversations", () => ({
    SEND_RITUAL_MUTATION:
        "mutation SendRitual($conversationId: ID!, $ritualType: RitualType!) { sendRitual { id } }",
    conversationsQueryOptions: {
        queryKey: ["conversations"],
        queryFn: async () => [],
    },
    MARK_READ_MUTATION: "",
    conversationQueryOptions: () => ({
        queryKey: ["conversation", "test"],
        queryFn: async () => null,
    }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
            mutations: { retry: false },
        },
    })
}

let RitualPickerButton: React.ComponentType<{ conversationId: string }>

beforeEach(async () => {
    vi.clearAllMocks()
    mockGraphqlFetch.mockResolvedValue({ sendRitual: { id: "msg-ritual-001" } })

    try {
        const mod = await import("@/components/chats/RitualPickerButton")
        RitualPickerButton = mod.RitualPickerButton as typeof RitualPickerButton
    } catch {
        RitualPickerButton = () => <div data-testid="not-implemented">Not implemented</div>
    }
})

function renderPicker(conversationId = "conv-001") {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <RitualPickerButton conversationId={conversationId} />
        </QueryClientProvider>
    )
}

// ---------------------------------------------------------------------------
// TC-F-23: Trigger button aria attributes
// ---------------------------------------------------------------------------

describe("TC-F-23: trigger button renders with correct aria attributes", () => {
    it("has aria-label='Send a ritual' and aria-expanded=false initially", () => {
        renderPicker()

        const trigger = screen.getByRole("button", { name: "Send a ritual" })
        expect(trigger).toBeInTheDocument()
        expect(trigger).toHaveAttribute("aria-expanded", "false")
    })
})

// ---------------------------------------------------------------------------
// TC-F-24: Clicking trigger opens picker
// ---------------------------------------------------------------------------

describe("TC-F-24: clicking trigger button opens the ritual picker", () => {
    it("renders the picker menu with role=menu on click", async () => {
        renderPicker()

        const trigger = screen.getByRole("button", { name: "Send a ritual" })
        await userEvent.click(trigger)

        expect(screen.getByRole("menu", { name: "Choose a ritual" })).toBeInTheDocument()
        expect(trigger).toHaveAttribute("aria-expanded", "true")
    })

    it("picker is hidden before the trigger is clicked", () => {
        renderPicker()

        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-25: All 6 ritual items appear with correct labels
// ---------------------------------------------------------------------------

describe("TC-F-25: all 6 ritual items appear in the picker", () => {
    const EXPECTED_LABELS = ["道歉", "恭喜", "嗆聲", "思念", "疑問", "拒絕"]

    it("renders all 6 ritual menuitem buttons with correct Chinese labels", async () => {
        renderPicker()

        const trigger = screen.getByRole("button", { name: "Send a ritual" })
        await userEvent.click(trigger)

        for (const label of EXPECTED_LABELS) {
            expect(screen.getByRole("menuitem", { name: label })).toBeInTheDocument()
        }
    })
})

// ---------------------------------------------------------------------------
// TC-F-26: Clicking a ritual fires the mutation
// ---------------------------------------------------------------------------

describe("TC-F-26: selecting a ritual fires sendRitual mutation", () => {
    it("calls graphqlFetch with correct conversationId and ritualType for 道歉 (APOLOGY)", async () => {
        renderPicker("conv-xyz")

        const trigger = screen.getByRole("button", { name: "Send a ritual" })
        await userEvent.click(trigger)

        const apologyBtn = screen.getByRole("menuitem", { name: "道歉" })
        await userEvent.click(apologyBtn)

        await waitFor(() => {
            expect(mockGraphqlFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    conversationId: "conv-xyz",
                    ritualType: "APOLOGY",
                })
            )
        })
    })

    it("calls graphqlFetch with REJECTION for 拒絕", async () => {
        renderPicker("conv-abc")

        await userEvent.click(screen.getByRole("button", { name: "Send a ritual" }))
        await userEvent.click(screen.getByRole("menuitem", { name: "拒絕" }))

        await waitFor(() => {
            expect(mockGraphqlFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    conversationId: "conv-abc",
                    ritualType: "REJECTION",
                })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// TC-F-27: Picker closes after selecting a ritual
// ---------------------------------------------------------------------------

describe("TC-F-27: picker closes immediately after ritual is selected", () => {
    it("removes the picker menu from DOM after selection", async () => {
        renderPicker()

        await userEvent.click(screen.getByRole("button", { name: "Send a ritual" }))
        expect(screen.getByRole("menu")).toBeInTheDocument()

        await userEvent.click(screen.getByRole("menuitem", { name: "恭喜" }))

        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Send a ritual" })).toHaveAttribute(
            "aria-expanded",
            "false"
        )
    })
})

// ---------------------------------------------------------------------------
// TC-F-28: Click outside closes the picker
// ---------------------------------------------------------------------------

describe("TC-F-28: clicking outside the container closes the picker", () => {
    it("hides picker on mousedown outside the component root", async () => {
        renderPicker()

        await userEvent.click(screen.getByRole("button", { name: "Send a ritual" }))
        expect(screen.getByRole("menu")).toBeInTheDocument()

        // Mousedown on the document body (outside the picker container)
        fireEvent.mouseDown(document.body)

        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-29: Toggle behaviour — second click closes picker
// ---------------------------------------------------------------------------

describe("TC-F-29: clicking trigger again closes the picker (toggle)", () => {
    it("opens then closes on two consecutive trigger clicks", async () => {
        renderPicker()

        const trigger = screen.getByRole("button", { name: "Send a ritual" })

        await userEvent.click(trigger)
        expect(screen.getByRole("menu")).toBeInTheDocument()

        await userEvent.click(trigger)
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute("aria-expanded", "false")
    })
})
