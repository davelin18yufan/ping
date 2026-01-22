/**
 * ESLint configuration for Ping Mobile (React Native/Expo)
 *
 * Technologies:
 * - React Native 0.81
 * - Expo 54
 * - TypeScript 5.9
 * - NativeWind (Tailwind CSS for React Native)
 *
 * Philosophy:
 * - Consistent with frontend/backend code style
 * - 4-space indentation
 * - No semicolons
 * - Double quotes
 * - Expo-specific rules via eslint-config-expo
 *
 * References:
 * - https://docs.expo.dev/guides/using-eslint/
 */

// @ts-check
const { defineConfig, globalIgnores } = require("eslint/config")
const expoConfig = require("eslint-config-expo/flat")
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended")
const testingLibrary = require("eslint-plugin-testing-library")

module.exports = defineConfig([
    // Global ignore patterns
    globalIgnores([
        "node_modules/*",
        ".expo/*",
        "dist/*",
        "build/*",
        "android/*",
        "ios/*",
        "coverage/*",
        "*.gen.ts",
        "*.gen.tsx",
    ]),

    // Expo base configuration
    expoConfig,

    // Prettier integration (must come after expoConfig)
    eslintPluginPrettierRecommended,

    // General rules for all files
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        rules: {
            // Prettier integration
            "prettier/prettier": "warn",

            // Code quality - aligned with frontend/backend
            "no-unused-vars": "off", // Handled by TypeScript
            "no-console": "off", // Allow console in mobile dev
            "no-debugger": "error",
            eqeqeq: ["error", "always"],
            "no-var": "error",
            "prefer-const": "warn",

            // React Native specific
            "react/react-in-jsx-scope": "off", // Not needed in React 19
            "react/prop-types": "off", // Using TypeScript
            "react/display-name": "off",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // Import organization
            "sort-imports": "off", // Handled by prettier-plugin-tailwindcss
        },
    },

    // TypeScript specific rules
    {
        files: ["**/*.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-inferrable-types": "off",
        },
    },

    // Test files configuration
    {
        files: [
            "**/*.spec.{ts,tsx}",
            "**/*.test.{ts,tsx}",
            "**/tests/**/*.{ts,tsx}",
        ],
        plugins: {
            "testing-library": testingLibrary,
        },
        rules: {
            "testing-library/await-async-queries": "error",
            "testing-library/no-await-sync-queries": "error",
            "testing-library/no-debugging-utils": "warn",
            "testing-library/prefer-screen-queries": "warn",
        },
    },

    // Node.js configuration files
    {
        files: ["babel.config.js", "jest.config.js", "tailwind.config.js"],
        languageOptions: {
            globals: {
                module: "readonly",
                require: "readonly",
                process: "readonly",
                __dirname: "readonly",
            },
        },
    },
])
