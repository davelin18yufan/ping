/**
 * Ping Backend Server
 *
 * Main entry point for the Hono server with:
 * - Better Auth integration for OAuth authentication
 * - Session management middleware
 * - API routes for authentication
 */

import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { createYoga } from "graphql-yoga"
import type { PrismaClient } from "@generated/prisma/client"
import { authHandler } from "./lib/auth"
import { sessionMiddleware, getAuthUserId, withPrisma } from "./middleware"
import { schema } from "./graphql/schema"
import { buildGraphQLContext } from "./graphql/context"
import { initializeSocketIO } from "./socket"

/**
 * App Context with Prisma and Auth
 *
 * Defines all context variables available in route handlers.
 */
type AppContext = {
    Variables: {
        prisma: PrismaClient
        userId: string | null
        isAuthenticated: boolean
    }
}

const app = new Hono<AppContext>()

// ============================================================================
// GraphQL Yoga Setup
// ============================================================================

/**
 * GraphQL Yoga instance
 *
 * Configured with:
 * - Custom schema with User queries
 * - Context builder that extracts auth from Hono
 * - CORS handled by Hono middleware
 */
const yoga = createYoga({
    schema,
    context: buildGraphQLContext,
    // Let Hono handle CORS
    cors: false,
    // GraphiQL enabled in development
    graphiql: process.env.NODE_ENV === "development",
    // Logging
    logging: process.env.NODE_ENV === "development" ? "debug" : "error",
})

// ============================================================================
// Middleware Setup
// ============================================================================

// Logger middleware (development)
if (process.env.NODE_ENV === "development") {
    app.use("*", logger())
}

// CORS middleware
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") ?? [
    "http://localhost:3001", // Frontend Web
    "http://localhost:8081", // Mobile Expo
]

app.use(
    "*",
    cors({
        origin: allowedOrigins,
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    })
)

// Prisma middleware (inject Prisma client into context)
app.use("*", withPrisma)

// ============================================================================
// Better Auth Routes
// ============================================================================

/**
 * All Better Auth routes are handled under /api/auth/*
 *
 * Available endpoints:
 * - POST /api/auth/sign-in/social - OAuth sign-in
 * - POST /api/auth/sign-out - Sign out
 * - GET  /api/auth/session - Get current session
 * - GET  /api/auth/callback/* - OAuth callbacks
 */
app.on(["POST", "GET"], "/api/auth/**", (c) => {
    return authHandler(c.req.raw)
})

// ============================================================================
// Public Routes
// ============================================================================

/**
 * Health check endpoint
 */
app.get("/", (c) => {
    return c.json({
        status: "ok",
        message: "Ping API Server",
        version: "1.0.0",
    })
})

/**
 * Server status endpoint
 */
app.get("/api/health", (c) => {
    return c.json({
        status: "ok",
        timestamp: new Date().toISOString(),
    })
})

// ============================================================================
// Protected Routes (require authentication)
// ============================================================================

/**
 * Test endpoint to verify authentication
 * Requires valid session
 */
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

// ============================================================================
// GraphQL Routes
// ============================================================================

/**
 * GraphQL endpoint at /graphql
 *
 * Protected by sessionMiddleware to inject userId into context.
 * Supports both GET (GraphiQL) and POST (queries/mutations) requests.
 *
 * Available queries:
 * - me: Get current authenticated user
 */
app.use("/graphql", sessionMiddleware)
app.all("/graphql", async (c) => {
    // Attach auth data to request for Yoga context builder
    const request = c.req.raw as Request & {
        _userId?: string | null
        _isAuthenticated?: boolean
        _prisma?: PrismaClient
    }

    request._userId = c.get("userId")
    request._isAuthenticated = c.get("isAuthenticated")
    request._prisma = c.get("prisma")

    // Pass request to GraphQL Yoga
    return yoga.fetch(request)
})

// ============================================================================
// Error Handling
// ============================================================================

/**
 * 404 handler for unknown routes
 */
app.notFound((c) => {
    return c.json(
        {
            error: "Not Found",
            message: "The requested endpoint does not exist",
        },
        404
    )
})

/**
 * Global error handler
 */
app.onError((err, c) => {
    console.error("Server error:", err)

    return c.json(
        {
            error: "Internal Server Error",
            message:
                process.env.NODE_ENV === "development"
                    ? err.message
                    : "An unexpected error occurred",
        },
        500
    )
})

// ============================================================================
// Socket.io Initialization
// ============================================================================

/**
 * Initialize Socket.io with Bun Engine
 *
 * Must be called before starting the server to enable WebSocket support.
 * Only initialize if not in test environment which has its own mock initiation.
 */
if (process.env.NODE_ENV !== "test") {
    const { engine } = initializeSocketIO()

    // ============================================================================
    // Server Startup
    // ============================================================================

    /**
     * Start server with Bun.serve
     *
     * Supports both HTTP (Hono) and WebSocket (Socket.io) connections.
     */
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000

    Bun.serve({
        port: PORT,
        // Use Bun Engine handler configuration
        ...engine.handler(),

        /**
         * HTTP request handler override
         *
         * Routes:
         * - /socket.io/* -> Socket.io WebSocket handler (via engine.handleRequest)
         * - All others -> Hono app
         */
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

    console.log(`
      ┌───────────────────────────────────────────────┐
      │  Ping Backend Server                          │
      ├───────────────────────────────────────────────┤
      │  HTTP:       http://localhost:${PORT}         │
      │  GraphQL:    http://localhost:${PORT}/graphql │
      │  Socket.io:  ws://localhost:${PORT}/socket.io/│
      └───────────────────────────────────────────────┘
    `)
}

// Export app for testing (without starting server)
export default app
