/**
 * Socket.io Server Initialization
 *
 * Initializes Socket.io with Bun Engine for WebSocket support.
 * Handles real-time messaging, online status, and typing indicators.
 */

import { Server as SocketIOServer } from "socket.io";
import { Server as BunEngine } from "@socket.io/bun-engine";
import { socketAuthMiddleware } from "./middleware";
import { registerConnectionHandlers } from "./handlers";

/**
 * Socket.io Server Instance
 */
let io: SocketIOServer | null = null;

/**
 * Bun Engine Instance
 *
 * Required for Socket.io to work with Bun runtime.
 */
let engine: BunEngine | null = null;

/**
 * Initialize Socket.io Server
 *
 * Creates Socket.io server with Bun Engine and configures:
 * - CORS settings (matches Hono CORS)
 * - Authentication middleware
 * - Connection handlers
 *
 * @returns Object with Socket.io instance and Bun Engine
 */
export function initializeSocketIO(): {
  io: SocketIOServer;
  engine: BunEngine;
} {
  // Create Bun Engine
  engine = new BunEngine({
    pingInterval: 25000, // 25 seconds
    pingTimeout: 20000, // 20 seconds
  });

  // Create Socket.io server
  io = new SocketIOServer({
    // CORS configuration (match Hono settings)
    cors: {
      origin:
        process.env.CORS_ORIGIN?.split(",") ?? [
          "http://localhost:3001", // Frontend Web
          "http://localhost:8081", // Mobile Expo
        ],
      credentials: true,
    },
    // Connection state recovery
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  // Bind Bun Engine to Socket.io
  io.bind(engine);

  // Register authentication middleware
  io.use(socketAuthMiddleware);

  // Register connection handlers
  registerConnectionHandlers(io);

  console.log("✓ Socket.io initialized with Bun Engine");

  return { io, engine };
}

/**
 * Get Socket.io Server Instance
 *
 * Returns the initialized Socket.io server.
 * Throws error if server is not initialized.
 *
 * @returns Socket.io server instance
 * @throws Error if server not initialized
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error(
      "Socket.io not initialized. Call initializeSocketIO() first.",
    );
  }
  return io;
}

/**
 * Get Bun Engine Instance
 *
 * Returns the initialized Bun Engine.
 * Throws error if engine is not initialized.
 *
 * @returns Bun Engine instance
 * @throws Error if engine not initialized
 */
export function getEngine(): BunEngine {
  if (!engine) {
    throw new Error(
      "Bun Engine not initialized. Call initializeSocketIO() first.",
    );
  }
  return engine;
}
