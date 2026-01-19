/**
 * MSW Server Setup
 *
 * Configures MSW server for Node.js testing environment
 */

import { setupServer } from "msw/node"

import { handlers } from "./handlers"

/**
 * MSW server instance
 * Used in all tests to mock Better Auth API
 */
export const mswServer = setupServer(...handlers)
