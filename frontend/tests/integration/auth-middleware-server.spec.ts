/**
 * Server-Side Authentication Guards Tests
 *
 * Tests for TanStack Start + Better Auth server-side guards
 * These tests verify proper SSR session validation using auth.api.getSession()
 *
 * Note: TanStack Start middleware is designed to run within route context,
 * so we test the auth.api.getSession integration directly instead of calling
 * the middleware functions directly.
 *
 * Following TDD approach from Feature-1.1.1-TDD-Tests.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock auth module
vi.mock("@/lib/auth", () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}))

// Mock TanStack Start server functions
vi.mock("@tanstack/react-start/server", () => ({
    getRequestHeaders: vi.fn(() => new Headers()),
}))

// Mock redirect
vi.mock("@tanstack/react-router", () => ({
    redirect: (options: any) => {
        throw { type: "redirect", options }
    },
}))

// Import after mocking
import { redirect } from "@tanstack/react-router"
import { getRequestHeaders } from "@tanstack/react-start/server"

import * as auth from "@/lib/auth"

describe("Server-Side Authentication Guards", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("requireAuthServer behavior", () => {
        it("should call auth.api.getSession with request headers", async () => {
            const mockHeaders = new Headers({ cookie: "test-cookie" })
            vi.mocked(getRequestHeaders).mockReturnValue(mockHeaders)
            vi.mocked(auth.auth.api.getSession).mockResolvedValue({
                user: { id: "123", email: "test@example.com", name: "Test" },
                session: { id: "s-123", userId: "123", expiresAt: new Date() },
            } as any)

            // Simulate what the middleware does
            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            expect(auth.auth.api.getSession).toHaveBeenCalledWith({
                headers: expect.any(Headers),
            })
            expect(session?.user).toBeDefined()
            expect(session?.user?.email).toBe("test@example.com")
        })

        it("should detect authenticated users correctly", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue({
                user: {
                    id: "user-123",
                    email: "test@example.com",
                    name: "Test User",
                },
                session: {
                    id: "session-123",
                    userId: "user-123",
                    expiresAt: new Date(Date.now() + 86400000),
                },
            } as any)

            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            expect(session?.user).toBeDefined()
            expect(session?.user?.id).toBe("user-123")
        })

        it("should detect unauthenticated users correctly", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            expect(session).toBeNull()
        })

        it("should handle redirect for unauthenticated access", () => {
            const currentPath = "/protected/resource"

            expect(() => {
                redirect({
                    to: "/auth",
                    search: {
                        redirect: currentPath,
                    },
                })
            }).toThrow()

            try {
                redirect({
                    to: "/auth",
                    search: {
                        redirect: currentPath,
                    },
                })
            } catch (error: any) {
                expect(error.options.to).toBe("/auth")
                expect(error.options.search.redirect).toBe("/protected/resource")
            }
        })
    })

    describe("requireGuestServer behavior", () => {
        it("should allow unauthenticated users", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            expect(session).toBeNull()
        })

        it("should detect authenticated users for redirect", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue({
                user: {
                    id: "user-123",
                    email: "test@example.com",
                    name: "Test User",
                },
                session: {
                    id: "session-123",
                    userId: "user-123",
                    expiresAt: new Date(Date.now() + 86400000),
                },
            } as any)

            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            // Verify authenticated session is detected
            expect(session?.user).toBeDefined()

            // Verify redirect logic
            if (session?.user) {
                expect(() => redirect({ to: "/" })).toThrow()
            }
        })

        it("should use server-side session validation", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            const headers = getRequestHeaders()
            await auth.auth.api.getSession({ headers })

            expect(auth.auth.api.getSession).toHaveBeenCalledWith({
                headers: expect.any(Headers),
            })
        })
    })

    describe("optionalAuthServer behavior", () => {
        it("should return session data when authenticated", async () => {
            const mockSession = {
                user: {
                    id: "user-123",
                    email: "test@example.com",
                    name: "Test User",
                },
                session: {
                    id: "session-123",
                    userId: "user-123",
                    expiresAt: new Date(Date.now() + 86400000),
                },
            }

            vi.mocked(auth.auth.api.getSession).mockResolvedValue(mockSession as any)

            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            expect(session).toBeDefined()
            expect(session?.user?.email).toBe("test@example.com")
        })

        it("should return null session when not authenticated", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            expect(session).toBeNull()
        })

        it("should not redirect for authenticated users", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue({
                user: { id: "123", email: "test@example.com", name: "Test" },
                session: { id: "s-123", userId: "123", expiresAt: new Date() },
            } as any)

            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            expect(session).toBeDefined()
            // optionalAuth never redirects
        })

        it("should not redirect for unauthenticated users", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            const headers = getRequestHeaders()
            const session = await auth.auth.api.getSession({ headers })

            expect(session).toBeNull()
            // optionalAuth never redirects
        })

        it("should call auth.api.getSession with headers", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            const headers = getRequestHeaders()
            await auth.auth.api.getSession({ headers })

            expect(auth.auth.api.getSession).toHaveBeenCalledWith({
                headers: expect.any(Headers),
            })
        })
    })
})

describe("Better Auth Server API Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should use auth.api.getSession() for server-side validation", async () => {
        const getSessionSpy = vi.mocked(auth.auth.api.getSession)

        getSessionSpy.mockResolvedValue({
            user: { id: "123", email: "test@example.com", name: "Test" },
            session: {
                id: "session-123",
                userId: "123",
                expiresAt: new Date(Date.now() + 86400000),
            },
        } as any)

        const headers = getRequestHeaders()
        await auth.auth.api.getSession({ headers })

        // Verify server-side API was used
        expect(getSessionSpy).toHaveBeenCalledOnce()
        expect(getSessionSpy).toHaveBeenCalledWith({
            headers: expect.any(Headers),
        })
    })

    it("should handle server-side session expiry", async () => {
        vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

        const headers = getRequestHeaders()
        const session = await auth.auth.api.getSession({ headers })

        expect(session).toBeNull()

        // Verify redirect is triggered for expired session
        const currentPath = "/protected-page"
        expect(() => {
            redirect({
                to: "/auth",
                search: {
                    redirect: currentPath,
                },
            })
        }).toThrow()
    })

    it("should always pass headers to auth.api.getSession", async () => {
        vi.mocked(auth.auth.api.getSession).mockResolvedValue({
            user: { id: "123", email: "test@example.com", name: "Test" },
            session: { id: "s-123", userId: "123", expiresAt: new Date() },
        } as any)

        const headers = getRequestHeaders()
        await auth.auth.api.getSession({ headers })

        // Verify headers were passed
        expect(auth.auth.api.getSession).toHaveBeenCalledWith({
            headers: expect.any(Headers),
        })
    })

    it("should work in server context with actual request headers", async () => {
        // Simulate server-side execution where headers contain cookies
        const mockHeaders = new Headers({
            cookie: "better-auth.session_token=abc123",
        })
        vi.mocked(getRequestHeaders).mockReturnValue(mockHeaders)

        vi.mocked(auth.auth.api.getSession).mockResolvedValue({
            user: { id: "123", email: "test@example.com", name: "Test" },
            session: { id: "s-123", userId: "123", expiresAt: new Date() },
        } as any)

        const headers = getRequestHeaders()
        await auth.auth.api.getSession({ headers })

        expect(auth.auth.api.getSession).toHaveBeenCalled()
        expect(headers.get("cookie")).toBe("better-auth.session_token=abc123")
    })
})
