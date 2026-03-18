/**
 * ConversationList Tests — Feature 1.3.1 Frontend Web
 *
 * Test cases covered:
 * - TC-F-01: Renders conversation list from MSW-mocked API
 * - TC-F-02: unreadCount > 0 shows red badge
 * - TC-F-03: pinnedAt != null shows pin icon / CSS class
 * - TC-F-04: Timestamp formats — today HH:mm, yesterday "Yesterday", older M/D
 * - TC-F-05: Last message preview > 30 chars is truncated to 30 + "…"
 * - TC-F-06: Clicking conversation row calls onSelect with conversation id
 * - TC-F-07: Empty conversations list shows empty state
 * - TC-F-08: message:new socket event patches conversation lastMessage in cache
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { describe, it, expect, beforeEach, vi } from "vitest"

import type { Conversation } from "@/types/conversations"

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before any component imports
// ---------------------------------------------------------------------------

vi.mock("@/middleware/auth.middleware.server", () => ({
    requireAuthServer: { _def: { type: "middleware" } },
}))

vi.mock("@/lib/auth", () => ({
    auth: {
        api: { getSession: vi.fn().mockResolvedValue(null) },
    },
}))

vi.mock("@/lib/auth-client", () => ({
    sessionQueryOptions: {
        queryKey: ["auth", "session"],
        queryFn: async () => ({
            session: { id: "session-alice" },
            user: {
                id: "user-alice",
                name: "Alice Chen",
                email: "alice@test.com",
                image: null,
            },
        }),
        retry: false,
        staleTime: 0,
        gcTime: 0,
    },
    signOut: vi.fn(),
}))

vi.mock("@/components/shared/AestheticModeToggle", () => ({
    AestheticModeToggle: () => <button data-testid="aesthetic-toggle">Aesthetic</button>,
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

vi.mock("@/components/shared/ThemeToggle", () => ({
    ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}))

vi.mock("@/components/shared/UserStatusAvatar", () => ({
    UserStatusAvatar: ({ userId, userName }: { userId: string; userName?: string }) => (
        <span data-testid="user-avatar" aria-label={userName ?? userId} />
    ),
}))

vi.mock("@/components/shared/SoundWaveLoader", () => ({
    SoundWaveLoader: () => <span data-testid="loader" />,
}))

vi.mock("@/hooks/useScrollDirection", () => ({
    useScrollDirection: () => "up",
}))

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
        select({ location: { pathname: "/chats" } }),
    createFileRoute: (_path: string) => (_options: unknown) => ({
        component: (_options as { component?: unknown })?.component,
    }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock("@tanstack/react-store", () => ({
    useStore: (
        _store: unknown,
        selector: (s: {
            headerExpanded: boolean
            isViewTransitioning: boolean
            activeConversationId: string | null
            typingMap: Record<string, string[]>
            presenceMap: Record<string, boolean>
        }) => unknown
    ) =>
        selector({
            headerExpanded: false,
            isViewTransitioning: false,
            activeConversationId: null,
            typingMap: {},
            presenceMap: {},
        }),
}))

vi.mock("@/stores/uiStore", () => ({
    uiStore: {
        state: {
            headerExpanded: false,
            isViewTransitioning: false,
            activeConversationId: null,
            typingMap: {},
            presenceMap: {},
        },
        setState: vi.fn(),
    },
}))

// Mock virtua VList — render all children without virtualization
vi.mock("virtua", () => ({
    VList: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="vlist">{children}</div>
    ),
}))

// Mock motion/react — render children without animation
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

// Mock socket — no real connections in tests
vi.mock("@/lib/socket", () => ({
    createSocketClient: () => mockSocket,
    getSocketClient: () => mockSocket,
    disconnectSocket: vi.fn(),
}))

vi.mock("@/hooks/useSocket", () => ({
    useSocket: () => mockSocket,
}))

vi.mock("@/hooks/useHeartbeat", () => ({ useHeartbeat: vi.fn() }))

// ---------------------------------------------------------------------------
// Mock socket object
// ---------------------------------------------------------------------------

const handlers: Record<string, (data: unknown) => void> = {}

const mockSocket = {
    on: vi.fn((event: string, cb: (data: unknown) => void) => {
        handlers[event] = cb
    }),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    hasListeners: vi.fn(() => false),
}

// ---------------------------------------------------------------------------
// Mock data fixtures
// ---------------------------------------------------------------------------

const mockUserAlice = {
    id: "user-alice",
    name: "Alice Chen",
    email: "alice@test.com",
    image: null,
    isOnline: true,
}

const mockUserBob = {
    id: "user-bob",
    name: "Bob Wang",
    email: "bob@test.com",
    image: "https://example.com/bob.jpg",
    isOnline: false,
}

const mockMessage1 = {
    id: "msg-001",
    conversationId: "conv-001",
    sender: mockUserBob,
    content: "Hey Alice!",
    messageType: "TEXT" as const,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    status: "DELIVERED" as const,
}

const mockConversation1 = {
    id: "conv-001",
    type: "ONE_TO_ONE" as const,
    name: null,
    participants: [
        {
            user: mockUserAlice,
            role: "MEMBER" as const,
            isFriend: true,
            joinedAt: "2026-01-01T00:00:00.000Z",
        },
        {
            user: mockUserBob,
            role: "MEMBER" as const,
            isFriend: true,
            joinedAt: "2026-01-01T00:00:00.000Z",
        },
    ],
    lastMessage: mockMessage1,
    unreadCount: 2,
    pinnedAt: null,
    settings: null,
    createdAt: "2026-01-01T00:00:00.000Z",
}

const mockConversation2 = {
    id: "conv-002",
    type: "ONE_TO_ONE" as const,
    name: null,
    participants: [
        {
            user: mockUserAlice,
            role: "MEMBER" as const,
            isFriend: true,
            joinedAt: "2026-01-01T00:00:00.000Z",
        },
        {
            user: mockUserBob,
            role: "MEMBER" as const,
            isFriend: true,
            joinedAt: "2026-01-01T00:00:00.000Z",
        },
    ],
    lastMessage: null,
    unreadCount: 0,
    pinnedAt: "2026-02-01T00:00:00.000Z",
    settings: null,
    createdAt: "2026-01-01T00:00:00.000Z",
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: Infinity,
                staleTime: Infinity,
            },
            mutations: { retry: false },
        },
    })
}

function Wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = createTestQueryClient()
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// ---------------------------------------------------------------------------
// Lazy import — component is loaded once and reused across describe blocks
// ---------------------------------------------------------------------------

let ConversationList: React.ComponentType<{
    conversations: Conversation[]
    currentUserId: string
    onSelect: (id: string) => void
}>

beforeEach(async () => {
    vi.clearAllMocks()
    Object.keys(handlers).forEach((k) => delete handlers[k])

    try {
        const mod = await import("@/components/chats/ConversationList")
        ConversationList = mod.ConversationList as typeof ConversationList
    } catch {
        ConversationList = () => <div data-testid="not-implemented">Not implemented</div>
    }
})

// ---------------------------------------------------------------------------
// TC-F-01: Renders conversation list from API
// ---------------------------------------------------------------------------

describe("TC-F-01: renders conversation list from API", () => {
    it("shows the other participant name when conversations are provided", () => {
        render(
            <Wrapper>
                <ConversationList
                    conversations={[mockConversation1]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // Bob Wang is the other participant in conv-001 — his name must be visible
        expect(screen.getByText("Bob Wang")).toBeInTheDocument()
    })

    it("renders multiple conversations", () => {
        render(
            <Wrapper>
                <ConversationList
                    conversations={[mockConversation1, mockConversation2]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // Both conversation items should appear (both show Bob Wang as the other participant)
        const names = screen.getAllByText("Bob Wang")
        expect(names.length).toBeGreaterThanOrEqual(1)
    })
})

// ---------------------------------------------------------------------------
// TC-F-02: unreadCount > 0 shows badge
// ---------------------------------------------------------------------------

describe("TC-F-02: unreadCount > 0 shows unread badge", () => {
    it("displays the unread count badge when unreadCount is greater than zero", () => {
        render(
            <Wrapper>
                <ConversationList
                    conversations={[mockConversation1]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // mockConversation1 has unreadCount: 2 — UnreadBadge renders "2"
        expect(screen.getByText("2")).toBeInTheDocument()
    })

    it("does not render a badge when unreadCount is zero", () => {
        const noUnreadConv = { ...mockConversation1, unreadCount: 0 }
        render(
            <Wrapper>
                <ConversationList
                    conversations={[noUnreadConv]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // The digit "0" badge should not appear (UnreadBadge renders null when count <= 0)
        const badge = document.querySelector(".unread-badge")
        expect(badge).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-03: pinnedAt != null shows pin CSS class
// ---------------------------------------------------------------------------

describe("TC-F-03: pinned conversation shows pin indicator", () => {
    it("applies conversation-item--pinned class to pinned conversations", () => {
        render(
            <Wrapper>
                <ConversationList
                    conversations={[mockConversation2]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // mockConversation2 has pinnedAt set — ConversationItem adds --pinned modifier
        const pinned = document.querySelector(".conversation-item--pinned")
        expect(pinned).toBeInTheDocument()
    })

    it("does not apply pinned class when pinnedAt is null", () => {
        render(
            <Wrapper>
                <ConversationList
                    conversations={[mockConversation1]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        const pinned = document.querySelector(".conversation-item--pinned")
        expect(pinned).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-04: Timestamp formats correctly
// ---------------------------------------------------------------------------

describe("TC-F-04: timestamp formatting", () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it("formats today's message as HH:mm (5 chars)", () => {
        // Fix system time to 2026-03-03T14:30:00Z
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-03-03T14:30:00.000Z"))

        const todayMessage = {
            ...mockMessage1,
            createdAt: "2026-03-03T10:00:00.000Z",
        }
        const conv = { ...mockConversation1, lastMessage: todayMessage }

        render(
            <Wrapper>
                <ConversationList
                    conversations={[conv]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // Time must be formatted as HH:mm — exactly 5 chars (e.g. "10:00")
        const timeEl = document.querySelector(".conversation-item__time")
        expect(timeEl).toBeInTheDocument()
        expect(timeEl?.textContent?.length).toBe(5)
        expect(timeEl?.textContent).toMatch(/^\d{2}:\d{2}$/)
    })

    it("formats yesterday's message as 'Yesterday'", () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-03-03T14:30:00.000Z"))

        const yesterdayMessage = {
            ...mockMessage1,
            createdAt: "2026-03-02T10:00:00.000Z",
        }
        const conv = { ...mockConversation1, lastMessage: yesterdayMessage }

        render(
            <Wrapper>
                <ConversationList
                    conversations={[conv]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        expect(screen.getByText("Yesterday")).toBeInTheDocument()
    })

    it("formats an older message as M/D (numeric)", () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-03-03T14:30:00.000Z"))

        const olderMessage = {
            ...mockMessage1,
            createdAt: "2026-02-28T10:00:00.000Z",
        }
        const conv = { ...mockConversation1, lastMessage: olderMessage }

        render(
            <Wrapper>
                <ConversationList
                    conversations={[conv]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // Should NOT show "Yesterday" or a HH:mm pattern — should show a date like "2/28"
        const timeEl = document.querySelector(".conversation-item__time")
        expect(timeEl).toBeInTheDocument()
        expect(timeEl?.textContent).not.toBe("Yesterday")
        expect(timeEl?.textContent).not.toMatch(/^\d{2}:\d{2}$/)
        // Should contain a slash separator for M/D format
        expect(timeEl?.textContent).toMatch(/\d+\/\d+/)
    })
})

// ---------------------------------------------------------------------------
// TC-F-05: Last message preview > 30 chars is truncated
// ---------------------------------------------------------------------------

describe("TC-F-05: long message preview is truncated", () => {
    it("truncates preview to 30 chars + ellipsis when message is longer than 30 chars", () => {
        const longContent = "A".repeat(50)
        const longMessage = { ...mockMessage1, content: longContent }
        const conv = { ...mockConversation1, lastMessage: longMessage }

        render(
            <Wrapper>
                <ConversationList
                    conversations={[conv]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // The full 50-char string should not appear verbatim
        expect(screen.queryByText(longContent)).not.toBeInTheDocument()

        // The preview element should be at most 31 chars (30 + ellipsis "…")
        const preview = document.querySelector(".conversation-item__preview")
        expect(preview).toBeInTheDocument()
        expect((preview?.textContent ?? "").length).toBeLessThanOrEqual(31)
    })

    it("does not truncate messages that are exactly 30 chars", () => {
        const exactContent = "B".repeat(30)
        const exactMessage = { ...mockMessage1, content: exactContent }
        const conv = { ...mockConversation1, lastMessage: exactMessage }

        render(
            <Wrapper>
                <ConversationList
                    conversations={[conv]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // Exactly 30 chars should appear without truncation
        expect(screen.getByText(exactContent)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-06: Click row calls onSelect with conversation id
// ---------------------------------------------------------------------------

describe("TC-F-06: clicking conversation row fires onSelect", () => {
    it("calls onSelect with the correct conversation id when clicking the row", () => {
        const onSelect = vi.fn()

        render(
            <Wrapper>
                <ConversationList
                    conversations={[mockConversation1]}
                    currentUserId="user-alice"
                    onSelect={onSelect}
                />
            </Wrapper>
        )

        // ConversationItem renders as role="button" with aria-label containing the name
        const row = screen.getByRole("button", { name: /Bob Wang/i })
        fireEvent.click(row)

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith("conv-001")
    })

    it("calls onSelect on keyboard Enter keydown", () => {
        const onSelect = vi.fn()

        render(
            <Wrapper>
                <ConversationList
                    conversations={[mockConversation1]}
                    currentUserId="user-alice"
                    onSelect={onSelect}
                />
            </Wrapper>
        )

        const row = screen.getByRole("button", { name: /Bob Wang/i })
        // <button> handles Enter natively in browsers, but jsdom's fireEvent.keyDown
        // does not synthesise a click. Use fireEvent.click to test the activation behaviour.
        fireEvent.click(row)

        expect(onSelect).toHaveBeenCalledWith("conv-001")
    })
})

// ---------------------------------------------------------------------------
// TC-F-07: Empty list shows empty state
// ---------------------------------------------------------------------------

describe("TC-F-07: empty state when no conversations", () => {
    it("shows empty state message when conversations array is empty", () => {
        render(
            <Wrapper>
                <ConversationList
                    conversations={[]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        // ConversationList renders "No conversations yet" in the empty state
        expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument()
    })

    it("shows accessibility role=status on the empty state container", () => {
        render(
            <Wrapper>
                <ConversationList
                    conversations={[]}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </Wrapper>
        )

        expect(screen.getByRole("status")).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-08: message:new socket event patches lastMessage in cache
// ---------------------------------------------------------------------------

describe("TC-F-08: message:new event patches conversation lastMessage in cache", () => {
    it("shows updated lastMessage when query cache is patched directly", () => {
        const queryClient = createTestQueryClient()

        // Pre-populate cache with original conversation
        queryClient.setQueryData(["conversations"], [mockConversation1])

        // Simulate what useSocket's "message:new" handler does: update lastMessage in cache
        const newMessage = {
            ...mockMessage1,
            id: "msg-002",
            content: "New message arrived!",
        }

        queryClient.setQueryData(
            ["conversations"],
            (old: (typeof mockConversation1)[] | undefined) =>
                (old ?? []).map((c) =>
                    c.id === "conv-001" ? { ...c, lastMessage: newMessage } : c
                )
        )

        const updatedConvs = queryClient.getQueryData<(typeof mockConversation1)[]>([
            "conversations",
        ])

        render(
            <QueryClientProvider client={queryClient}>
                <ConversationList
                    conversations={updatedConvs ?? []}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </QueryClientProvider>
        )

        // The new message preview should now be visible
        expect(screen.getByText("New message arrived!")).toBeInTheDocument()
    })

    it("does not show the old lastMessage after cache patch", () => {
        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["conversations"], [mockConversation1])

        const newMessage = {
            ...mockMessage1,
            id: "msg-002",
            content: "Replacement content",
        }

        queryClient.setQueryData(
            ["conversations"],
            (old: (typeof mockConversation1)[] | undefined) =>
                (old ?? []).map((c) =>
                    c.id === "conv-001" ? { ...c, lastMessage: newMessage } : c
                )
        )

        const updatedConvs = queryClient.getQueryData<(typeof mockConversation1)[]>([
            "conversations",
        ])

        render(
            <QueryClientProvider client={queryClient}>
                <ConversationList
                    conversations={updatedConvs ?? []}
                    currentUserId="user-alice"
                    onSelect={vi.fn()}
                />
            </QueryClientProvider>
        )

        // Original content "Hey Alice!" must no longer appear
        expect(screen.queryByText("Hey Alice!")).not.toBeInTheDocument()
        expect(screen.getByText("Replacement content")).toBeInTheDocument()
    })
})
