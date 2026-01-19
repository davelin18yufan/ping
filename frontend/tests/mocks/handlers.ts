/**
 * MSW (Mock Service Worker) Handlers
 *
 * Mock Better Auth API endpoints for testing
 */

import { http, HttpResponse } from "msw"

const BASE_URL = "http://localhost:3000"

/**
 * Mock user session data
 */
export const mockUserSession = {
    user: {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    session: {
        id: "session-1",
        userId: "1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        token: "session-token-123",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
    },
}

/**
 * Mock OAuth user session data
 */
export const mockOAuthSession = {
    user: {
        id: "2",
        email: "oauth@example.com",
        name: "OAuth User",
        emailVerified: true,
        image: "https://example.com/avatar.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    session: {
        id: "session-2",
        userId: "2",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        token: "oauth-session-token",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
    },
}

/**
 * MSW Handlers for Better Auth API
 */
export const handlers = [
    // GET /api/auth/session - Get current user session
    http.get(`${BASE_URL}/api/auth/session`, () => {
        return HttpResponse.json(mockUserSession, { status: 200 })
    }),

    // POST /api/auth/sign-in/social - OAuth sign-in
    http.post(`${BASE_URL}/api/auth/sign-in/social`, async ({ request }) => {
        const body = await request.json()
        const { provider } = body as { provider: string }

        if (!provider) {
            return HttpResponse.json({ error: "Provider is required" }, { status: 400 })
        }

        // Mock OAuth redirect URL
        const redirectUrl = `https://accounts.${provider}.com/oauth/authorize?client_id=test&redirect_uri=${encodeURIComponent(`${BASE_URL}/api/auth/callback/${provider}`)}`

        return HttpResponse.json(
            {
                url: redirectUrl,
            },
            { status: 200 }
        )
    }),

    // GET /api/auth/callback/:provider - OAuth callback
    http.get(`${BASE_URL}/api/auth/callback/:provider`, () => {
        // Return OAuth session after successful callback
        return HttpResponse.json(mockOAuthSession, { status: 200 })
    }),

    // POST /api/auth/sign-out - Sign out
    http.post(`${BASE_URL}/api/auth/sign-out`, () => {
        return HttpResponse.json(
            {
                success: true,
            },
            { status: 200 }
        )
    }),
]

/**
 * Handler for no session (not logged in)
 */
export const noSessionHandler = http.get(`${BASE_URL}/api/auth/session`, () => {
    return HttpResponse.json(
        {
            user: null,
            session: null,
        },
        { status: 200 }
    )
})

/**
 * Handler for OAuth redirect (simulates browser redirect)
 */
export const oauthRedirectHandler = http.post(
    `${BASE_URL}/api/auth/sign-in/social`,
    async ({ request }) => {
        const body = await request.json()
        const { provider } = body as { provider: string }

        // Simulate redirect by returning redirect URL
        const redirectUrl = `https://accounts.${provider}.com/oauth/authorize`

        return HttpResponse.json(
            {
                url: redirectUrl,
            },
            { status: 200 }
        )
    }
)
