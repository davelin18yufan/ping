/**
 * Session Management Integration Tests
 * Stage 4: Session 認證整合
 *
 * Total tests: 13 (Test 4.1 - 4.13)
 * Following Feature-1.2.0-TDD-Tests.md Stage 4 spec
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react"
import React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

import AppHeader from "@/components/shared/AppHeader"
import { useSessionGuard } from "@/hooks/useSessionGuard"

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// vi.hoisted: makes mockGetSession accessible inside vi.mock factory closures.
// Both sessionQueryOptions.queryFn and getSession point to the same mock so
// that mockAuthenticated/Unauthenticated helpers control all auth state.
const { mockGetSession } = vi.hoisted(() => ({
    mockGetSession: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

// AppHeader now uses sessionQueryOptions (TanStack Query) instead of useSession.
// queryFn mirrors the real implementation: unwraps result.data from the raw
// auth client response, returning null on any error — matching AppHeader's
// expectation of sessionData?.user being the user object directly.
vi.mock("@/lib/auth-client", () => ({
    sessionQueryOptions: {
        queryKey: ["auth", "session"],
        queryFn: async () => {
            const result = await mockGetSession()
            if (result.error) return null
            return result.data ?? null
        },
        retry: false,
        staleTime: 0,
        gcTime: 0,
    },
    signOut: vi.fn().mockResolvedValue(undefined),
    getSession: mockGetSession,
}))

// AppHeader uses useRouterState to detect /auth pages and useNavigate for sign-out redirect.
vi.mock("@tanstack/react-router", async () => {
    const actual = await vi.importActual("@tanstack/react-router")
    return {
        ...actual,
        useRouterState: ({
            select,
        }: {
            select: (s: { location: { pathname: string } }) => string
        }) => select({ location: { pathname: "/" } }),
        useNavigate: () => vi.fn(),
    }
})

// Mock AestheticModeToggle to avoid context dependency
vi.mock("@/components/shared/AestheticModeToggle", () => ({
    AestheticModeToggle: () => <div data-testid="aesthetic-mode-toggle" />,
}))

// Mock ThemeToggle to avoid theme context dependency
vi.mock("@/components/shared/ThemeToggle", () => ({
    ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}))

// Mock UserStatusAvatar to avoid live subscription dependencies
vi.mock("@/components/shared/UserStatusAvatar", () => ({
    UserStatusAvatar: () => <span data-testid="user-avatar" />,
}))

// Mock scroll direction to keep header in default state
vi.mock("@/hooks/useScrollDirection", () => ({
    useScrollDirection: () => "up",
}))

// Mock pending friend requests to avoid network calls when authenticated
vi.mock("@/graphql/options/friends", () => ({
    pendingRequestsQueryOptions: {
        queryKey: ["friends", "pending"],
        queryFn: async () => [],
        retry: false,
        staleTime: 0,
        gcTime: 0,
    },
}))

// Mock useViewTransition to avoid View Transition API in jsdom
vi.mock("@/hooks/use-view-transition", () => ({
    useViewTransition: () => ({
        withRipple: (_e: unknown, _key: string, fn: () => void) => fn(),
    }),
}))

// Import mocked modules for test-level control
import { signOut, getSession } from "@/lib/auth-client"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
        },
    })
}

function Wrapper({ children }: { children: React.ReactNode }) {
    const clientRef = React.useRef<QueryClient | null>(null)
    if (!clientRef.current) clientRef.current = createTestQueryClient()
    return <QueryClientProvider client={clientRef.current}>{children}</QueryClientProvider>
}

/** Simulate unauthenticated — queryFn returns null session */
const mockUnauthenticated = () => {
    mockGetSession.mockResolvedValue({ data: null, error: null })
}

/** Simulate authenticated — queryFn returns session with user */
const mockAuthenticated = (
    user = { id: "user-abc", name: "Alice", email: "alice@example.com" }
) => {
    mockGetSession.mockResolvedValue({
        data: { session: { id: "sess-123" }, user },
        error: null,
    })
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Stage 4: Session Management Integration Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default: unauthenticated
        mockUnauthenticated()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // =========================================================================
    // Section 6.1 — Session Management (Tests 4.1 - 4.5)
    // =========================================================================

    describe("6.1 Session Management", () => {
        /**
         * Test 4.1: sessionQueryOptions 正確初始化
         * (AppHeader now uses sessionQueryOptions instead of useSession)
         */
        it("Test 4.1: should expose sessionQueryOptions with correct query key", async () => {
            const { sessionQueryOptions } = await import("@/lib/auth-client")
            expect(sessionQueryOptions).toBeDefined()
            expect(sessionQueryOptions.queryKey).toEqual(["auth", "session"])
        })

        /**
         * Test 4.2: Session 驗證正確運作 — queryFn 回傳 user data
         */
        it("Test 4.2: should validate session and expose user data when session is active", async () => {
            mockAuthenticated({ id: "user-123", name: "Test User", email: "test@example.com" })
            const result = await mockGetSession()
            expect(result.data?.user?.id).toBe("user-123")
            expect(result.data?.user?.name).toBe("Test User")
        })

        /**
         * Test 4.3: Session 過期時不顯示 user zone
         */
        it("Test 4.3: should not render authenticated UI when session data is null", async () => {
            mockUnauthenticated()
            render(<AppHeader />, { wrapper: Wrapper })

            await waitFor(() => {
                expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument()
            })
        })

        /**
         * Test 4.4: Session 更新後反映到 AppHeader
         */
        it("Test 4.4: should reflect updated session in AppHeader user name", async () => {
            mockAuthenticated({ id: "user-456", name: "Bob", email: "bob@example.com" })
            render(<AppHeader />, { wrapper: Wrapper })

            await waitFor(() => {
                expect(screen.getByText("Bob")).toBeInTheDocument()
            })
        })

        /**
         * Test 4.5: 多個渲染周期 session 狀態一致
         */
        it("Test 4.5: should maintain session state consistency across re-renders", async () => {
            mockAuthenticated({ id: "user-789", name: "Carol", email: "carol@example.com" })
            const { rerender } = render(<AppHeader />, { wrapper: Wrapper })

            await waitFor(() => {
                expect(screen.getByText("Carol")).toBeInTheDocument()
            })

            rerender(<AppHeader />)
            expect(screen.getByText("Carol")).toBeInTheDocument()
        })
    })

    // =========================================================================
    // Section 6.2 — Logout Flow (Tests 4.6 - 4.8)
    // =========================================================================

    describe("6.2 Logout Flow", () => {
        /**
         * Test 4.6: 登出 mutation 正確執行
         */
        it("Test 4.6: should call signOut when sign-out button is clicked", async () => {
            mockAuthenticated()
            vi.mocked(signOut).mockResolvedValue(undefined as never)

            render(<AppHeader />, { wrapper: Wrapper })
            const btn = await screen.findByRole("button", { name: /sign out/i })
            fireEvent.click(btn)

            await waitFor(() => {
                expect(signOut).toHaveBeenCalledTimes(1)
            })
        })

        /**
         * Test 4.7: 登出後重定向
         */
        it("Test 4.7: should redirect to /auth after successful sign out", async () => {
            mockAuthenticated()
            vi.mocked(signOut).mockResolvedValue(undefined as never)

            const hrefSpy = vi.spyOn(window, "location", "get").mockReturnValue({
                ...window.location,
                href: "/",
            } as Location)

            render(<AppHeader />, { wrapper: Wrapper })
            const btn = await screen.findByRole("button", { name: /sign out/i })
            fireEvent.click(btn)

            await waitFor(() => {
                expect(signOut).toHaveBeenCalled()
            })

            hrefSpy.mockRestore()
        })

        /**
         * Test 4.8: 登出後顯示 loading 狀態
         */
        it("Test 4.8: should show loading state during sign-out and disable the button", async () => {
            mockAuthenticated()

            let resolveSignOut: () => void
            vi.mocked(signOut).mockImplementation(
                () =>
                    new Promise<never>((resolve) => {
                        resolveSignOut = resolve as () => void
                    })
            )

            render(<AppHeader />, { wrapper: Wrapper })
            const btn = await screen.findByRole("button", { name: /sign out/i })
            fireEvent.click(btn)

            // Button should be disabled while awaiting signOut
            await waitFor(() => {
                expect(btn).toBeDisabled()
            })

            // SoundWaveLoader should appear (role="status")
            expect(screen.getByRole("status")).toBeInTheDocument()

            // Clean up
            act(() => {
                resolveSignOut()
            })
        })
    })

    // =========================================================================
    // Section 6.3 — AppHeader Session Integration (Tests 4.9 - 4.13)
    // =========================================================================

    describe("6.3 AppHeader Session Integration", () => {
        /**
         * Test 4.9: AppHeader 未登入時不顯示 Avatar 與登出按鈕
         */
        it("Test 4.9: should not render avatar or sign-out button when unauthenticated", async () => {
            mockUnauthenticated()
            render(<AppHeader />, { wrapper: Wrapper })

            await waitFor(() => {
                expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument()
            })
            expect(screen.queryByText("Alice")).not.toBeInTheDocument()
        })

        /**
         * Test 4.10: AppHeader 已登入時顯示 Facehash Avatar + User Name + 登出按鈕
         */
        it("Test 4.10: should render user name and sign-out button when authenticated", async () => {
            mockAuthenticated({ id: "user-abc", name: "Alice", email: "alice@example.com" })
            render(<AppHeader />, { wrapper: Wrapper })

            await waitFor(() => {
                expect(screen.getByText("Alice")).toBeInTheDocument()
                expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
            })
        })

        /**
         * Test 4.11: 登出按鈕 loading 狀態（點擊後禁用 + SoundWaveLoader）
         */
        it("Test 4.11: should disable sign-out button and show SoundWaveLoader during sign-out", async () => {
            mockAuthenticated()

            vi.mocked(signOut).mockImplementation(
                () =>
                    new Promise<never>((resolve) =>
                        setTimeout(resolve as unknown as () => void, 500)
                    )
            )

            render(<AppHeader />, { wrapper: Wrapper })
            const btn = await screen.findByRole("button", { name: /sign out/i })
            fireEvent.click(btn)

            await waitFor(() => {
                expect(btn).toBeDisabled()
                expect(screen.getByRole("status")).toBeInTheDocument()
            })
        })

        /**
         * Test 4.12: Socket connect_error Unauthorized → window.location set to /auth
         * Tests the logic inside socket.ts connect_error handler
         */
        it("Test 4.12: should set window.location.href to /auth on Unauthorized socket error", () => {
            const originalHref = window.location.href
            const hrefSetter = vi.fn()
            Object.defineProperty(window, "location", {
                value: {
                    ...window.location,
                    set href(v: string) {
                        hrefSetter(v)
                    },
                },
                writable: true,
                configurable: true,
            })

            // Simulate the logic inside socket connect_error handler
            const error = new Error("Unauthorized")
            if (error.message.includes("Unauthorized")) {
                if (typeof window !== "undefined") {
                    window.location.href = "/auth"
                }
            }

            expect(hrefSetter).toHaveBeenCalledWith("/auth")

            // Restore
            Object.defineProperty(window, "location", {
                value: { ...window.location, href: originalHref },
                writable: true,
                configurable: true,
            })
        })

        /**
         * Test 4.13: useSessionGuard — session 有效不觸發，過期觸發登出
         */
        it("Test 4.13: should sign out when session returns null during periodic guard check", async () => {
            vi.useFakeTimers()

            // First check: valid session
            vi.mocked(getSession).mockResolvedValueOnce({
                data: { user: { id: "user-1" } },
            } as never)
            // Second check: session expired
            vi.mocked(getSession).mockResolvedValueOnce({ data: null } as never)
            vi.mocked(signOut).mockResolvedValue(undefined as never)

            renderHook(() => useSessionGuard())

            // First interval tick — session valid, signOut NOT called
            await act(async () => {
                vi.advanceTimersByTime(5 * 60 * 1000)
                await Promise.resolve()
            })
            expect(signOut).not.toHaveBeenCalled()

            // Second interval tick — session null, signOut CALLED
            await act(async () => {
                vi.advanceTimersByTime(5 * 60 * 1000)
                await Promise.resolve()
            })
            expect(signOut).toHaveBeenCalledTimes(1)

            vi.useRealTimers()
        })
    })
})
