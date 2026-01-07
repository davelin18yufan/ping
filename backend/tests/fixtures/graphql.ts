/**
 * GraphQL Test Fixtures
 *
 * Helper functions for testing GraphQL endpoints.
 */

import type { PrismaClient } from "@generated/prisma/client"
import app from "@/index"

/**
 * Execute a GraphQL query/mutation
 *
 * Sends a GraphQL request to the /graphql endpoint with optional authentication.
 *
 * @param query - GraphQL query or mutation string
 * @param variables - Query variables (optional)
 * @param sessionToken - Session token for authentication (optional)
 * @returns Response from GraphQL endpoint
 */
export async function executeGraphQL(
    query: string,
    variables?: Record<string, unknown>,
    sessionToken?: string
): Promise<Response> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }

    // Add session cookie if provided
    if (sessionToken) {
        headers["Cookie"] = `better-auth.session_token=${sessionToken}`
    }

    const request = new Request("http://localhost/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({
            query,
            variables,
        }),
    })

    return app.fetch(request)
}

/**
 * Create a test user with valid session
 *
 * Creates a user in the database and a valid session token.
 * Useful for testing authenticated GraphQL queries.
 *
 * @param prisma - Prisma client instance
 * @returns Object with user, session, and sessionToken
 */
export async function createTestUserWithSession(prisma: PrismaClient): Promise<{
    user: {
        id: string
        email: string
        name: string | null
        image: string | null
        emailVerified: Date | null
        createdAt: Date
        updatedAt: Date
    }
    session: {
        id: string
        sessionToken: string
        userId: string
        expires: Date
    }
    sessionToken: string
}> {
    // Create test user
    const user = await prisma.user.create({
        data: {
            email: `test-graphql-${Date.now()}@example.com`,
            name: "GraphQL Test User",
            emailVerified: new Date(),
        },
    })

    // Create valid session (expires in 7 days)
    const sessionToken = `test-graphql-session-${Date.now()}`
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            sessionToken: sessionToken,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        },
    })

    return {
        user,
        session,
        sessionToken,
    }
}

/**
 * Create a test user with expired session
 *
 * Creates a user with an expired session token.
 * Useful for testing session expiration handling.
 *
 * @param prisma - Prisma client instance
 * @returns Object with user, session, and sessionToken
 */
export async function createTestUserWithExpiredSession(prisma: PrismaClient): Promise<{
    user: {
        id: string
        email: string
        name: string | null
        image: string | null
        emailVerified: Date | null
        createdAt: Date
        updatedAt: Date
    }
    session: {
        id: string
        sessionToken: string
        userId: string
        expires: Date
    }
    sessionToken: string
}> {
    // Create test user
    const user = await prisma.user.create({
        data: {
            email: `test-expired-${Date.now()}@example.com`,
            name: "Expired Session User",
            emailVerified: new Date(),
        },
    })

    // Create expired session (expired 1 hour ago)
    const sessionToken = `expired-session-${Date.now()}`
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            sessionToken: sessionToken,
            expires: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        },
    })

    return {
        user,
        session,
        sessionToken,
    }
}

/**
 * Parse GraphQL response
 *
 * Helper to extract data or errors from GraphQL response.
 *
 * @param response - Fetch Response object
 * @returns Parsed GraphQL response with data and errors
 */
export async function parseGraphQLResponse<T = unknown>(
    response: Response
): Promise<{
    data?: T
    errors?: Array<{
        message: string
        extensions?: Record<string, unknown>
    }>
}> {
    const json = await response.json()
    return json as {
        data?: T
        errors?: Array<{
            message: string
            extensions?: Record<string, unknown>
        }>
    }
}
