import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeAll, afterAll, vi } from "vitest"

import { mswServer } from "./mocks/server"

// ============================================================================
// MSW (Mock Service Worker) Setup
// ============================================================================

beforeAll(() => {
    mswServer.listen({ onUnhandledRequest: "bypass" })
})

afterEach(() => {
    cleanup()
    mswServer.resetHandlers()
})

afterAll(() => {
    mswServer.close()
})

// ============================================================================
// Environment Variables
// ============================================================================

process.env.VITE_API_URL = "http://localhost:3000"
process.env.VITE_GRAPHQL_ENDPOINT = "http://localhost:3000/graphql"
process.env.VITE_SOCKET_URL = "http://localhost:3000"

// ============================================================================
// Browser API Mocks
// ============================================================================

/**
 * Mock window.matchMedia for CSS media query tests
 * Reference: https://vitest.dev/guide/mocking.html
 * Best Practice: Define in setup file (runs before all imports)
 */
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
    })),
})

// ============================================================================
// CSS Injection for View Transition Tests
// ============================================================================

/**
 * Inject critical CSS into jsdom for testing
 * Note: Vitest mocks CSS imports by default, so we inject manually
 * Reference: https://vitest.dev/guide/mocking/modules.html
 */
const mockStyle = document.createElement("style")
mockStyle.textContent = `
    /* Custom easing function from advanced-view-transitions.css */
    :root {
        --expo-out: linear(
            0, 0.0085 7.78%, 0.0327 13.89%, 0.0704 19.44%,
            0.1198 24.44%, 0.1789 28.89%, 0.2459 32.78%,
            0.3192 36.11%, 0.3972 38.89%, 0.4786 41.11%,
            0.5623 42.78%, 0.6471 44.11%, 0.7321 45%,
            0.8163 45.67%, 0.899 46.11%, 0.9796 46.33%, 1
        );

        /* Aesthetic Modes CSS Variables (from aesthetic-modes.css) */
        --animation-duration: 300ms;
        --animation-easing: cubic-bezier(0.68, -0.55, 0.265, 1.55);
        --glow-intensity: 20px;
        --glow-opacity: 0.6;
        --spring-stiffness: 300;
        --spring-damping: 10;
        --acoustic-field-opacity: 1;
        --transition-timing: ease-out;
    }

    /* Minimal mode overrides */
    .minimal {
        --animation-duration: 150ms;
        --animation-easing: ease-out;
        --glow-intensity: 0px;
        --glow-opacity: 0;
        --spring-stiffness: 150;
        --spring-damping: 8;
        --acoustic-field-opacity: 0;
        --transition-timing: ease-out;
    }

    /* Ripple reveal keyframes */
    @keyframes ripple-reveal {
        from { clip-path: circle(0% at var(--ripple-x, 50%) var(--ripple-y, 50%)); }
        to { clip-path: circle(150% at var(--ripple-x, 50%) var(--ripple-y, 50%)); }
    }

    /* View Transition animations */
    html[style*="--ripple-x"]::view-transition-new(root) {
        animation: ripple-reveal 1s var(--expo-out) both !important;
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
        html[style*="--ripple-x"]::view-transition-group(root),
        html[style*="--ripple-x"]::view-transition-old(root),
        html[style*="--ripple-x"]::view-transition-new(root) {
            animation-duration: 0.01ms !important;
            animation-name: none !important;
        }

        :root,
        .minimal {
            --animation-duration: 0.01ms;
        }
    }
`
document.head.appendChild(mockStyle)
