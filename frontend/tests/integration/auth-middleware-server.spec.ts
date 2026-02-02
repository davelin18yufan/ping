/**
 * Server-Side Authentication Guards Tests
 *
 * Tests for TanStack Start + Better Auth server-side guards
 * These tests verify proper SSR session validation using auth.api.getSession()
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

// Import after mocking
import * as auth from "@/lib/auth"
import {
    requireAuthServer,
    requireGuestServer,
    optionalAuthServer,
} from "@/middleware/auth.middleware.server"

describe("Server-Side Authentication Guards", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("requireAuthServer", () => {
        it("should allow access when user is authenticated", async () => {
            // Mock authenticated session from server
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

            const result = await requireAuthServer()

            expect(result.session).toBeDefined()
            expect(result.session.user).toBeDefined()
            expect(result.session.user.email).toBe("test@example.com")
        })

        it("should redirect to /auth when user is not authenticated", async () => {
            // Mock unauthenticated session
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            // Mock window.location.pathname
            Object.defineProperty(globalThis, "location", {
                value: { pathname: "/dashboard" },
                writable: true,
            })

            // Should throw redirect
            await expect(requireAuthServer()).rejects.toMatchObject({
                options: {
                    to: "/auth",
                    search: {
                        redirect: "/dashboard",
                    },
                },
            })
        })

        it("should call auth.api.getSession with headers", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue({
                user: { id: "123", email: "test@example.com", name: "Test" },
                session: { id: "s-123", userId: "123", expiresAt: new Date() },
            } as any)

            await requireAuthServer()

            // Verify auth.api.getSession was called with headers
            expect(auth.auth.api.getSession).toHaveBeenCalledWith({
                headers: expect.any(Headers),
            })
        })

        it("should preserve intended destination URL in redirect", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            Object.defineProperty(globalThis, "location", {
                value: { pathname: "/protected/resource" },
                writable: true,
            })

            await expect(requireAuthServer()).rejects.toMatchObject({
                options: {
                    to: "/auth",
                    search: {
                        redirect: "/protected/resource",
                    },
                },
            })
        })
    })

    describe("requireGuestServer", () => {
        it("should allow access when user is not authenticated", async () => {
            // Mock unauthenticated session
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            // Should not throw
            await expect(requireGuestServer()).resolves.toBeUndefined()
        })

        it("should redirect to home when user is already authenticated", async () => {
            // Mock authenticated session
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

            // Should throw redirect
            await expect(requireGuestServer()).rejects.toMatchObject({
                options: {
                    to: "/",
                },
            })
        })

        it("should use server-side session validation", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            await requireGuestServer()

            // Verify server-side API was called with headers
            expect(auth.auth.api.getSession).toHaveBeenCalledWith({
                headers: expect.any(Headers),
            })
        })
    })

    describe("optionalAuthServer", () => {
        it("should return session data when authenticated", async () => {
            // Mock authenticated session
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

            const result = await optionalAuthServer()

            expect(result.session).toBeDefined()
            expect(result.session?.user?.email).toBe("test@example.com")
        })

        it("should return null session when not authenticated", async () => {
            // Mock unauthenticated session
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            const result = await optionalAuthServer()

            expect(result.session).toBeNull()
        })

        it("should not redirect regardless of auth state", async () => {
            // Test with authenticated user
            vi.mocked(auth.auth.api.getSession).mockResolvedValue({
                user: { id: "123", email: "test@example.com", name: "Test" },
                session: { id: "s-123", userId: "123", expiresAt: new Date() },
            } as any)

            await expect(optionalAuthServer()).resolves.toBeDefined()

            // Test with unauthenticated user
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            await expect(optionalAuthServer()).resolves.toBeDefined()
        })

        it("should pass session data to caller", async () => {
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

            const result = await optionalAuthServer()

            expect(result.session).toEqual(mockSession)
        })

        it("should call auth.api.getSession with headers", async () => {
            vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

            await optionalAuthServer()

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

        await requireAuthServer()

        // Verify server-side API was used
        expect(getSessionSpy).toHaveBeenCalledOnce()
        expect(getSessionSpy).toHaveBeenCalledWith({
            headers: expect.any(Headers),
        })
    })

    it("should handle server-side session expiry", async () => {
        vi.mocked(auth.auth.api.getSession).mockResolvedValue(null as any)

        Object.defineProperty(globalThis, "location", {
            value: { pathname: "/protected-page" },
            writable: true,
        })

        await expect(requireAuthServer()).rejects.toMatchObject({
            options: {
                to: "/auth",
            },
        })
    })

    it("should always pass headers to auth.api.getSession", async () => {
        vi.mocked(auth.auth.api.getSession).mockResolvedValue({
            user: { id: "123", email: "test@example.com", name: "Test" },
            session: { id: "s-123", userId: "123", expiresAt: new Date() },
        } as any)

        await requireAuthServer()

        // Verify headers were passed (even if empty in test environment)
        expect(auth.auth.api.getSession).toHaveBeenCalledWith({
            headers: expect.any(Headers),
        })
    })

    it("should work in server context with actual request headers", async () => {
        // This test simulates server-side execution where headers contain cookies
        vi.mocked(auth.auth.api.getSession).mockResolvedValue({
            user: { id: "123", email: "test@example.com", name: "Test" },
            session: { id: "s-123", userId: "123", expiresAt: new Date() },
        } as any)

        await requireAuthServer()

        // In real server context, getWebHeaders() would use getRequestHeaders()
        // Here we verify it was called with some headers
        expect(auth.auth.api.getSession).toHaveBeenCalled()
    })
})
