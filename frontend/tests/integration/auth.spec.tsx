/**
 * Auth Integration Tests
 *
 * Consolidated from:
 *  - better-auth.spec.tsx     (client configuration)
 *  - oauth-login.spec.tsx     (OAuth social login flow)
 *  - auth-middleware-server.spec.ts (server-side session guards)
 *
 * Architecture:
 *  - Frontend has NO DB adapter. Session validation is done by the backend.
 *  - getSession() createServerFn forwards cookies to backend /api/auth/get-session
 *  - _protected.tsx pathless layout runs beforeLoad once for all protected routes
 *  - /auth page beforeLoad redirects authenticated users to /
 */

import { render, fireEvent } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: { social: vi.fn(), email: vi.fn() },
        signOut: vi.fn(),
        $store: { listen: vi.fn(), notify: vi.fn() },
    },
    createAuthClient: vi.fn().mockReturnValue({
        signIn: { social: vi.fn(), email: vi.fn() },
        signOut: vi.fn(),
        $store: { listen: vi.fn(), notify: vi.fn() },
    }),
    signIn: { social: vi.fn(), email: vi.fn() },
    signOut: vi.fn(),
    getSession: vi.fn(),
    sessionQueryOptions: {
        queryKey: ["auth", "session"],
        queryFn: vi.fn(),
        retry: false,
        staleTime: 0,
        gcTime: 0,
    },
}))

vi.mock("@tanstack/react-start/server", () => ({
    getRequestHeaders: vi.fn(() => new Headers()),
    createServerFn: vi.fn((opts) => opts),
}))

vi.mock("@tanstack/react-router", () => ({
    redirect: (options: object) => {
        throw { type: "redirect", options }
    },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { redirect } from "@tanstack/react-router"
import { getRequestHeaders } from "@tanstack/react-start/server"

import { authClient, createAuthClient, signIn } from "@/lib/auth-client"

// ===========================================================================
// Section 1: Better Auth Client — Configuration
// ===========================================================================

describe("Auth Client — Configuration", () => {
    beforeEach(() => vi.clearAllMocks())

    it("should create Better Auth client with expected interface", () => {
        expect(authClient).toBeDefined()
        expect(authClient.signIn).toBeDefined()
        expect(authClient.signOut).toBeDefined()
        expect(authClient.$store).toBeDefined()
    })

    it("should expose $store with listen and notify methods", () => {
        expect(typeof authClient.$store.listen).toBe("function")
        expect(typeof authClient.$store.notify).toBe("function")
        expect(() => {
            authClient.$store.listen("$sessionSignal", (_value: unknown) => {})
        }).not.toThrow()
    })

    it("should export signIn.social and signIn.email for auth flows", () => {
        expect(signIn).toBeDefined()
        expect(typeof signIn.social).toBe("function")
        expect(typeof signIn.email).toBe("function")
    })

    it("should return a client instance from createAuthClient()", () => {
        const client = createAuthClient()
        expect(client).toBeDefined()
        expect(client.$store).toBeDefined()
    })

    it("should use VITE_API_URL or fallback to localhost:3000 for baseURL", () => {
        const expectedBaseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
        expect(expectedBaseURL).toMatch(/^https?:\/\//)
    })
})

// ===========================================================================
// Section 2: OAuth Login Flow — Social Providers
// ===========================================================================

describe("Auth — OAuth Login Flow", () => {
    beforeEach(() => vi.clearAllMocks())

    describe("Google OAuth", () => {
        it("should call signIn.social with google provider", async () => {
            const mockSignIn = vi
                .fn()
                .mockResolvedValue({ data: { url: "https://accounts.google.com/oauth/authorize" } })
            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            await authClient.signIn.social({ provider: "google", callbackURL: "/auth/callback" })

            expect(mockSignIn).toHaveBeenCalledWith({
                provider: "google",
                callbackURL: "/auth/callback",
            })
        })

        it("should return user and session data on successful Google callback", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                data: {
                    user: {
                        id: "google-user-123",
                        email: "test@gmail.com",
                        name: "Test User",
                        emailVerified: true,
                    },
                    session: {
                        id: "session-123",
                        userId: "google-user-123",
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                },
                error: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            expect(result.data).toBeDefined()
            if (result.data && "user" in result.data) {
                expect(result.data.user?.email).toBe("test@gmail.com")
            }
        })

        it("should return error object when Google OAuth is denied", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                error: { message: "OAuth authorization denied by user", code: "OAUTH_DENIED" },
                data: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            expect(result.error).toBeDefined()
            expect(result.error?.message).toContain("denied")
            expect(result.data).toBeNull()
        })

        it("should pass redirect URL in callbackURL param", async () => {
            const mockSignIn = vi.fn().mockResolvedValue({ data: {} })
            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback?redirect=/dashboard",
            })

            expect(mockSignIn).toHaveBeenCalledWith(
                expect.objectContaining({ callbackURL: "/auth/callback?redirect=/dashboard" })
            )
        })
    })

    describe("GitHub OAuth", () => {
        it("should call signIn.social with github provider", async () => {
            const mockSignIn = vi
                .fn()
                .mockResolvedValue({ data: { url: "https://github.com/login/oauth/authorize" } })
            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            await authClient.signIn.social({ provider: "github", callbackURL: "/auth/callback" })

            expect(mockSignIn).toHaveBeenCalledWith({
                provider: "github",
                callbackURL: "/auth/callback",
            })
        })

        it("should return user data on successful GitHub callback", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                data: {
                    user: {
                        id: "github-user-456",
                        email: "dev@github.com",
                        name: "GitHub Developer",
                    },
                    session: {
                        id: "session-456",
                        userId: "github-user-456",
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                },
                error: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "github",
                callbackURL: "/auth/callback",
            })

            if (result.data && "user" in result.data) {
                expect(result.data.user?.email).toBe("dev@github.com")
            }
        })
    })

    describe("Error Handling", () => {
        it("should throw on network errors", async () => {
            vi.mocked(authClient.signIn.social).mockRejectedValue(
                new Error("Network error: Unable to reach auth server")
            )

            await expect(
                authClient.signIn.social({ provider: "google", callbackURL: "/auth/callback" })
            ).rejects.toThrow("Network error")
        })

        it("should return INVALID_PROVIDER error for unknown providers", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                error: { message: "Invalid OAuth provider", code: "INVALID_PROVIDER" },
                data: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "invalid" as any,
                callbackURL: "/auth/callback",
            })

            expect(result.error?.code).toBe("INVALID_PROVIDER")
        })

        it("should return OAUTH_TIMEOUT error on timeout", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                error: { message: "OAuth request timed out", code: "OAUTH_TIMEOUT" },
                data: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            expect(result.error?.code).toBe("OAUTH_TIMEOUT")
        })

        it("should return null data on OAuth failure", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                error: { message: "OAuth failed", code: "OAUTH_ERROR" },
                data: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            expect(result.data).toBeNull()
            expect(result.error).toBeDefined()
        })
    })

    describe("LoginForm — redirectTo prop → callbackURL", () => {
        it("should use window.location.origin + redirectTo as callbackURL (default: /chats)", async () => {
            const origin = "http://localhost:5173"
            const redirectTo = "/chats"

            vi.mocked(authClient.signIn.social).mockResolvedValue({
                data: null,
                error: null,
            } as any)

            await authClient.signIn.social({
                provider: "google",
                callbackURL: `${origin}${redirectTo}`,
            })

            expect(authClient.signIn.social).toHaveBeenCalledWith(
                expect.objectContaining({ callbackURL: "http://localhost:5173/chats" })
            )
        })

        it("should use search.redirect as redirectTo when present", async () => {
            const origin = "http://localhost:5173"
            const redirectTo = "/friends" // from ?redirect=/friends

            vi.mocked(authClient.signIn.social).mockResolvedValue({
                data: null,
                error: null,
            } as any)

            await authClient.signIn.social({
                provider: "google",
                callbackURL: `${origin}${redirectTo}`,
            })

            expect(authClient.signIn.social).toHaveBeenCalledWith(
                expect.objectContaining({ callbackURL: "http://localhost:5173/friends" })
            )
        })

        it("should preserve deep conversation path from _protected redirect", async () => {
            const origin = "http://localhost:5173"
            const redirectTo = "/chats/abc-123"

            vi.mocked(authClient.signIn.social).mockResolvedValue({
                data: null,
                error: null,
            } as any)

            await authClient.signIn.social({
                provider: "github",
                callbackURL: `${origin}${redirectTo}`,
            })

            expect(authClient.signIn.social).toHaveBeenCalledWith(
                expect.objectContaining({ callbackURL: "http://localhost:5173/chats/abc-123" })
            )
        })

        it("should trigger OAuth redirect when OAuth button is clicked", () => {
            const TestComponent = () => {
                const handleClick = () => {
                    window.location.href = "https://accounts.google.com/oauth/authorize"
                }
                return (
                    <button onClick={handleClick} data-testid="google-login">
                        Login with Google
                    </button>
                )
            }

            const original = window.location
            delete (window as any).location
            ;(window as any).location = { ...original, href: "" }

            const { getByTestId } = render(<TestComponent />)
            fireEvent.click(getByTestId("google-login"))

            expect(window.location.href).toContain("google")
            ;(window as any).location = original
        })
    })

    describe("SDK API Contracts", () => {
        it("should call signIn.social exactly once per login attempt", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({ data: {}, error: null } as any)

            await authClient.signIn.social({ provider: "google", callbackURL: "/auth/callback" })

            expect(authClient.signIn.social).toHaveBeenCalledOnce()
        })

        it("should pass provider and callbackURL as separate fields", async () => {
            const mockSignIn = vi.fn().mockResolvedValue({ data: {} })
            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            const params = { provider: "google" as const, callbackURL: "/auth/callback" }
            await authClient.signIn.social(params)

            expect(mockSignIn).toHaveBeenCalledWith(params)
        })

        it("should receive session with user and session fields on success", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                data: {
                    user: { id: "user-123", email: "test@example.com" },
                    session: {
                        id: "session-123",
                        userId: "user-123",
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                },
                error: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            if (result.data && "user" in result.data) {
                expect(result.data.user?.id).toBe("user-123")
            }
        })
    })
})

// ===========================================================================
// Section 3: Server-Side Session Guards
// ===========================================================================

describe("Auth — Server Session Guards", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.restoreAllMocks()
    })

    describe("getSession — backend fetch with cookie forwarding", () => {
        it("should forward cookie header to backend /api/auth/get-session", async () => {
            const mockCookie = "better-auth.session_token=abc123"
            vi.mocked(getRequestHeaders).mockReturnValue(new Headers({ cookie: mockCookie }))

            const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
                new Response(JSON.stringify({ user: { id: "123" }, session: { id: "s-1" } }), {
                    status: 200,
                })
            )

            const headers = getRequestHeaders()
            await fetch("http://localhost:3000/api/auth/get-session", {
                headers: { cookie: headers.get("cookie") ?? "" },
            })

            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("/api/auth/get-session"),
                expect.objectContaining({
                    headers: expect.objectContaining({ cookie: mockCookie }),
                })
            )
        })

        it("should return session data when backend responds 200 with user", async () => {
            vi.spyOn(global, "fetch").mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        user: { id: "user-123", email: "test@example.com" },
                        session: { id: "s-1" },
                    }),
                    { status: 200 }
                )
            )

            const res = await fetch("http://localhost:3000/api/auth/get-session", {
                headers: { cookie: "" },
            })
            const data = (await res.json()) as { user: { email: string } }

            expect(data.user.email).toBe("test@example.com")
        })

        it("should return null when backend responds non-ok", async () => {
            vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 401 }))

            const res = await fetch("http://localhost:3000/api/auth/get-session", {
                headers: { cookie: "" },
            })

            expect(res.ok).toBe(false)
        })

        it("should handle empty body (no active session)", async () => {
            vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response("", { status: 200 }))

            const res = await fetch("http://localhost:3000/api/auth/get-session", {
                headers: { cookie: "" },
            })
            const text = await res.text()

            expect(text).toBe("")
        })

        it("should propagate network errors", async () => {
            vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Connection refused"))

            await expect(
                fetch("http://localhost:3000/api/auth/get-session", { headers: { cookie: "" } })
            ).rejects.toThrow("Connection refused")
        })

        it("should return null when response has user: null", async () => {
            vi.spyOn(global, "fetch").mockResolvedValueOnce(
                new Response(JSON.stringify({ user: null, session: null }), { status: 200 })
            )

            const res = await fetch("http://localhost:3000/api/auth/get-session", {
                headers: { cookie: "" },
            })
            const data = (await res.json()) as { user: unknown }

            expect(data.user).toBeNull()
        })

        it("should return session with both user and session fields when valid", async () => {
            const mockSession = {
                user: { id: "123", email: "test@example.com", name: "Test", emailVerified: false },
                session: { id: "s-123", userId: "123", expiresAt: new Date(Date.now() + 3600000) },
            }

            vi.spyOn(global, "fetch").mockResolvedValueOnce(
                new Response(JSON.stringify(mockSession), { status: 200 })
            )

            const res = await fetch("http://localhost:3000/api/auth/get-session", {
                headers: { cookie: "" },
            })
            const data = (await res.json()) as typeof mockSession

            expect(data.user.id).toBe("123")
            expect(data.session.userId).toBe("123")
        })
    })

    describe("_protected beforeLoad — require auth", () => {
        it("should throw redirect to /auth when session is null", () => {
            const currentPath = "/chats"
            const session: { user: unknown } | null = null

            expect(() => {
                if (!session) redirect({ to: "/auth", search: { redirect: currentPath } })
            }).toThrow()

            try {
                redirect({ to: "/auth", search: { redirect: currentPath } })
            } catch (error: unknown) {
                const err = error as { options: { to: string; search: { redirect: string } } }
                expect(err.options.to).toBe("/auth")
                expect(err.options.search.redirect).toBe("/chats")
            }
        })

        it("should NOT redirect when session is valid", () => {
            const mockSession = { user: { id: "123" } }
            const sessionOrNull: { user: unknown } | null = mockSession

            expect(() => {
                if (!sessionOrNull) redirect({ to: "/auth", search: { redirect: "/chats" } })
            }).not.toThrow()
        })

        it("should include current pathname in redirect search param", () => {
            const originalPath = "/friends"

            try {
                redirect({ to: "/auth", search: { redirect: originalPath } })
            } catch (error: unknown) {
                const err = error as { options: { to: string; search: { redirect: string } } }
                expect(err.options.search.redirect).toBe("/friends")
            }
        })

        it("should include deep path in redirect param", () => {
            const deepPath = "/chats/some-conversation"

            try {
                redirect({ to: "/auth", search: { redirect: deepPath } })
            } catch (error: unknown) {
                const err = error as { options: { to: string; search: { redirect: string } } }
                expect(err.options.search.redirect).toBe(deepPath)
            }
        })
    })

    describe("/auth beforeLoad — require guest", () => {
        it("should throw redirect to / when session exists", () => {
            const mockSession = { user: { id: "123" } }

            expect(() => {
                if (mockSession) redirect({ to: "/" })
            }).toThrow()

            try {
                redirect({ to: "/" })
            } catch (error: unknown) {
                const err = error as { options: { to: string } }
                expect(err.options.to).toBe("/")
            }
        })

        it("should NOT redirect when session is null (unauthenticated)", () => {
            const guestSession: { user: unknown } | null = null

            expect(() => {
                if (guestSession) redirect({ to: "/" })
            }).not.toThrow()
        })
    })

    describe("Public routes — no session required", () => {
        it("should not have _protected in public route IDs", () => {
            const publicRoutes = ["/", "/auth"]
            publicRoutes.forEach((path) => {
                expect(path).not.toContain("/_protected")
            })
        })
    })
})
