/**
 * MessageBubbleWrapper Tests — Feature 1.3.3 Frontend Web
 *
 * Test cases covered:
 * - TC-F-A1: Hover over bubble wrapper shows action icons (opacity change)
 * - TC-F-A2: Right-click sets contextMenuPos and renders MessageContextMenu
 * - TC-F-A3: Escape key closes context menu
 * - TC-F-A4: Copy action calls navigator.clipboard.writeText
 * - TC-F-A5: Select action toggles chatActionsStore.selectedMessageIds
 * - TC-F-A6: ReplyQuoteBlock renders correct border for own vs other-user messages
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

import type { Message } from "@/types/conversations"

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("motion/react", () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
            <div {...props}>{children}</div>
        ),
        span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
            <span {...props}>{children}</span>
        ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/contexts/aesthetic-mode-context", () => ({
    useAestheticMode: () => ({
        mode: "ornate",
        isOrnate: true,
        isMinimal: false,
        setMode: vi.fn(),
    }),
    AestheticModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/lib/graphql-client", () => ({
    graphqlFetch: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/hooks/useTyping", () => ({
    useTyping: () => ({ onKeyStroke: vi.fn() }),
}))

// ---------------------------------------------------------------------------
// Clipboard mock
// ---------------------------------------------------------------------------

const clipboardWriteText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
        writable: true,
        configurable: true,
        value: { writeText: clipboardWriteText },
    })
})

afterEach(() => {
    vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Test data fixtures
// ---------------------------------------------------------------------------

const mockMessage: Message = {
    id: "msg-1",
    conversationId: "conv-1",
    sender: {
        id: "alice-id",
        name: "Alice",
        email: "alice@test.com",
        image: null,
        isOnline: true,
    },
    content: "Hello World",
    messageType: "TEXT",
    imageUrl: null,
    createdAt: new Date().toISOString(),
    status: "SENT",
    replyTo: null,
    pinnedAt: null,
    deletedAt: null,
}

// ---------------------------------------------------------------------------
// Helper wrapper
// ---------------------------------------------------------------------------

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
        },
    })
}

let MessageBubbleWrapper: React.ComponentType<{
    message: Message
    isOwn: boolean
    conversationId: string
    currentUserId: string
    isPending?: boolean
    shouldAnimate?: boolean
}>

let ReplyQuoteBlock: React.ComponentType<{
    replyTo: {
        id: string
        content: string | null
        sender: { id: string; name: string | null }
        deletedAt: string | null
    }
    currentUserId: string
    onScrollToMessage: (id: string) => void
}>

beforeEach(async () => {
    try {
        const mod = await import("@/components/chats/MessageBubbleWrapper")
        MessageBubbleWrapper = mod.MessageBubbleWrapper as typeof MessageBubbleWrapper
    } catch {
        MessageBubbleWrapper = () => <div data-testid="not-implemented">Not implemented</div>
    }

    try {
        const mod = await import("@/components/chats/ReplyQuoteBlock")
        ReplyQuoteBlock = mod.ReplyQuoteBlock as typeof ReplyQuoteBlock
    } catch {
        ReplyQuoteBlock = () => <div data-testid="not-implemented-rqb">Not implemented</div>
    }
})

// ---------------------------------------------------------------------------
// TC-F-A1: Hover shows action icons
// ---------------------------------------------------------------------------

describe("TC-F-A1: Wrapper renders; hover cluster removed (right-click only)", () => {
    it("should render the wrapper and NOT render a hover action cluster", async () => {
        const qc = makeQueryClient()
        render(
            <QueryClientProvider client={qc}>
                <MessageBubbleWrapper
                    message={mockMessage}
                    isOwn={false}
                    conversationId="conv-1"
                    currentUserId="alice-id"
                />
            </QueryClientProvider>
        )

        // The bubble wrapper should be present
        const wrapper = screen.getByTestId("message-bubble-wrapper-msg-1")
        expect(wrapper).toBeDefined()

        // Hover cluster is removed — only context menu (right-click) is the action trigger
        expect(screen.queryByTestId("message-action-cluster-msg-1")).toBeNull()
        expect(screen.queryByRole("button", { name: "Reply" })).toBeNull()
        expect(screen.queryByRole("button", { name: "Copy" })).toBeNull()
        expect(screen.queryByRole("button", { name: "Forward" })).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// TC-F-A2: Right-click renders context menu
// ---------------------------------------------------------------------------

describe("TC-F-A2: Right-click opens context menu", () => {
    it("should render role=menu after contextmenu event", () => {
        const qc = makeQueryClient()
        render(
            <QueryClientProvider client={qc}>
                <MessageBubbleWrapper
                    message={mockMessage}
                    isOwn={false}
                    conversationId="conv-1"
                    currentUserId="alice-id"
                />
            </QueryClientProvider>
        )

        const wrapper = screen.getByTestId("message-bubble-wrapper-msg-1")

        fireEvent.contextMenu(wrapper, { clientX: 300, clientY: 200 })

        const menu = screen.getByRole("menu")
        expect(menu).toBeDefined()

        // Should have action items including reply, copy, forward, select, pin, delete
        const items = screen.getAllByRole("menuitem")
        expect(items.length).toBeGreaterThanOrEqual(5)
    })

    it("should clamp menu position to viewport", () => {
        const qc = makeQueryClient()
        render(
            <QueryClientProvider client={qc}>
                <MessageBubbleWrapper
                    message={mockMessage}
                    isOwn={false}
                    conversationId="conv-1"
                    currentUserId="alice-id"
                />
            </QueryClientProvider>
        )

        const wrapper = screen.getByTestId("message-bubble-wrapper-msg-1")

        // Fire at a position beyond the right edge
        fireEvent.contextMenu(wrapper, { clientX: 1300, clientY: 800 })

        const menu = screen.getByRole("menu")
        const menuLeft = parseInt(menu.style.left, 10)
        const menuTop = parseInt(menu.style.top, 10)

        // Menu should be clamped: left <= innerWidth - menuWidth - 8
        expect(menuLeft).toBeLessThanOrEqual(window.innerWidth - 8)
        expect(menuTop).toBeLessThanOrEqual(window.innerHeight - 8)
    })
})

// ---------------------------------------------------------------------------
// TC-F-A3: Escape closes context menu
// ---------------------------------------------------------------------------

describe("TC-F-A3: Escape key closes context menu", () => {
    it("should remove menu from DOM when Escape is pressed", () => {
        const qc = makeQueryClient()
        render(
            <QueryClientProvider client={qc}>
                <MessageBubbleWrapper
                    message={mockMessage}
                    isOwn={false}
                    conversationId="conv-1"
                    currentUserId="alice-id"
                />
            </QueryClientProvider>
        )

        const wrapper = screen.getByTestId("message-bubble-wrapper-msg-1")
        fireEvent.contextMenu(wrapper, { clientX: 300, clientY: 200 })

        // Menu is open
        expect(screen.getByRole("menu")).toBeDefined()

        // Press Escape on the menu element itself
        const menu = screen.getByRole("menu")
        fireEvent.keyDown(menu, { key: "Escape", code: "Escape" })

        // Menu should be gone
        expect(screen.queryByRole("menu")).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// TC-F-A4: Copy action writes to clipboard
// ---------------------------------------------------------------------------

describe("TC-F-A4: Copy action calls clipboard.writeText", () => {
    it("should call navigator.clipboard.writeText with message content", async () => {
        const qc = makeQueryClient()
        render(
            <QueryClientProvider client={qc}>
                <MessageBubbleWrapper
                    message={mockMessage}
                    isOwn={false}
                    conversationId="conv-1"
                    currentUserId="alice-id"
                />
            </QueryClientProvider>
        )

        const wrapper = screen.getByTestId("message-bubble-wrapper-msg-1")
        fireEvent.contextMenu(wrapper, { clientX: 300, clientY: 200 })

        const copyItem = screen.getByRole("menuitem", { name: /複製|copy/i })
        fireEvent.click(copyItem)

        expect(clipboardWriteText).toHaveBeenCalledWith("Hello World")
    })
})

// ---------------------------------------------------------------------------
// TC-F-A5: Select action sets multi-select mode
// ---------------------------------------------------------------------------

describe("TC-F-A5: Select action enters multi-select mode", () => {
    it("should set isMultiSelectMode=true and add message to selectedMessageIds", async () => {
        // Reset store to clean state
        const { chatStore, exitMultiSelect } = await import("@/stores/chatStore")
        exitMultiSelect()

        const qc = makeQueryClient()
        render(
            <QueryClientProvider client={qc}>
                <MessageBubbleWrapper
                    message={mockMessage}
                    isOwn={false}
                    conversationId="conv-1"
                    currentUserId="alice-id"
                />
            </QueryClientProvider>
        )

        const wrapper = screen.getByTestId("message-bubble-wrapper-msg-1")
        fireEvent.contextMenu(wrapper, { clientX: 300, clientY: 200 })

        const selectItem = screen.getByRole("menuitem", { name: /選取|select/i })
        fireEvent.click(selectItem)

        const state = chatStore.state
        expect(state.isMultiSelectMode).toBe(true)
        expect(state.selectedMessageIds.has("msg-1")).toBe(true)

        // Cleanup
        exitMultiSelect()
    })
})

// ---------------------------------------------------------------------------
// TC-F-A6: ReplyQuoteBlock border direction
// ---------------------------------------------------------------------------

describe("TC-F-A6: ReplyQuoteBlock border color by sender perspective", () => {
    it("scenario A: quoted other user message → NOT muted (primary border)", () => {
        render(
            <ReplyQuoteBlock
                replyTo={{
                    id: "msg-1",
                    content: "Hello World from Bob",
                    sender: { id: "bob-id", name: "Bob" },
                    deletedAt: null,
                }}
                currentUserId="alice-id"
                onScrollToMessage={vi.fn()}
            />
        )

        // When quoted sender (bob) !== currentUser (alice) → isQuotedOtherUser=true → no --muted class
        const block = screen.getByRole("button", { name: /jump to original message/i })
        expect(block).toBeDefined()
        expect(block.classList.contains("bubble-quote-block--muted")).toBe(false)

        // Sender name is shown
        expect(screen.getByText("Bob")).toBeDefined()
    })

    it("scenario B: quoted own message → muted border", () => {
        render(
            <ReplyQuoteBlock
                replyTo={{
                    id: "msg-0",
                    content: "My own earlier message",
                    sender: { id: "alice-id", name: "Alice" },
                    deletedAt: null,
                }}
                currentUserId="alice-id"
                onScrollToMessage={vi.fn()}
            />
        )

        const block = screen.getByRole("button", { name: /jump to original message/i })
        expect(block.classList.contains("bubble-quote-block--muted")).toBe(true)
    })

    it("should show deleted placeholder when replyTo.deletedAt is set", () => {
        render(
            <ReplyQuoteBlock
                replyTo={{
                    id: "msg-deleted",
                    content: null,
                    sender: { id: "bob-id", name: "Bob" },
                    deletedAt: new Date().toISOString(),
                }}
                currentUserId="alice-id"
                onScrollToMessage={vi.fn()}
            />
        )

        // Should render the deleted placeholder
        expect(screen.getByLabelText("Quoted message no longer available")).toBeDefined()
    })

    it("should show 'Unknown sender' when sender is null-like", () => {
        render(
            <ReplyQuoteBlock
                replyTo={{
                    id: "msg-no-sender",
                    content: "Some message",
                    sender: { id: "unknown", name: null },
                    deletedAt: null,
                }}
                currentUserId="alice-id"
                onScrollToMessage={vi.fn()}
            />
        )

        expect(screen.getByText("Unknown sender")).toBeDefined()
    })
})
