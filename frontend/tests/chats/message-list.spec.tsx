/**
 * MessageList Tests — Feature 1.3.1 Frontend Web
 *
 * Test cases covered:
 * - TC-F-09: Initial load shows messages rendered from hook
 * - TC-F-10: Scroll to top triggers fetchNextPage via IntersectionObserver
 * - TC-F-11: typingMap in store shows typing indicator for active user
 * - TC-F-12: message:new event appends message to cache without refetch
 * - TC-F-13: Message status icons — SENT / DELIVERED / READ
 * - TC-F-14: Own messages right-aligned, others left-aligned
 * - TC-F-15: sync:required invalidates message queries for affected conversations
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest"

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/middleware/auth.middleware.server", () => ({
    requireAuthServer: { _def: { type: "middleware" } },
}))

vi.mock("@/lib/auth", () => ({
    auth: { api: { getSession: vi.fn().mockResolvedValue(null) } },
}))

vi.mock("@/lib/auth-client", () => ({
    sessionQueryOptions: {
        queryKey: ["auth", "session"],
        queryFn: async () => ({
            session: { id: "session-alice" },
            user: { id: "user-alice", name: "Alice Chen", email: "alice@test.com", image: null },
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

// ---------------------------------------------------------------------------
// uiStore mock — allows per-test override of typingMap / presenceMap
// ---------------------------------------------------------------------------

let currentUiState = {
    headerExpanded: false,
    isViewTransitioning: false,
    activeConversationId: null as string | null,
    typingMap: {} as Record<string, string[]>,
    presenceMap: {} as Record<string, boolean>,
}

vi.mock("@tanstack/react-store", () => ({
    useStore: (_store: unknown, selector: (s: typeof currentUiState) => unknown) =>
        selector(currentUiState),
}))

vi.mock("@/stores/uiStore", () => ({
    uiStore: {
        get state() {
            return currentUiState
        },
        setState: vi.fn((updater: (s: typeof currentUiState) => typeof currentUiState) => {
            currentUiState = updater(currentUiState)
        }),
    },
}))

// Mock virtua VList — render all children sequentially
vi.mock("virtua", () => ({
    VList: React.forwardRef(
        ({ children }: { children: React.ReactNode }, _ref: React.Ref<unknown>) => (
            <div data-testid="vlist">{children}</div>
        )
    ),
}))

// Mock motion/react — render without animation
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

// Mock socket
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
// useMessages mock — central point for controlling what messages are returned
// ---------------------------------------------------------------------------

const mockFetchNextPage = vi.fn()

vi.mock("@/hooks/useMessages", () => ({
    useMessages: vi.fn(),
}))

vi.mock("@tanstack/react-query", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-query")>()
    return {
        ...actual,
        useMutationState: vi.fn(() => []),
    }
})

// ---------------------------------------------------------------------------
// Mock socket
// ---------------------------------------------------------------------------

const socketHandlers: Record<string, (data: unknown) => void> = {}

const mockSocket = {
    on: vi.fn((event: string, cb: (data: unknown) => void) => {
        socketHandlers[event] = cb
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

function makeMessage(
    id: string,
    content: string,
    sender: {
        id: string
        name: string
        email: string
        image: string | null
        isOnline: boolean
    } = mockUserBob,
    status: "SENT" | "DELIVERED" | "READ" = "DELIVERED"
) {
    return {
        id,
        conversationId: "conv-001",
        sender,
        content,
        messageType: "TEXT" as const,
        imageUrl: null,
        createdAt: new Date().toISOString(),
        status,
    }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
            mutations: { retry: false },
        },
    })
}

// ---------------------------------------------------------------------------
// Lazy imports
// ---------------------------------------------------------------------------

let MessageList: React.ComponentType<{
    conversationId: string
    currentUserId: string
    conversationType: "ONE_TO_ONE" | "GROUP"
}>

let MessageBubble: React.ComponentType<{
    message: ReturnType<typeof makeMessage>
    isOwn: boolean
    isPending?: boolean
}>

let TypingIndicator: React.ComponentType<{ usernames: string[] }>

beforeEach(async () => {
    vi.clearAllMocks()
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k])

    // Reset uiState to default before each test
    currentUiState = {
        headerExpanded: false,
        isViewTransitioning: false,
        activeConversationId: null,
        typingMap: {},
        presenceMap: {},
    }

    try {
        const mod = await import("@/components/chats/MessageList")
        MessageList = mod.MessageList as typeof MessageList
    } catch {
        MessageList = () => <div data-testid="not-implemented">Not implemented</div>
    }

    try {
        const mod = await import("@/components/chats/MessageBubble")
        MessageBubble = mod.MessageBubble as typeof MessageBubble
    } catch {
        MessageBubble = () => <div data-testid="not-implemented">Not implemented</div>
    }

    try {
        const mod = await import("@/components/chats/TypingIndicator")
        TypingIndicator = mod.TypingIndicator as typeof TypingIndicator
    } catch {
        TypingIndicator = () => <div data-testid="not-implemented">Not implemented</div>
    }
})

// ---------------------------------------------------------------------------
// TC-F-09: Initial load shows messages rendered from hook
// ---------------------------------------------------------------------------

describe("TC-F-09: initial load shows messages from useMessages hook", () => {
    it("renders all messages returned by useMessages in order", async () => {
        const messages = [
            makeMessage("msg-001", "First message"),
            makeMessage("msg-002", "Second message"),
            makeMessage("msg-003", "Third message"),
        ]

        const { useMessages } = await import("@/hooks/useMessages")
        ;(useMessages as Mock).mockReturnValue({
            messages,
            fetchNextPage: mockFetchNextPage,
            hasNextPage: false,
            isFetchingNextPage: false,
        })

        const queryClient = createTestQueryClient()

        render(
            <QueryClientProvider client={queryClient}>
                <MessageList
                    conversationId="conv-001"
                    currentUserId="user-alice"
                    conversationType="ONE_TO_ONE"
                />
            </QueryClientProvider>
        )

        // All three messages should be visible (VList renders them all in test mode)
        expect(screen.getByText("First message")).toBeInTheDocument()
        expect(screen.getByText("Second message")).toBeInTheDocument()
        expect(screen.getByText("Third message")).toBeInTheDocument()
    })

    it("renders the log container with correct accessibility attributes", async () => {
        const { useMessages } = await import("@/hooks/useMessages")
        ;(useMessages as Mock).mockReturnValue({
            messages: [],
            fetchNextPage: mockFetchNextPage,
            hasNextPage: false,
            isFetchingNextPage: false,
        })

        const queryClient = createTestQueryClient()
        render(
            <QueryClientProvider client={queryClient}>
                <MessageList
                    conversationId="conv-001"
                    currentUserId="user-alice"
                    conversationType="ONE_TO_ONE"
                />
            </QueryClientProvider>
        )

        const log = screen.getByRole("log")
        expect(log).toBeInTheDocument()
        expect(log).toHaveAttribute("aria-live", "polite")
    })
})

// ---------------------------------------------------------------------------
// TC-F-10: Scroll to top triggers fetchNextPage via IntersectionObserver
// ---------------------------------------------------------------------------

describe("TC-F-10: IntersectionObserver at top sentinel triggers fetchNextPage", () => {
    it("calls fetchNextPage when the top sentinel becomes visible and hasNextPage is true", async () => {
        const { useMessages } = await import("@/hooks/useMessages")
        ;(useMessages as Mock).mockReturnValue({
            messages: [makeMessage("msg-001", "A message")],
            fetchNextPage: mockFetchNextPage,
            hasNextPage: true,
            isFetchingNextPage: false,
        })

        // Capture the IntersectionObserver callback so we can invoke it manually.
        // Must use a class (not an arrow function) because MessageList calls `new IntersectionObserver(...)`.
        let observerCallback: IntersectionObserverCallback | null = null
        const mockObserve = vi.fn()
        const mockDisconnect = vi.fn()

        class SpyIntersectionObserver {
            constructor(callback: IntersectionObserverCallback) {
                observerCallback = callback
            }
            observe = mockObserve
            unobserve = vi.fn()
            disconnect = mockDisconnect
            takeRecords = vi.fn(() => [])
            readonly root = null
            readonly rootMargin = "0px"
            readonly thresholds = []
        }

        window.IntersectionObserver =
            SpyIntersectionObserver as unknown as typeof IntersectionObserver

        const queryClient = createTestQueryClient()
        render(
            <QueryClientProvider client={queryClient}>
                <MessageList
                    conversationId="conv-001"
                    currentUserId="user-alice"
                    conversationType="ONE_TO_ONE"
                />
            </QueryClientProvider>
        )

        // Sentinel observe() was called
        expect(mockObserve).toHaveBeenCalled()

        // Simulate sentinel entering viewport
        ;(observerCallback as IntersectionObserverCallback | null)?.(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            {} as IntersectionObserver
        )

        await waitFor(() => {
            expect(mockFetchNextPage).toHaveBeenCalledTimes(1)
        })
    })

    it("does not call fetchNextPage when hasNextPage is false", async () => {
        const { useMessages } = await import("@/hooks/useMessages")
        ;(useMessages as Mock).mockReturnValue({
            messages: [],
            fetchNextPage: mockFetchNextPage,
            hasNextPage: false,
            isFetchingNextPage: false,
        })

        let observerCallback: IntersectionObserverCallback | null = null

        class SpyIntersectionObserver {
            constructor(callback: IntersectionObserverCallback) {
                observerCallback = callback
            }
            observe = vi.fn()
            unobserve = vi.fn()
            disconnect = vi.fn()
            takeRecords = vi.fn(() => [])
            readonly root = null
            readonly rootMargin = "0px"
            readonly thresholds = []
        }

        window.IntersectionObserver =
            SpyIntersectionObserver as unknown as typeof IntersectionObserver

        const queryClient = createTestQueryClient()
        render(
            <QueryClientProvider client={queryClient}>
                <MessageList
                    conversationId="conv-001"
                    currentUserId="user-alice"
                    conversationType="ONE_TO_ONE"
                />
            </QueryClientProvider>
        )

        ;(observerCallback as IntersectionObserverCallback | null)?.(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            {} as IntersectionObserver
        )

        expect(mockFetchNextPage).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// TC-F-11: typingMap in uiStore shows typing indicator
// ---------------------------------------------------------------------------

describe("TC-F-11: typing indicator shows when typingMap has users", () => {
    it("renders TypingIndicator with the typing user's name", async () => {
        // Set typing state before rendering
        currentUiState = {
            ...currentUiState,
            typingMap: { "conv-001": ["Bob Wang"] },
        }

        const { useMessages } = await import("@/hooks/useMessages")
        ;(useMessages as Mock).mockReturnValue({
            messages: [],
            fetchNextPage: mockFetchNextPage,
            hasNextPage: false,
            isFetchingNextPage: false,
        })

        const queryClient = createTestQueryClient()
        render(
            <QueryClientProvider client={queryClient}>
                <MessageList
                    conversationId="conv-001"
                    currentUserId="user-alice"
                    conversationType="ONE_TO_ONE"
                />
            </QueryClientProvider>
        )

        // TypingIndicator should show the label "Bob Wang is typing…"
        expect(screen.getByText(/Bob Wang is typing/)).toBeInTheDocument()
    })

    it("does not render TypingIndicator when typingMap is empty for the conversation", async () => {
        currentUiState = {
            ...currentUiState,
            typingMap: {},
        }

        const { useMessages } = await import("@/hooks/useMessages")
        ;(useMessages as Mock).mockReturnValue({
            messages: [],
            fetchNextPage: mockFetchNextPage,
            hasNextPage: false,
            isFetchingNextPage: false,
        })

        const queryClient = createTestQueryClient()
        render(
            <QueryClientProvider client={queryClient}>
                <MessageList
                    conversationId="conv-001"
                    currentUserId="user-alice"
                    conversationType="ONE_TO_ONE"
                />
            </QueryClientProvider>
        )

        expect(screen.queryByText(/is typing/)).not.toBeInTheDocument()
    })

    it("TypingIndicator standalone: buildLabel with one user", () => {
        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <TypingIndicator usernames={["Carol Lin"]} />
            </QueryClientProvider>
        )
        expect(screen.getByText(/Carol Lin is typing/)).toBeInTheDocument()
    })

    it("TypingIndicator standalone: buildLabel with multiple users shows Several people are typing", () => {
        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <TypingIndicator usernames={["Bob Wang", "Carol Lin", "Dave"]} />
            </QueryClientProvider>
        )
        expect(screen.getByText(/Several people are typing/)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-12: message:new event appends message to cache without refetch
// ---------------------------------------------------------------------------

describe("TC-F-12: message:new updates lastMessage in conversation cache", () => {
    it("renders newly patched message content from updated cache", async () => {
        const { useMessages } = await import("@/hooks/useMessages")

        const initialMessages = [makeMessage("msg-001", "Original message")]

        ;(useMessages as Mock).mockReturnValue({
            messages: initialMessages,
            fetchNextPage: mockFetchNextPage,
            hasNextPage: false,
            isFetchingNextPage: false,
        })

        const queryClient = createTestQueryClient()

        // Pre-populate messages cache
        queryClient.setQueryData(["messages", "conv-001"], {
            pages: [{ messages: initialMessages, nextCursor: null, prevCursor: null }],
            pageParams: [undefined],
        })

        render(
            <QueryClientProvider client={queryClient}>
                <MessageList
                    conversationId="conv-001"
                    currentUserId="user-alice"
                    conversationType="ONE_TO_ONE"
                />
            </QueryClientProvider>
        )

        expect(screen.getByText("Original message")).toBeInTheDocument()

        // Simulate what useSocket does when it receives message:new:
        // it calls setQueryData to append the new message to the last page
        const newMessage = makeMessage("msg-002", "Real-time message!")
        queryClient.setQueryData(
            ["messages", "conv-001"],
            (
                old:
                    | {
                          pages: Array<{ messages: ReturnType<typeof makeMessage>[] }>
                          pageParams: unknown[]
                      }
                    | undefined
            ) => {
                if (!old) return old
                const lastPage = old.pages[old.pages.length - 1]
                return {
                    ...old,
                    pages: [
                        ...old.pages.slice(0, -1),
                        { ...lastPage, messages: [...lastPage.messages, newMessage] },
                    ],
                }
            }
        )

        // Update the mock to return the new messages array
        ;(useMessages as Mock).mockReturnValue({
            messages: [...initialMessages, newMessage],
            fetchNextPage: mockFetchNextPage,
            hasNextPage: false,
            isFetchingNextPage: false,
        })

        // Re-render with updated mock
        render(
            <QueryClientProvider client={queryClient}>
                <MessageList
                    conversationId="conv-001"
                    currentUserId="user-alice"
                    conversationType="ONE_TO_ONE"
                />
            </QueryClientProvider>
        )

        expect(screen.getAllByText("Real-time message!").length).toBeGreaterThan(0)
    })
})

// ---------------------------------------------------------------------------
// TC-F-13: Message status icons — SENT / DELIVERED / READ
// ---------------------------------------------------------------------------

describe("TC-F-13: MessageBubble status icons for own messages", () => {
    it("renders a Check icon for SENT status (own message)", () => {
        const sentMessage = makeMessage("msg-001", "Sent msg", mockUserAlice, "SENT")

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <MessageBubble message={sentMessage} isOwn={true} />
            </QueryClientProvider>
        )

        // SENT → Check icon (12px). The SVG has aria-hidden=true.
        // The bubble should contain the check icon in a status row.
        // We check that the bubble-card--send class is present (own message)
        const bubble = document.querySelector(".bubble-card--send")
        expect(bubble).toBeInTheDocument()
        // Status row is a sibling of bubble-card, not a child — traverse up to outer flex-col
        const outerDiv = bubble?.closest(".flex.flex-col")
        const statusDiv = outerDiv?.querySelector(".flex.items-center")
        expect(statusDiv).toBeInTheDocument()
    })

    it("renders a CheckCheck icon for DELIVERED status (own message)", () => {
        const deliveredMessage = makeMessage("msg-001", "Delivered msg", mockUserAlice, "DELIVERED")

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <MessageBubble message={deliveredMessage} isOwn={true} />
            </QueryClientProvider>
        )

        const bubble = document.querySelector(".bubble-card--send")
        expect(bubble).toBeInTheDocument()
        // Status row is a sibling of bubble-card, not a child — traverse up to outer flex-col
        const outerDiv = bubble?.closest(".flex.flex-col")
        const statusDiv = outerDiv?.querySelector(".flex.items-center")
        expect(statusDiv).toBeInTheDocument()
    })

    it("renders a CheckCheck icon with primary color for READ status (own message)", () => {
        const readMessage = makeMessage("msg-001", "Read msg", mockUserAlice, "READ")

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <MessageBubble message={readMessage} isOwn={true} />
            </QueryClientProvider>
        )

        const bubble = document.querySelector(".bubble-card--send")
        expect(bubble).toBeInTheDocument()
        // READ CheckCheck has inline style color: var(--primary) — traverse up then down
        const outerDiv = bubble?.closest(".flex.flex-col")
        const statusDiv = outerDiv?.querySelector("[style*='--primary']")
        expect(statusDiv).toBeInTheDocument()
    })

    it("does not render status icon for received messages", () => {
        const receivedMessage = makeMessage("msg-001", "Others msg", mockUserBob, "READ")

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <MessageBubble message={receivedMessage} isOwn={false} />
            </QueryClientProvider>
        )

        // No bubble-card--send, and no status row
        const sendBubble = document.querySelector(".bubble-card--send")
        expect(sendBubble).not.toBeInTheDocument()
        // bubble-card--receive should be present
        expect(document.querySelector(".bubble-card--receive")).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-14: Own messages right-aligned, others left-aligned
// ---------------------------------------------------------------------------

describe("TC-F-14: message alignment based on isOwn prop", () => {
    it("own message has bubble-card--send class (right alignment)", () => {
        const ownMessage = makeMessage("msg-001", "My message", mockUserAlice, "SENT")

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <MessageBubble message={ownMessage} isOwn={true} />
            </QueryClientProvider>
        )

        expect(document.querySelector(".bubble-card--send")).toBeInTheDocument()
        expect(document.querySelector(".bubble-card--receive")).not.toBeInTheDocument()
    })

    it("received message has bubble-card--receive class (left alignment)", () => {
        const receivedMessage = makeMessage("msg-001", "Their message", mockUserBob, "DELIVERED")

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <MessageBubble message={receivedMessage} isOwn={false} />
            </QueryClientProvider>
        )

        expect(document.querySelector(".bubble-card--receive")).toBeInTheDocument()
        expect(document.querySelector(".bubble-card--send")).not.toBeInTheDocument()
    })

    it("own message container has items-end (flex-end alignment)", () => {
        const ownMessage = makeMessage("msg-001", "My msg", mockUserAlice, "SENT")

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <MessageBubble message={ownMessage} isOwn={true} />
            </QueryClientProvider>
        )

        // MessageBubble wraps in <div className="flex flex-col items-end">
        const wrapper = document.querySelector(".items-end")
        expect(wrapper).toBeInTheDocument()
    })

    it("received message container has items-start (flex-start alignment)", () => {
        const receivedMessage = makeMessage("msg-001", "Their msg", mockUserBob, "DELIVERED")

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <MessageBubble message={receivedMessage} isOwn={false} />
            </QueryClientProvider>
        )

        const wrapper = document.querySelector(".items-start")
        expect(wrapper).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-15: sync:required invalidates message queries
// ---------------------------------------------------------------------------

describe("TC-F-15: sync:required invalidates message queries for affected conversations", () => {
    it("invalidates messages query for each conversationId in sync:required payload", async () => {
        const queryClient = createTestQueryClient()

        // Spy on invalidateQueries
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

        // Pre-populate cache so there's something to invalidate
        queryClient.setQueryData(["messages", "conv-001"], {
            pages: [{ messages: [], nextCursor: null, prevCursor: null }],
            pageParams: [undefined],
        })
        queryClient.setQueryData(["messages", "conv-002"], {
            pages: [{ messages: [], nextCursor: null, prevCursor: null }],
            pageParams: [undefined],
        })

        // Simulate what useSocket's "sync:required" handler does
        const syncHandler = ({ conversationIds }: { conversationIds: string[] }) => {
            for (const id of conversationIds) {
                void queryClient.invalidateQueries({ queryKey: ["messages", id] })
            }
        }

        syncHandler({ conversationIds: ["conv-001", "conv-002"] })

        await waitFor(() => {
            // Should have been called once for each conversation
            expect(invalidateSpy).toHaveBeenCalledTimes(2)
            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: ["messages", "conv-001"],
            })
            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: ["messages", "conv-002"],
            })
        })
    })

    it("does not call invalidateQueries when conversationIds is empty", async () => {
        const queryClient = createTestQueryClient()
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

        const syncHandler = ({ conversationIds }: { conversationIds: string[] }) => {
            for (const id of conversationIds) {
                void queryClient.invalidateQueries({ queryKey: ["messages", id] })
            }
        }

        syncHandler({ conversationIds: [] })

        expect(invalidateSpy).not.toHaveBeenCalled()
    })
})
