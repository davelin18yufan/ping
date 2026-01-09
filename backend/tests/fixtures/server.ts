/**
 * Test Server Fixtures
 *
 * Helper functions for starting and stopping a real HTTP server
 * for Socket.io integration tests.
 */

import { type Server } from "bun"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { createYoga } from "graphql-yoga"
import type { PrismaClient } from "@generated/prisma/client"
import { sessionMiddleware, getAuthUserId, withPrisma } from "@/middleware"
import { schema } from "@/graphql/schema"
import { buildGraphQLContext } from "@/graphql/context"
import { initializeSocketIO } from "@/socket"
import { authHandler } from "@/lib/auth"

/**
 * Test Server Instance
 */
let testServer: Server<unknown> | null = null

/**
 * Test Server Port
 */
const TEST_PORT = 3000

/**
 * App Context with Prisma and Auth
 */
type AppContext = {
    Variables: {
        prisma: PrismaClient
        userId: string | null
        isAuthenticated: boolean
    }
}

/**
 * Create Test Hono App
 *
 * Creates a Hono app instance with all middleware and routes
 * for testing purposes.
 *
 * @returns Configured Hono app instance
 */
function createTestApp(): Hono<AppContext> {
    const app = new Hono<AppContext>()

    // GraphQL Yoga Setup
    const yoga = createYoga({
        schema,
        context: buildGraphQLContext,
        cors: false,
        graphiql: false,
        logging: "error",
    })

    // CORS middleware
    app.use(
        "*",
        cors({
            origin: ["http://localhost:3001", "http://localhost:8081"],
            credentials: true,
        })
    )

    // Prisma middleware
    app.use("*", withPrisma)

    // Better Auth Routes
    app.on(["POST", "GET"], "/api/auth/**", (c) => {
        return authHandler(c.req.raw)
    })

    // Health check endpoints
    app.get("/", (c) => {
        return c.json({
            status: "ok",
            message: "Ping API Test Server",
            version: "1.0.0-test",
        })
    })

    app.get("/api/health", (c) => {
        return c.json({
            status: "ok",
            timestamp: new Date().toISOString(),
        })
    })

    // Protected endpoint
    app.get("/api/me", sessionMiddleware, (c) => {
        const userId = getAuthUserId(c)

        if (!userId) {
            return c.json(
                {
                    error: "Unauthorized",
                    message: "You must be logged in to access this endpoint",
                },
                401
            )
        }

        return c.json({
            userId,
            authenticated: true,
        })
    })

    // GraphQL Routes
    app.use("/graphql", sessionMiddleware)
    app.all("/graphql", async (c) => {
        const request = c.req.raw as Request & {
            _userId?: string | null
            _isAuthenticated?: boolean
            _prisma?: PrismaClient
        }

        request._userId = c.get("userId")
        request._isAuthenticated = c.get("isAuthenticated")
        request._prisma = c.get("prisma")

        return yoga.fetch(request)
    })

    // Error Handling
    app.notFound((c) => {
        return c.json(
            {
                error: "Not Found",
                message: "The requested endpoint does not exist",
            },
            404
        )
    })

    app.onError((err, c) => {
        console.error("Test server error:", err)

        return c.json(
            {
                error: "Internal Server Error",
                message: err.message,
            },
            500
        )
    })

    return app
}

/**
 * Start Test Server
 *
 * Starts a real HTTP server with Socket.io support for testing.
 * Should be called in `beforeAll()` hooks.
 *
 * @returns Promise that resolves when server is ready
 */
export async function startTestServer(): Promise<void> {
    // Check if server is already running
    if (testServer) {
        console.warn("Test server already running")
        return
    }

    // Create Hono app
    const app = createTestApp()

    // Initialize Socket.io
    const { engine } = initializeSocketIO()

    // Start server with Bun.serve
    testServer = Bun.serve({
        port: TEST_PORT,
        ...engine.handler(),

        async fetch(request, server) {
            const url = new URL(request.url)

            // Route Socket.io requests to Bun Engine
            if (url.pathname.startsWith("/socket.io/")) {
                return engine.handleRequest(request, server)
            }

            // Route all other requests to Hono
            return app.fetch(request)
        },
    })

    // Wait for server to be ready
    await waitForServerReady()

    console.log(`✓ Test server started on port ${TEST_PORT}`)
}

/**
 * Stop Test Server
 *
 * Stops the test server and cleans up resources.
 * Should be called in `afterAll()` hooks.
 *
 * @returns Promise that resolves when server is stopped
 */
export async function stopTestServer(): Promise<void> {
    if (!testServer) {
        console.warn("Test server not running")
        return
    }

    // Stop server
    testServer.stop(true)
    testServer = null

    // Wait a bit for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100))

    console.log("✓ Test server stopped")
}

/**
 * Wait for Server Ready
 *
 * Polls the health endpoint until server is ready.
 * Useful to ensure server is fully initialized before running tests.
 *
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when server is ready
 */
async function waitForServerReady(timeout: number = 5000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
        try {
            const response = await fetch(`http://localhost:${TEST_PORT}/api/health`)
            if (response.ok) {
                return
            }
        } catch {
            // Server not ready yet, wait and retry
        }

        // Wait 100ms before retry
        await new Promise((resolve) => setTimeout(resolve, 100))
    }

    throw new Error(`Test server failed to start within ${timeout}ms`)
}

/**
 * Check if Server is Running
 *
 * @returns True if test server is running
 */
export function isTestServerRunning(): boolean {
    return testServer !== null
}

/**
 * Get Test Server Port
 *
 * @returns Test server port number
 */
export function getTestServerPort(): number {
    return TEST_PORT
}
