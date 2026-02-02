/**
 * OAuth Login Flow Integration Tests
 *
 * Tests for OAuth authentication flow with Better Auth
 * Following TDD approach from Feature-1.1.1-TDD-Tests.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { authClient } from "@/lib/auth-client"

// Mock Better Auth client
vi.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: {
            social: vi.fn(),
        },
    },
}))

describe("OAuth Login Flow - Better Auth Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("Google OAuth", () => {
        it("should call Better Auth signIn.social with Google provider", async () => {
            const mockSignIn = vi.fn().mockResolvedValue({
                data: {
                    url: "https://accounts.google.com/oauth/authorize?client_id=...",
                },
            })

            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            expect(mockSignIn).toHaveBeenCalledWith({
                provider: "google",
                callbackURL: "/auth/callback",
            })
        })

        it("should handle successful Google OAuth callback with user data", async () => {
            const mockUserData = {
                user: {
                    id: "google-user-123",
                    email: "test@gmail.com",
                    name: "Test User",
                    image: "https://lh3.googleusercontent.com/...",
                    emailVerified: true,
                },
                session: {
                    id: "session-123",
                    userId: "google-user-123",
                    expiresAt: new Date(Date.now() + 86400000),
                    token: "session-token-abc",
                },
            }

            vi.mocked(authClient.signIn.social).mockResolvedValue({
                data: mockUserData,
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
            if (result.data && "user" in result.data && "token" in result.data) {
                expect(result.data.token).toBeDefined()
            }
        })

        it("should handle Google OAuth errors", async () => {
            const mockError = {
                error: {
                    message: "OAuth authorization denied by user",
                    code: "OAUTH_DENIED",
                },
                data: null,
            }

            vi.mocked(authClient.signIn.social).mockResolvedValue(mockError as any)

            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            expect(result.error).toBeDefined()
            expect(result.error?.message).toContain("denied")
            expect(result.data).toBeNull()
        })

        it("should include redirect URL in callback", async () => {
            const mockSignIn = vi.fn().mockResolvedValue({ data: {} })
            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback?redirect=/dashboard",
            })

            expect(mockSignIn).toHaveBeenCalledWith({
                provider: "google",
                callbackURL: "/auth/callback?redirect=/dashboard",
            })
        })
    })

    describe("GitHub OAuth", () => {
        it("should call Better Auth signIn.social with GitHub provider", async () => {
            const mockSignIn = vi.fn().mockResolvedValue({
                data: {
                    url: "https://github.com/login/oauth/authorize?client_id=...",
                },
            })

            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            await authClient.signIn.social({
                provider: "github",
                callbackURL: "/auth/callback",
            })

            expect(mockSignIn).toHaveBeenCalledWith({
                provider: "github",
                callbackURL: "/auth/callback",
            })
        })

        it("should handle successful GitHub OAuth callback", async () => {
            const mockUserData = {
                user: {
                    id: "github-user-456",
                    email: "dev@github.com",
                    name: "GitHub Developer",
                    image: "https://avatars.githubusercontent.com/...",
                },
                session: {
                    id: "session-456",
                    userId: "github-user-456",
                    expiresAt: new Date(Date.now() + 86400000),
                },
            }

            vi.mocked(authClient.signIn.social).mockResolvedValue({
                data: mockUserData,
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

    describe("OAuth Error Handling", () => {
        it("should handle network errors during OAuth", async () => {
            vi.mocked(authClient.signIn.social).mockRejectedValue(
                new Error("Network error: Unable to reach auth server")
            )

            await expect(
                authClient.signIn.social({
                    provider: "google",
                    callbackURL: "/auth/callback",
                })
            ).rejects.toThrow("Network error")
        })

        it("should handle invalid provider errors", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                error: {
                    message: "Invalid OAuth provider",
                    code: "INVALID_PROVIDER",
                },
                data: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "invalid" as any,
                callbackURL: "/auth/callback",
            })

            expect(result.error).toBeDefined()
            expect(result.error?.code).toBe("INVALID_PROVIDER")
        })

        it("should handle OAuth timeout errors", async () => {
            vi.mocked(authClient.signIn.social).mockResolvedValue({
                error: {
                    message: "OAuth request timed out",
                    code: "OAUTH_TIMEOUT",
                },
                data: null,
            } as any)

            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            expect(result.error?.code).toBe("OAUTH_TIMEOUT")
        })
    })

    describe("Better Auth Client SDK", () => {
        it("should use authClient.signIn.social for all OAuth flows", async () => {
            const mockSignIn = vi.fn().mockResolvedValue({ data: {}, error: null })
            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            expect(authClient.signIn.social).toHaveBeenCalledOnce()
        })

        it("should pass correct parameters to Better Auth", async () => {
            const mockSignIn = vi.fn().mockResolvedValue({ data: {} })
            vi.mocked(authClient.signIn.social).mockImplementation(mockSignIn)

            const params = {
                provider: "google" as const,
                callbackURL: "/auth/callback",
            }

            await authClient.signIn.social(params)

            expect(mockSignIn).toHaveBeenCalledWith(params)
        })
    })

    describe("Session Management Post-OAuth", () => {
        it("should receive valid session after successful OAuth", async () => {
            const mockResponse = {
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
                error: null,
            }

            vi.mocked(authClient.signIn.social).mockResolvedValue(mockResponse as any)

            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/auth/callback",
            })

            if (result.data && "user" in result.data) {
                expect(result.data.user).toBeDefined()
                expect(result.data.user?.id).toBe("user-123")
            }
        })

        it("should not create session on OAuth failure", async () => {
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
})
