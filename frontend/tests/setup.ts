import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeAll, afterAll } from "vitest"

import { mswServer } from "./mocks/server"

// Setup MSW server before all tests
beforeAll(() => {
    mswServer.listen({ onUnhandledRequest: "bypass" })
})

// Clean up React components after each test
afterEach(() => {
    cleanup()
    // Reset MSW handlers to default after each test
    mswServer.resetHandlers()
})

// Close MSW server after all tests
afterAll(() => {
    mswServer.close()
})

// Mock environment variables for testing
process.env.VITE_API_URL = "http://localhost:3000"
process.env.VITE_GRAPHQL_ENDPOINT = "http://localhost:3000/graphql"
process.env.VITE_SOCKET_URL = "http://localhost:3000"
