import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Clean up React components after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
process.env.VITE_API_URL = "http://localhost:3000";
process.env.VITE_GRAPHQL_ENDPOINT = "http://localhost:3000/graphql";
process.env.VITE_SOCKET_URL = "http://localhost:3000";
