/**
 * Friends Page Integration Tests — Feature 1.2.1
 *
 * Test cases covered:
 * - TC-F-01: FriendsPage renders correct initial state
 * - TC-F-04: Search results display UserCard
 * - TC-F-05: sendFriendRequest changes button state to Pending
 * - TC-F-06: Pending request card shows accept and reject buttons
 * - TC-F-07: AppHeader notification badge shows pending request count
 * - TC-F-09: Friends list renders accepted friends
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react"
import { graphql, HttpResponse } from "msw"
import React from "react"
import { describe, it, expect, beforeEach, vi } from "vitest"

import { AestheticModeProvider } from "@/contexts/aesthetic-mode-context"

import {
    mockUserBob,
    mockUserCarol,
    mockPendingRequest,
    mockPendingRequest2,
    emptyFriendsHandler,
    emptyPendingRequestsHandler,
    emptySentRequestsHandler,
    emptySearchResultsHandler,
    graphqlHandlers,
} from "../mocks/graphql-handlers"
import { mswServer } from "../mocks/server"

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock server-only modules so dynamic import("@/routes/friends/index") doesn't
// trigger database/auth server initialization in the test environment.
vi.mock("@/middleware/auth.middleware.server", () => ({
    requireAuthServer: { _def: { type: "middleware" } },
}))

vi.mock("@/lib/auth", () => ({
    auth: {
        api: {
            getSession: vi.fn().mockResolvedValue(null),
        },
    },
}))

// AppHeader uses sessionQueryOptions (TanStack Query) instead of useSession.
// Return the processed session data (result.data shape) for Alice Chen.
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

// Mock aesthetic mode context — useAestheticMode returns static "ornate" so no Provider is needed.
// This allows tests that wrap with bare QueryClientProvider to render FriendsPage without error.
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

vi.mock("@tanstack/react-store", () => ({
    useStore: (
        _store: unknown,
        selector: (s: {
            headerExpanded: boolean
            isViewTransitioning: boolean
            presenceMap: Record<string, boolean>
        }) => unknown
    ) => selector({ headerExpanded: false, isViewTransitioning: false, presenceMap: {} }),
}))

vi.mock("@/stores/uiStore", () => ({
    uiStore: {
        state: { headerExpanded: false, isViewTransitioning: false, presenceMap: {} },
        setState: vi.fn(),
    },
}))

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => vi.fn(),
    // AppHeader uses useRouterState to detect /auth pages for conditional session fetch
    useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
        select({ location: { pathname: "/friends" } }),
    createFileRoute: (_path: string) => (_options: { component?: unknown; server?: unknown }) => ({
        component: _options?.component,
    }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

// ---------------------------------------------------------------------------
// Test wrappers — real QueryClient so MSW can intercept at network layer.
// ---------------------------------------------------------------------------

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // Disable retries in tests
                gcTime: Infinity, // Keep data in cache for Suspense
                staleTime: Infinity, // Prevent automatic refetch
            },
            mutations: {
                retry: false,
            },
        },
    })
}

function AppProviders({ children }: { children: React.ReactNode }) {
    // Client must be stable across re-renders — create once per component instance
    const clientRef = React.useRef<ReturnType<typeof createTestQueryClient> | null>(null)
    if (!clientRef.current) clientRef.current = createTestQueryClient()
    return (
        <QueryClientProvider client={clientRef.current}>
            <AestheticModeProvider>{children}</AestheticModeProvider>
        </QueryClientProvider>
    )
}

// ---------------------------------------------------------------------------
// Lazy imports — components are NOT yet implemented (RED phase)
// ---------------------------------------------------------------------------

// These imports will fail until implementation is complete.
// The tests are intentionally RED.
let FriendsPage: React.ComponentType
let UserCard: React.ComponentType<{
    user: { id: string; name: string; email: string; image: string | null }
    existingRequestId?: string
}>
let AppHeader: React.ComponentType

beforeAll(async () => {
    // Import once for all tests — modules are cached after first load
    // 30s timeout: parallel test workers compete for module initialization resources
    try {
        const friendsModule = await import("@/components/friends/FriendsPage")
        FriendsPage = friendsModule.FriendsPage
    } catch {
        FriendsPage = () => <div data-testid="not-implemented">Not implemented</div>
    }

    try {
        const userCardModule = await import("@/components/friends/UserCard")
        UserCard = userCardModule.UserCard
    } catch {
        UserCard = () => <div data-testid="not-implemented">Not implemented</div>
    }

    try {
        const headerModule = await import("@/components/shared/AppHeader")
        AppHeader = headerModule.default
    } catch {
        AppHeader = () => <div data-testid="not-implemented">Not implemented</div>
    }
}, 30000)

// ---------------------------------------------------------------------------
// TC-F-01: FriendsPage renders correct initial state
// ---------------------------------------------------------------------------

describe("TC-F-01: FriendsPage initial render", () => {
    beforeEach(() => {
        mswServer.use(emptyFriendsHandler, emptyPendingRequestsHandler, emptySentRequestsHandler)
    })

    it("renders search input and empty friends list on mount", async () => {
        const queryClient = createTestQueryClient()

        // Prefetch data for Suspense (simulate route loader)
        await queryClient.prefetchQuery({
            queryKey: ["friends", "pending"],
            queryFn: async () => [],
        })
        await queryClient.prefetchQuery({
            queryKey: ["friends", "list"],
            queryFn: async () => [],
        })

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        // Sidebar search input must be present (filters existing friends)
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/search friends/i)).toBeInTheDocument()
        })

        // User-search (Add Friend) is behind the modal — not shown on initial render
        expect(screen.queryByPlaceholderText(/search users/i)).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-04: Search results display UserCard with name and button
// ---------------------------------------------------------------------------

describe("TC-F-04: Search results render UserCard", () => {
    beforeEach(() => {
        mswServer.use(...graphqlHandlers)
    })

    it("shows user card with name and add-friend button after typing", async () => {
        const queryClient = createTestQueryClient()

        // Set initial data directly in cache — all three keys must be seeded so
        // sentRequestsQueryOptions doesn't fall through to the MSW handler (which
        // returns mockSentRequest with receiver=Bob, making Bob appear as PENDING_SENT)
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "list"], [])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        // Open AddFriendModal — user search is now behind the modal
        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))

        const searchInput = await screen.findByPlaceholderText(/search users/i)
        fireEvent.change(searchInput, { target: { value: "Bob" } })

        await waitFor(
            () => {
                expect(screen.getByTestId("user-card-user-bob")).toBeInTheDocument()
            },
            { timeout: 700 }
        )

        const userCard = screen.getByTestId("user-card-user-bob")
        expect(within(userCard).getByText("Bob Wang")).toBeInTheDocument()
        expect(within(userCard).getByRole("button", { name: /add friend/i })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-05: sendFriendRequest changes button state to Pending
// ---------------------------------------------------------------------------

describe("TC-F-05: Send friend request button state", () => {
    beforeEach(() => {
        mswServer.use(...graphqlHandlers)
    })

    it("changes add-friend button to disabled pending after click", async () => {
        render(
            <AppProviders>
                <UserCard user={mockUserBob} />
            </AppProviders>
        )

        const addButton = screen.getByRole("button", { name: /add friend/i })
        fireEvent.click(addButton)

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /pending/i })).toBeInTheDocument()
        })

        expect(screen.getByRole("button", { name: /pending/i })).toBeDisabled()
    })
})

// ---------------------------------------------------------------------------
// TC-F-06: Pending request card shows accept and reject buttons
// ---------------------------------------------------------------------------

describe("TC-F-06: Pending request card UI", () => {
    it("shows accept and reject buttons in pending requests section", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()

        // Set data directly in cache with pending requests
        queryClient.setQueryData(["friends", "pending"], [mockPendingRequest, mockPendingRequest2])
        queryClient.setQueryData(["friends", "list"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        // Switch to the Pending tab — pending requests render under the filter chip list
        const pendingChip = await screen.findByRole("button", { name: /pending/i })
        fireEvent.click(pendingChip)

        await waitFor(
            () => {
                expect(screen.getAllByRole("button", { name: /accept/i })).toHaveLength(2)
                expect(screen.getAllByRole("button", { name: /reject/i })).toHaveLength(2)
            },
            { timeout: 3000 }
        )
    })
})

// ---------------------------------------------------------------------------
// TC-F-07: AppHeader notification badge
// ---------------------------------------------------------------------------

describe("TC-F-07: AppHeader notification badge", () => {
    beforeEach(() => {
        mswServer.use(...graphqlHandlers)
    })

    it("shows badge with pending request count", async () => {
        render(
            <AppProviders>
                <AppHeader />
            </AppProviders>
        )

        await waitFor(() => {
            const badge = screen.getByTestId("friend-request-badge")
            expect(badge).toBeInTheDocument()
            expect(badge).toHaveTextContent("2")
        })
    })
})

// ---------------------------------------------------------------------------
// TC-F-08: cancelFriendRequest restores add-friend button
// ---------------------------------------------------------------------------

describe("TC-F-08: Cancel friend request restores button", () => {
    it("restores add-friend button after cancelling a sent request", async () => {
        mswServer.use(...graphqlHandlers)

        render(
            <AppProviders>
                <UserCard user={mockUserBob} existingRequestId="req-123" />
            </AppProviders>
        )

        // Initial state should show pending/cancel since request already exists
        const cancelButton = await screen.findByRole("button", { name: /cancel request/i })
        fireEvent.click(cancelButton)

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /add friend/i })).toBeInTheDocument()
            expect(screen.getByRole("button", { name: /add friend/i })).toBeEnabled()
        })
    })
})

// ---------------------------------------------------------------------------
// TC-F-09: Friends list renders accepted friends
// ---------------------------------------------------------------------------

describe("TC-F-09: Friends list renders accepted friends", () => {
    it("shows accepted friends names and avatars", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()

        // Set data directly in cache with friends
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "list"], [mockUserBob, mockUserCarol])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        await waitFor(
            () => {
                expect(screen.getByText("Bob Wang")).toBeInTheDocument()
                expect(screen.getByText("Carol Lin")).toBeInTheDocument()
            },
            { timeout: 2000 }
        )

        expect(screen.queryByText(/no friends yet/i)).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-01: Search shows ACCEPTED status for known friends
// ---------------------------------------------------------------------------

describe("TC-F-NEW-01: Search results show ACCEPTED status for friends", () => {
    it("shows Friends badge (not Add Friend) when search result is already a friend", async () => {
        // Return Carol Lin (id: "user-3") via SearchUsers mock
        mswServer.use(
            graphql.query("SearchUsers", () => {
                return HttpResponse.json({
                    data: {
                        searchUsers: [
                            {
                                id: "user-3",
                                name: "Carol Lin",
                                email: "carol@ping.dev",
                                image: null,
                            },
                        ],
                    },
                })
            })
        )

        const queryClient = createTestQueryClient()
        // Seed cache: user-3 is an accepted friend → friendshipStatusMap maps her as ACCEPTED
        queryClient.setQueryData(
            ["friends", "list"],
            [{ id: "user-3", name: "Carol Lin", email: "carol@ping.dev", image: null }]
        )
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])
        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        // Open AddFriendModal — user search is behind the modal
        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))

        const searchInput = await screen.findByPlaceholderText(/search users/i)
        fireEvent.change(searchInput, { target: { value: "Carol" } })

        // Should show Friends badge, not Add Friend button
        await waitFor(
            () => {
                expect(screen.getByTestId("user-card-user-3")).toBeInTheDocument()
            },
            { timeout: 700 }
        )

        const card = screen.getByTestId("user-card-user-3")
        expect(within(card).getByText("Friends")).toBeInTheDocument()
        expect(within(card).queryByRole("button", { name: /add friend/i })).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-02: Search shows PENDING_SENT status for sent requests
// ---------------------------------------------------------------------------

describe("TC-F-NEW-02: Search results show PENDING_SENT for outgoing requests", () => {
    it("shows Pending button when search result already has a sent request", async () => {
        // Return Henry Ho (id: "user-8") via SearchUsers mock
        mswServer.use(
            graphql.query("SearchUsers", () => {
                return HttpResponse.json({
                    data: {
                        searchUsers: [
                            {
                                id: "user-8",
                                name: "Henry Ho",
                                email: "henry@ping.dev",
                                image: null,
                            },
                        ],
                    },
                })
            })
        )

        const queryClient = createTestQueryClient()
        // Seed cache: user-8 is the receiver of a sent request → PENDING_SENT
        queryClient.setQueryData(["friends", "list"], [])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(
            ["friends", "sent"],
            [
                {
                    id: "req-sent-henry",
                    status: "PENDING",
                    createdAt: "2026-02-16T00:00:00.000Z",
                    updatedAt: "2026-02-16T00:00:00.000Z",
                    sender: {
                        id: "user-alice",
                        name: "Alice Chen",
                        email: "alice@ping.dev",
                        image: null,
                    },
                    receiver: {
                        id: "user-8",
                        name: "Henry Ho",
                        email: "henry@ping.dev",
                        image: null,
                    },
                },
            ]
        )
        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        // Open AddFriendModal — user search is behind the modal
        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))

        const searchInput = await screen.findByPlaceholderText(/search users/i)
        fireEvent.change(searchInput, { target: { value: "Henry" } })

        await waitFor(
            () => {
                expect(screen.getByTestId("user-card-user-8")).toBeInTheDocument()
            },
            { timeout: 700 }
        )

        const card = screen.getByTestId("user-card-user-8")
        // Pending button should be visible (disabled), Add Friend should be absent
        expect(within(card).getByRole("button", { name: /pending/i })).toBeInTheDocument()
        expect(within(card).queryByRole("button", { name: /add friend/i })).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-03: Sidebar search filters the friends list in place
// ---------------------------------------------------------------------------

describe("TC-F-NEW-03: Sidebar search filters friends list", () => {
    it("shows only matching friends when query is active", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [mockUserBob, mockUserCarol])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])
        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        // Both friends visible initially
        await waitFor(() => {
            expect(screen.getByText("Bob Wang")).toBeInTheDocument()
            expect(screen.getByText("Carol Lin")).toBeInTheDocument()
        })

        // Sidebar search filters existing friends — not a global user search
        const searchInput = screen.getByPlaceholderText(/search friends/i)
        fireEvent.change(searchInput, { target: { value: "Bo" } })

        // Only Bob Wang matches "Bo"
        await waitFor(() => {
            expect(screen.getByText("Bob Wang")).toBeInTheDocument()
            expect(screen.queryByText("Carol Lin")).not.toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-04: Clearing sidebar search restores the full friends list
// ---------------------------------------------------------------------------

describe("TC-F-NEW-04: Clearing sidebar search restores full friends list", () => {
    it("shows full friends list after clearing search input", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [mockUserBob, mockUserCarol])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])
        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        const searchInput = screen.getByPlaceholderText(/search friends/i)

        // Filter to only Bob
        fireEvent.change(searchInput, { target: { value: "Bo" } })

        await waitFor(() => {
            expect(screen.getByText("Bob Wang")).toBeInTheDocument()
            expect(screen.queryByText("Carol Lin")).not.toBeInTheDocument()
        })

        // Clear filter — full list restores
        fireEvent.change(searchInput, { target: { value: "" } })

        await waitFor(() => {
            expect(screen.getByText("Bob Wang")).toBeInTheDocument()
            expect(screen.getByText("Carol Lin")).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-05: AddFriendModal closes and resets on X button click
// ---------------------------------------------------------------------------

describe("TC-F-NEW-05: AddFriendModal closes and resets on close button", () => {
    it("unmounts modal and resets search state when X is clicked", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        // Open modal and type a query
        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))
        const searchInput = await screen.findByPlaceholderText(/search users/i)
        fireEvent.change(searchInput, { target: { value: "Bob" } })

        // Close via X button
        fireEvent.click(screen.getByRole("button", { name: /close dialog/i }))

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        })

        // Reopen — state must be reset to empty
        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))
        const reopenedInput = await screen.findByPlaceholderText(/search users/i)
        expect(reopenedInput).toHaveValue("")
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-06: AddFriendModal closes on overlay (backdrop) click
// ---------------------------------------------------------------------------

describe("TC-F-NEW-06: AddFriendModal closes on overlay click", () => {
    it("unmounts modal when user clicks outside the panel", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))
        await screen.findByRole("dialog")

        // Click the overlay — it is the direct parent of the dialog panel.
        // handleOverlayClick checks e.target === e.currentTarget, so clicking
        // the overlay div itself (not a child) triggers the close.
        const overlay = screen.getByRole("dialog").parentElement!
        fireEvent.click(overlay)

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-07: 1-char query does NOT fire SearchUsers (enabled guard)
// ---------------------------------------------------------------------------

describe("TC-F-NEW-07: Short query does not trigger search", () => {
    it("shows hint text and no results list when query is 1 character", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))
        const searchInput = await screen.findByPlaceholderText(/search users/i)

        // Type 1 char — enabled guard prevents SearchUsers from firing
        fireEvent.change(searchInput, { target: { value: "B" } })

        expect(screen.getByText(/type at least 2 characters/i)).toBeInTheDocument()
        expect(screen.queryByRole("list", { name: /search results/i })).not.toBeInTheDocument()

        // Type 2 chars — results list now appears
        fireEvent.change(searchInput, { target: { value: "Bo" } })

        await waitFor(
            () => {
                expect(screen.getByRole("list", { name: /search results/i })).toBeInTheDocument()
            },
            { timeout: 700 }
        )
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-08: Modal shows empty-results state when SearchUsers returns []
// ---------------------------------------------------------------------------

describe("TC-F-NEW-08: Modal empty-results state", () => {
    it("shows no-results message when search returns empty array", async () => {
        mswServer.use(
            emptySearchResultsHandler,
            emptyFriendsHandler,
            emptyPendingRequestsHandler,
            emptySentRequestsHandler
        )

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))
        const searchInput = await screen.findByPlaceholderText(/search users/i)
        fireEvent.change(searchInput, { target: { value: "zzzzz" } })

        await waitFor(
            () => {
                expect(screen.getByText(/no users found/i)).toBeInTheDocument()
            },
            { timeout: 700 }
        )

        expect(screen.queryByTestId("user-card-user-bob")).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-09: Modal shows SoundWaveLoader while search is in-flight
// ---------------------------------------------------------------------------

describe("TC-F-NEW-09: Modal loading state during search", () => {
    it("shows loader while fetching, hides it once results arrive", async () => {
        // Delay the SearchUsers response by 150ms to capture the in-flight state
        mswServer.use(
            graphql.query("SearchUsers", async () => {
                await new Promise<void>((resolve) => setTimeout(resolve, 150))
                return HttpResponse.json({ data: { searchUsers: [mockUserBob] } })
            })
        )

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        fireEvent.click(screen.getByRole("button", { name: /add friend/i }))
        const searchInput = await screen.findByPlaceholderText(/search users/i)
        fireEvent.change(searchInput, { target: { value: "Bo" } })

        // Loader appears after debounce (300ms) fires and the fetch is in-flight (+150ms MSW delay).
        // waitFor polls until loading=true propagates to the DOM.
        await waitFor(
            () => {
                expect(screen.getByTestId("loader")).toBeInTheDocument()
            },
            { timeout: 600 }
        )

        // Once MSW resolves (~150ms later) — loader gone, results visible
        await waitFor(
            () => {
                expect(screen.queryByTestId("loader")).not.toBeInTheDocument()
                expect(screen.getByTestId("user-card-user-bob")).toBeInTheDocument()
            },
            { timeout: 600 }
        )
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-10: Switching to Pending tab clears the sidebar search input
// ---------------------------------------------------------------------------

describe("TC-F-NEW-10: Pending tab switch clears sidebar search", () => {
    it("resets sidebar search value to empty when Pending chip is clicked", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [mockUserBob, mockUserCarol])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        // Type "Bob" — Carol disappears from the filtered list
        const sidebarSearch = screen.getByPlaceholderText(/search friends/i)
        fireEvent.change(sidebarSearch, { target: { value: "Bob" } })

        await waitFor(() => {
            expect(screen.getByText("Bob Wang")).toBeInTheDocument()
            expect(screen.queryByText("Carol Lin")).not.toBeInTheDocument()
        })

        // Switch to Pending, then back to All.
        // If setSearchQuery("") fired on Pending tab switch, Carol reappears on All.
        fireEvent.click(screen.getByRole("button", { name: /pending/i }))
        fireEvent.click(screen.getByRole("button", { name: /all/i }))

        await waitFor(() => {
            expect(screen.getByText("Bob Wang")).toBeInTheDocument()
            expect(screen.getByText("Carol Lin")).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-11: Pending tab shows empty state when no pending requests exist
// ---------------------------------------------------------------------------

describe("TC-F-NEW-11: Pending tab empty state", () => {
    it("shows no-pending-requests message when pending list is empty", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [mockUserBob])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        fireEvent.click(await screen.findByRole("button", { name: /pending/i }))

        await waitFor(() => {
            expect(screen.getByText(/no pending requests/i)).toBeInTheDocument()
        })

        expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-12: Pending chip badge reflects actual pending count
// ---------------------------------------------------------------------------

describe("TC-F-NEW-12: Pending chip badge count", () => {
    it("shows correct count badge on the Pending filter chip", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        queryClient.setQueryData(["friends", "list"], [])
        queryClient.setQueryData(["friends", "pending"], [mockPendingRequest, mockPendingRequest2])
        queryClient.setQueryData(["friends", "sent"], [])

        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        const pendingChip = await screen.findByRole("button", { name: /pending/i })
        expect(within(pendingChip).getByText("2")).toBeInTheDocument()
    })
})
