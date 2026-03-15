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
import { useDisableIntrospection } from "@graphql-yoga/plugin-disable-introspection"
import { maxDepthPlugin } from "@escape.tech/graphql-armor-max-depth"
import type { PrismaClient } from "@generated/prisma/client"
import { authHandler } from "./lib/auth"
import { sessionMiddleware, getAuthUserId, withPrisma } from "./middleware"
import { schema } from "./graphql/schema"
import { buildGraphQLContext } from "./graphql/context"
import { initializeSocketIO } from "./socket"
import { Server } from "bun"

/**
 * Maximum allowed query depth.
 * Prevents deeply nested queries from causing excessive database load.
 * Depth 10 accommodates nested fragment spreads (each spread counts +1 toward depth):
 *   query(1) → conversations(2) → ConversationBasicFields(3) → lastMessage(4)
 *   → MessageFields(5) → sender(6) → UserConversationFields(7) → id(8)
 */
const MAX_QUERY_DEPTH = 10

/**
 * App Context with Prisma and Auth
 *
 * Defines all context variables available in route handlers.
 */
type AppContext = {
    Variables: {
        prisma: PrismaClient
        userId: string | null
        sessionId: string | null
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
    // GraphiQL enabled in development only
    graphiql: process.env.NODE_ENV === "development",
    // Logging
    logging: process.env.NODE_ENV === "development" ? "debug" : "error",
    plugins: [
        // Prevent deeply nested queries from DoS-ing the server
        maxDepthPlugin({ n: MAX_QUERY_DEPTH }),
        // Disable introspection in production to avoid exposing schema structure
        ...(process.env.NODE_ENV === "production" ? [useDisableIntrospection()] : []),
    ],
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
    "http://localhost:5173", // Frontend Web
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
    // Pass auth data as serverContext (second arg) rather than mutating the
    // native Bun Request object, which may not be extensible.
    return yoga.fetch(c.req.raw, {
        userId: c.get("userId"),
        sessionId: c.get("sessionId"),
        prisma: c.get("prisma"),
    })
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
// Socket.io + Server Initialization
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000

/**
 * Initialize Socket.io with Bun Engine (skipped in test environment).
 */
const socketSetup = process.env.NODE_ENV !== "test" ? initializeSocketIO() : null
const engineHandler = socketSetup?.engine.handler() ?? null

if (socketSetup) {
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

/**
 * Bun server export
 *
 * Bun starts a server from `export default { fetch, websocket?, port }`.
 * Using this object form (instead of a separate Bun.serve() call alongside
 * `export default app`) avoids the port conflict where Bun auto-serves the
 * Hono app first and the custom Bun.serve() fetch handler never runs.
 *
 * Routes:
 * - /socket.io/* -> engine.handleRequest  (Socket.io + WebSocket upgrades)
 * - everything else -> Hono app
 */
export default {
    port: PORT,
    websocket: engineHandler?.websocket,
    idleTimeout: engineHandler?.idleTimeout,
    maxRequestBodySize: engineHandler?.maxRequestBodySize,
    async fetch(request: Request, server: Server<unknown>) {
        if (socketSetup) {
            const pathname = new URL(request.url).pathname
            if (pathname.startsWith("/socket.io")) {
                return socketSetup.engine.handleRequest(request, server)
            }
        }
        return app.fetch(request)
    },
}

//TODO: For test only, remove later, Named export for tests: import { app } from "./index"
export { app }
