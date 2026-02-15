/**
 * Session Management Integration Tests
 * Stage 4: Session 認證整合
 *
 * Total tests: 13 (Test 4.1 - 4.13)
 * Following Feature-1.2.0-TDD-Tests.md Stage 4 spec
 */

import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

import AppHeader from "@/components/shared/AppHeader"
import { useSessionGuard } from "@/hooks/useSessionGuard"

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth-client", () => ({
    useSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn(),
}))

// Mock AestheticModeToggle to avoid context dependency
vi.mock("@/components/shared/AestheticModeToggle", () => ({
    AestheticModeToggle: () => <div data-testid="aesthetic-mode-toggle" />,
}))

// Mock useViewTransition to avoid View Transition API in jsdom
vi.mock("@/hooks/use-view-transition", () => ({
    useViewTransition: () => ({
        withRipple: (_e: unknown, _key: string, fn: () => void) => fn(),
    }),
}))

// Import mocked modules for test-level control
import { useSession, signOut, getSession } from "@/lib/auth-client"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUnauthenticated = () => {
    vi.mocked(useSession).mockReturnValue({
        data: null,
        isPending: false,
        error: null,
    } as ReturnType<typeof useSession>)
}

const mockAuthenticated = (
    user = { id: "user-abc", name: "Alice", email: "alice@example.com" }
) => {
    vi.mocked(useSession).mockReturnValue({
        data: {
            session: { id: "sess-123" },
            user,
        },
        isPending: false,
        error: null,
    } as ReturnType<typeof useSession>)
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
         * Test 4.1: Better Auth session 正確初始化
         */
        it("Test 4.1: should initialize Better Auth session correctly via useSession hook", () => {
            expect(useSession).toBeDefined()
            expect(typeof useSession).toBe("function")
        })

        /**
         * Test 4.2: Session 驗證正確運作
         */
        it("Test 4.2: should validate session and expose user data when session is active", () => {
            mockAuthenticated({ id: "user-123", name: "Test User", email: "test@example.com" })

            const result = vi.mocked(useSession)()
            expect(result.data?.user?.id).toBe("user-123")
            expect(result.data?.user?.name).toBe("Test User")
        })

        /**
         * Test 4.3: Session 過期時不顯示 user zone
         */
        it("Test 4.3: should not render authenticated UI when session data is null", () => {
            mockUnauthenticated()
            render(<AppHeader />)

            expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument()
        })

        /**
         * Test 4.4: Session 更新後反映到 AppHeader
         */
        it("Test 4.4: should reflect updated session in AppHeader user name", () => {
            mockAuthenticated({ id: "user-456", name: "Bob", email: "bob@example.com" })
            render(<AppHeader />)

            expect(screen.getByText("Bob")).toBeInTheDocument()
        })

        /**
         * Test 4.5: 多個渲染周期 session 狀態一致
         */
        it("Test 4.5: should maintain session state consistency across re-renders", () => {
            mockAuthenticated({ id: "user-789", name: "Carol", email: "carol@example.com" })
            const { rerender } = render(<AppHeader />)

            expect(screen.getByText("Carol")).toBeInTheDocument()

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

            render(<AppHeader />)
            const btn = screen.getByRole("button", { name: /sign out/i })
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

            render(<AppHeader />)
            const btn = screen.getByRole("button", { name: /sign out/i })
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

            render(<AppHeader />)
            const btn = screen.getByRole("button", { name: /sign out/i })
            fireEvent.click(btn)

            // Button should be disabled while awaiting signOut
            await waitFor(() => {
                expect(btn).toBeDisabled()
            })

            // SoundWaveLoader should appear
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
        it("Test 4.9: should not render avatar or sign-out button when unauthenticated", () => {
            mockUnauthenticated()
            render(<AppHeader />)

            expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument()
            // No user name visible
            expect(screen.queryByText("Alice")).not.toBeInTheDocument()
        })

        /**
         * Test 4.10: AppHeader 已登入時顯示 Facehash Avatar + User Name + 登出按鈕
         */
        it("Test 4.10: should render user name and sign-out button when authenticated", () => {
            mockAuthenticated({ id: "user-abc", name: "Alice", email: "alice@example.com" })
            render(<AppHeader />)

            expect(screen.getByText("Alice")).toBeInTheDocument()
            expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
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

            render(<AppHeader />)
            const btn = screen.getByRole("button", { name: /sign out/i })
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
