/**
 * OAuth Flow Integration Tests
 *
 * Tests for authentication middleware and OAuth login flow
 * Following TDD approach from Feature-1.1.1-TDD-Tests.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

import * as authClient from "@/lib/auth-client"
import { requireAuth, requireGuest, optionalAuth } from "@/middleware/auth.middleware"

// Mock Better Auth
vi.mock("@/lib/auth-client", () => ({
    getSession: vi.fn(),
    signIn: {
        social: vi.fn(),
    },
    signOut: vi.fn(),
    useSession: vi.fn(),
    authClient: {
        signIn: {
            social: vi.fn(),
        },
    },
}))

describe("Authentication Middleware - TanStack Start Integration", () => {
    describe("requireAuth middleware", () => {
        it("should allow access when user is authenticated", async () => {
            // Mock authenticated session
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: {
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
                },
            } as any)

            const result = await requireAuth()

            expect(result.session).toBeDefined()
            expect(result.session.user).toBeDefined()
            expect(result.session.user.email).toBe("test@example.com")
        })

        it("should redirect to /auth when user is not authenticated", async () => {
            // Mock unauthenticated session
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: null,
            } as any)

            // Mock window.location.pathname
            Object.defineProperty(globalThis, "location", {
                value: { pathname: "/dashboard" },
                writable: true,
            })

            await expect(requireAuth()).rejects.toMatchObject({
                options: {
                    to: "/auth",
                    search: {
                        redirect: "/dashboard",
                    },
                },
            })
        })

        it("should preserve intended destination URL in redirect", async () => {
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: null,
            } as any)

            Object.defineProperty(globalThis, "location", {
                value: { pathname: "/protected-page" },
                writable: true,
            })

            await expect(requireAuth()).rejects.toMatchObject({
                options: {
                    to: "/auth",
                    search: {
                        redirect: "/protected-page",
                    },
                },
            })
        })
    })

    describe("requireGuest middleware", () => {
        it("should allow access when user is not authenticated", async () => {
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: null,
            } as any)

            await expect(requireGuest()).resolves.toBeUndefined()
        })

        it("should redirect to home when user is already authenticated", async () => {
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: {
                    user: {
                        id: "user-123",
                        email: "test@example.com",
                    },
                    session: {
                        id: "session-123",
                        userId: "user-123",
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                },
            } as any)

            await expect(requireGuest()).rejects.toMatchObject({
                options: {
                    to: "/",
                },
            })
        })
    })

    describe("optionalAuth middleware", () => {
        it("should return session data when authenticated", async () => {
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: {
                    user: {
                        id: "user-123",
                        email: "test@example.com",
                    },
                    session: {
                        id: "session-123",
                        userId: "user-123",
                        expiresAt: new Date(Date.now() + 86400000),
                    },
                },
            } as any)

            const result = await optionalAuth()

            expect(result.session).toBeDefined()
            expect(result.session?.user?.email).toBe("test@example.com")
        })

        it("should return null session when not authenticated", async () => {
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: null,
            } as any)

            const result = await optionalAuth()

            expect(result.session).toBeNull()
        })

        it("should not redirect regardless of auth state", async () => {
            // Test with authenticated user
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: {
                    user: { id: "123", email: "test@example.com" },
                    session: { id: "session-123", userId: "123", expiresAt: new Date() },
                },
            } as any)

            await expect(optionalAuth()).resolves.toBeDefined()

            // Test with unauthenticated user
            vi.mocked(authClient.getSession).mockResolvedValue({
                data: null,
            } as any)

            await expect(optionalAuth()).resolves.toBeDefined()
        })
    })
})

describe("Better Auth Integration with TanStack Start", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should use Better Auth client SDK for session management", async () => {
        const getSessionSpy = vi.mocked(authClient.getSession)

        getSessionSpy.mockResolvedValue({
            data: {
                user: { id: "123", email: "test@example.com", name: "Test" },
                session: {
                    id: "session-123",
                    userId: "123",
                    expiresAt: new Date(Date.now() + 86400000),
                },
            },
        } as any)

        await requireAuth()

        expect(getSessionSpy).toHaveBeenCalledOnce()
    })

    it("should handle session expiry gracefully", async () => {
        vi.mocked(authClient.getSession).mockResolvedValue({
            data: null,
        } as any)

        Object.defineProperty(globalThis, "location", {
            value: { pathname: "/protected-page" },
            writable: true,
        })

        await expect(requireAuth()).rejects.toMatchObject({
            options: {
                to: "/auth",
            },
        })
    })
})
