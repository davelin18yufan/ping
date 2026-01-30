import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
    plugins: [
        tanstackStart(),
        react({
            babel: {
                plugins: ["babel-plugin-react-compiler"],
            },
        }),
        viteTsConfigPaths({
            projects: ["./tsconfig.json"],
        }),
        tailwindcss(),
    ],
    resolve: {
        dedupe: ["react", "react-dom"],
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.{test,spec}.{ts,tsx}"],
        deps: {
            optimizer: {
                web: {
                    enabled: false,
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
})
