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
        selector: (s: { headerExpanded: boolean; isViewTransitioning: boolean }) => unknown
    ) => selector({ headerExpanded: false, isViewTransitioning: false }),
}))

vi.mock("@/stores/uiStore", () => ({
    uiStore: { state: { headerExpanded: false, isViewTransitioning: false }, setState: vi.fn() },
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

beforeEach(async () => {
    // Attempt dynamic imports — will throw in RED phase (no module yet)
    try {
        const friendsModule = await import("@/routes/friends/index")
        FriendsPage = friendsModule.default
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
})

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

        // Search input must be present
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument()
        })

        // No search results shown initially
        expect(screen.queryByTestId("search-results")).not.toBeInTheDocument()
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

        const searchInput = await screen.findByPlaceholderText(/search users/i)
        fireEvent.change(searchInput, { target: { value: "Bob" } })

        await waitFor(
            () => {
                expect(screen.getByTestId("user-card-user-bob")).toBeInTheDocument()
            },
            { timeout: 700 }
        )

        // Scope to the user card to avoid matching "Bob Wang" in DUMMY_PENDING section
        const userCard = screen.getByTestId("user-card-user-bob")
        expect(within(userCard).getByText("Bob Wang")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /add friend/i })).toBeInTheDocument()
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

        // Use findBy which automatically waits
        const pendingSection = await screen.findByTestId(
            "pending-requests-section",
            {},
            { timeout: 3000 }
        )
        expect(pendingSection).toBeInTheDocument()

        expect(screen.getAllByRole("button", { name: /accept/i })).toHaveLength(2)
        expect(screen.getAllByRole("button", { name: /reject/i })).toHaveLength(2)
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
// TC-F-NEW-03: Friends section collapses to summary row during search
// ---------------------------------------------------------------------------

describe("TC-F-NEW-03: Friends section collapses to summary when searching", () => {
    it("shows collapsed summary row with count when query is active", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        // Seed cache with 2 friends so the summary badge reflects real count
        queryClient.setQueryData(["friends", "list"], [mockUserBob, mockUserCarol])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])
        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        const searchInput = await screen.findByPlaceholderText(/search users/i)
        fireEvent.change(searchInput, { target: { value: "Bo" } })

        // Summary row should appear with friends label
        await waitFor(() => {
            expect(screen.getByText(/^Friends$/i)).toBeInTheDocument()
        })

        // Count badge shows 2 (matching the seeded cache)
        const summaryCount = screen.getAllByText("2")
        expect(summaryCount.length).toBeGreaterThanOrEqual(1)
    })
})

// ---------------------------------------------------------------------------
// TC-F-NEW-04: Friends section re-expands when search is cleared
// ---------------------------------------------------------------------------

describe("TC-F-NEW-04: Friends section re-expands when search cleared", () => {
    it("shows full friends list after clearing search input", async () => {
        mswServer.use(...graphqlHandlers)

        const queryClient = createTestQueryClient()
        // Seed cache so the friends section has data to expand back to
        queryClient.setQueryData(["friends", "list"], [mockUserBob, mockUserCarol])
        queryClient.setQueryData(["friends", "pending"], [])
        queryClient.setQueryData(["friends", "sent"], [])
        render(
            <QueryClientProvider client={queryClient}>
                <FriendsPage />
            </QueryClientProvider>
        )

        const searchInput = await screen.findByPlaceholderText(/search users/i)

        // Start searching
        fireEvent.change(searchInput, { target: { value: "Bo" } })

        // Wait for collapsed state
        await waitFor(() => {
            expect(screen.getByText(/^Friends$/i)).toBeInTheDocument()
        })

        // Clear search
        fireEvent.change(searchInput, { target: { value: "" } })

        // Full friend names from cache should reappear
        await waitFor(() => {
            expect(screen.getByText("Bob Wang")).toBeInTheDocument()
            expect(screen.getByText("Carol Lin")).toBeInTheDocument()
        })
    })
})
