/**
 * Test Environment Setup
 *
 * Sets up environment variables and global configuration for tests.
 * This file is loaded before all tests run.
 */

// Set test environment variables
process.env.NODE_ENV = "test"

// Database configuration
process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@localhost:5432/ping_test"

// Better Auth configuration
process.env.BETTER_AUTH_SECRET =
    process.env.BETTER_AUTH_SECRET || "test-secret-key-at-least-32-characters-long-for-testing"
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000"

// OAuth configuration (test credentials)
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id"
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret"

process.env.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "test-github-client-id"
process.env.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "test-github-client-secret"

// Redis configuration (optional for auth tests)
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

// Server configuration
process.env.PORT = "3000"

console.log("Test environment initialized")
console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`)
console.log(`BETTER_AUTH_URL: ${process.env.BETTER_AUTH_URL}`)
