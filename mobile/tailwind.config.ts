import type { Config } from "tailwindcss"
import {
    colors,
    spacing,
    fontSize as sharedFontSize,
    fontFamily,
    nativeBorderRadius,
    shadows,
} from "../shared/design-tokens"
import { oklchToRgb } from "../shared/design-tokens/utils/oklch-to-rgb"
import type { ColorTokens } from "../shared/design-tokens/types"

/**
 * Convert OKLCH colors to RGB format for React Native compatibility
 * @param colors - ColorTokens object
 * @param mode - 'light' or 'dark' mode
 * @returns Object with kebab-case keys and RGB values
 */
function convertColorsForNative(colors: ColorTokens, mode: "light" | "dark") {
    const result: Record<string, string> = {}

    Object.entries(colors).forEach(([key, value]) => {
        // Convert camelCase to kebab-case
        const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase()
        result[kebabKey] = oklchToRgb(value[mode])
    })

    return result
}

/**
 * Convert readonly fontSize object to mutable format for Tailwind
 */
function convertFontSize() {
    const result: Record<string, [string, { lineHeight: string }]> = {}

    Object.entries(sharedFontSize).forEach(([key, value]) => {
        result[key] = [value[0], { lineHeight: value[1].lineHeight }]
    })

    return result
}

/**
 * Convert numeric borderRadius to string format (px) for Tailwind
 */
function convertBorderRadius() {
    const result: Record<string, string> = {}

    Object.entries(nativeBorderRadius).forEach(([key, value]) => {
        result[key] = typeof value === "number" ? `${value}px` : value
    })

    return result
}

/**
 * Tailwind CSS configuration for Mobile (React Native + NativeWind)
 * Integrates with shared design tokens from /shared/design-tokens
 */
const config: Config = {
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./screens/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    darkMode: "class",
    theme: {
        extend: {
            // Colors: OKLCH converted to RGB for React Native
            colors: convertColorsForNative(colors, "light"),

            // Spacing: Same as Web
            spacing,

            // Typography: Font sizes with line heights (converted from readonly)
            fontSize: convertFontSize(),

            // Font families: Join arrays to strings
            fontFamily: {
                sans: fontFamily.sans.join(", "),
                mono: fontFamily.mono.join(", "),
            },

            // Border radius: Converted to string format (px)
            borderRadius: convertBorderRadius(),

            // Box shadow: Use web shadow strings
            // Note: For React Native, use nativeShadows directly in components
            boxShadow: shadows,
        },
    },
    plugins: [],
}

export default config
