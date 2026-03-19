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
import { authHandler, parseCookie } from "./lib/auth"
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
 * Dev-only session override for /api/auth/get-session.
 *
 * Intercepts session checks for manually-created dev-session-* tokens BEFORE
 * Better Auth's catch-all handler. Better Auth's internal session validation
 * does not recognize tokens that were inserted directly into the DB (i.e. not
 * created via OAuth flow), so we handle them with a direct Prisma lookup and
 * return the same JSON shape that Better Auth would return on success.
 *
 * This route is registered before /api/auth/** so Hono matches it first.
 * ONLY active when NODE_ENV=development.
 */
if (process.env.NODE_ENV === "development") {
    app.get("/api/auth/get-session", async (c) => {
        const cookieHeader = c.req.header("cookie") ?? ""
        const sessionToken = parseCookie(cookieHeader, "better-auth.session_token")

        if (!sessionToken?.startsWith("dev-session-")) {
            // Not a dev token — let Better Auth handle it normally
            return authHandler(c.req.raw)
        }

        const prismaClient = c.get("prisma")
        const session = await prismaClient.session.findUnique({
            where: { token: sessionToken },
            include: { user: true },
        })

        if (!session || session.expiresAt < new Date()) {
            return c.json(null)
        }

        const { user, ...sessionData } = session
        return c.json({ session: sessionData, user })
    })
}

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
//! Dev-only Routes (development environment only)
//! Remove after MVP
// ============================================================================

/**
 * /dev/login/:name — instantly log in as a seeded test user.
 *
 * Creates (or refreshes) a session in the DB and sets the
 * better-auth.session_token cookie with the same attributes that Better Auth
 * uses (HttpOnly, SameSite=Lax), then redirects to the frontend.
 *
 * Usage: open http://localhost:3000/dev/login/alice in any browser window.
 *
 * ONLY available when NODE_ENV=development.
 */
if (process.env.NODE_ENV === "development") {
    const DEV_USERS: Record<string, string> = {
        alice: "alice@ping.dev",
        bob: "bob@ping.dev",
        charlie: "charlie@ping.dev",
        diana: "diana@ping.dev",
    }
    const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173"
    const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

    app.get("/dev/login/:name", async (c) => {
        const name = c.req.param("name").toLowerCase()
        const email = DEV_USERS[name]

        if (!email) {
            return c.json(
                { error: `Unknown user "${name}". Valid: ${Object.keys(DEV_USERS).join(", ")}` },
                404
            )
        }

        const prismaClient = c.get("prisma")
        const user = await prismaClient.user.findUnique({ where: { email } })

        if (!user) {
            return c.json(
                { error: `User "${name}" not in DB. Run: cd backend && bun run db:seed` },
                404
            )
        }

        const token = `dev-session-${name}`
        const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

        await prismaClient.session.upsert({
            where: { token },
            update: { expiresAt, updatedAt: new Date() },
            create: { id: `dev-${name}-session`, token, userId: user.id, expiresAt },
        })

        // Set cookie with same attributes as Better Auth (HttpOnly, SameSite=Lax)
        c.header(
            "Set-Cookie",
            `better-auth.session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`
        )
        return c.redirect(FRONTEND_URL, 302)
    })
}

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
