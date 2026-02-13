import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import viteTsConfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
    plugins: [
        // tanstackStart includes SSR-related Vite transforms that conflict with
        // jsdom test environment, causing "Invalid hook call" errors.
        // Root cause: its module bundling produces a separate React instance
        // within the Vite module graph, breaking React's internal hook registry.
        mode !== "test" && tanstackStart(),
        react({
            babel: {
                plugins: ["babel-plugin-react-compiler"],
            },
        }),
        viteTsConfigPaths({
            projects: ["./tsconfig.json"],
        }),
        // Tailwind CSS plugin generates utility CSS at build time.
        // In jsdom, computed styles are not evaluated, so the plugin output
        // is unused in tests. Excluding it reduces transform overhead.
        mode !== "test" && tailwindcss(),
    ].filter(Boolean),
    resolve: {
        // Enforce a single React instance across all workspace packages.
        // Prevents "Invalid hook call" when shared packages resolve React
        // through their own node_modules symlinks.
        dedupe: ["react", "react-dom"],
        alias: {
            react: path.resolve(__dirname, "node_modules/react"),
            "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.{test,spec}.{ts,tsx}"],
        deps: {
            optimizer: {
                web: {
                    // Must be enabled so Vite pre-bundles React and testing-library
                    // into a single module each. When disabled, Vite may resolve
                    // the same package from different paths within its module graph,
                    // producing multiple React instances and breaking hooks.
                    enabled: true,
                    include: [
                        "react",
                        "react-dom",
                        "@testing-library/react",
                        "@testing-library/dom",
                    ],
                },
            },
        },
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "tests/",
                "**/*.spec.ts",
                "**/*.spec.tsx",
                ".output/",
                "vite.config.ts",
                "vitest.config.ts",
            ],
            thresholds: {
                lines: 80,
                functions: 75,
                branches: 50,
                statements: 80,
            },
        },
    },
}))
