/**
 * Ping Backend Server
 *
 * Main entry point for the Hono server with:
 * - Better Auth integration for OAuth authentication
 * - Session management middleware
 * - API routes for authentication
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authHandler } from "./lib/auth";
import { sessionMiddleware, getAuthUserId } from "./middleware";

const app = new Hono();

// ============================================================================
// Middleware Setup
// ============================================================================

// Logger middleware (development)
if (process.env.NODE_ENV === "development") {
  app.use("*", logger());
}

// CORS middleware
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") ?? [
  "http://localhost:3001", // Frontend Web
  "http://localhost:8081", // Mobile Expo
];

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

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
  return authHandler(c.req.raw);
});

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
  });
});

/**
 * Server status endpoint
 */
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Protected Routes (require authentication)
// ============================================================================

/**
 * Test endpoint to verify authentication
 * Requires valid session
 */
app.get("/api/me", sessionMiddleware, (c) => {
  const userId = getAuthUserId(c);

  if (!userId) {
    return c.json(
      {
        error: "Unauthorized",
        message: "You must be logged in to access this endpoint",
      },
      401,
    );
  }

  return c.json({
    userId,
    authenticated: true,
  });
});

// ============================================================================
// GraphQL Routes (to be implemented)
// ============================================================================

// TODO: Add GraphQL Yoga integration here
// app.use('/graphql', sessionMiddleware);
// app.all('/graphql', graphqlHandler);

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
    404,
  );
});

/**
 * Global error handler
 */
app.onError((err, c) => {
  console.error("Server error:", err);

  return c.json(
    {
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "An unexpected error occurred",
    },
    500,
  );
});

// ============================================================================
// Server Export
// ============================================================================

export default app;
