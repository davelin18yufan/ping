import type { ColorTokens } from "./types"

/**
 * Design System Color Tokens
 * Extracted from /frontend/src/styles.css
 * Uses OKLCH color space for better perceptual uniformity
 */
export const colors: ColorTokens = {
    background: {
        light: "oklch(1 0 0)",
        dark: "oklch(0.141 0.005 285.823)",
    },
    foreground: {
        light: "oklch(0.141 0.005 285.823)",
        dark: "oklch(0.985 0 0)",
    },
    card: {
        light: "oklch(1 0 0)",
        dark: "oklch(0.141 0.005 285.823)",
    },
    cardForeground: {
        light: "oklch(0.141 0.005 285.823)",
        dark: "oklch(0.985 0 0)",
    },
    popover: {
        light: "oklch(1 0 0)",
        dark: "oklch(0.141 0.005 285.823)",
    },
    popoverForeground: {
        light: "oklch(0.141 0.005 285.823)",
        dark: "oklch(0.985 0 0)",
    },
    primary: {
        light: "oklch(0.21 0.006 285.885)",
        dark: "oklch(0.985 0 0)",
    },
    primaryForeground: {
        light: "oklch(0.985 0 0)",
        dark: "oklch(0.21 0.006 285.885)",
    },
    secondary: {
        light: "oklch(0.967 0.001 286.375)",
        dark: "oklch(0.274 0.006 286.033)",
    },
    secondaryForeground: {
        light: "oklch(0.21 0.006 285.885)",
        dark: "oklch(0.985 0 0)",
    },
    muted: {
        light: "oklch(0.967 0.001 286.375)",
        dark: "oklch(0.274 0.006 286.033)",
    },
    mutedForeground: {
        light: "oklch(0.552 0.016 285.938)",
        dark: "oklch(0.705 0.015 286.067)",
    },
    accent: {
        light: "oklch(0.967 0.001 286.375)",
        dark: "oklch(0.274 0.006 286.033)",
    },
    accentForeground: {
        light: "oklch(0.21 0.006 285.885)",
        dark: "oklch(0.985 0 0)",
    },
    destructive: {
        light: "oklch(0.577 0.245 27.325)",
        dark: "oklch(0.396 0.141 25.723)",
    },
    destructiveForeground: {
        light: "oklch(0.577 0.245 27.325)",
        dark: "oklch(0.637 0.237 25.331)",
    },
    border: {
        light: "oklch(0.92 0.004 286.32)",
        dark: "oklch(0.274 0.006 286.033)",
    },
    input: {
        light: "oklch(0.92 0.004 286.32)",
        dark: "oklch(0.274 0.006 286.033)",
    },
    ring: {
        light: "oklch(0.871 0.006 286.286)",
        dark: "oklch(0.442 0.017 285.786)",
    },
    chart1: {
        light: "oklch(0.646 0.222 41.116)",
        dark: "oklch(0.488 0.243 264.376)",
    },
    chart2: {
        light: "oklch(0.6 0.118 184.704)",
        dark: "oklch(0.696 0.17 162.48)",
    },
    chart3: {
        light: "oklch(0.398 0.07 227.392)",
        dark: "oklch(0.769 0.188 70.08)",
    },
    chart4: {
        light: "oklch(0.828 0.189 84.429)",
        dark: "oklch(0.627 0.265 303.9)",
    },
    chart5: {
        light: "oklch(0.769 0.188 70.08)",
        dark: "oklch(0.645 0.246 16.439)",
    },
    sidebar: {
        light: "oklch(0.985 0 0)",
        dark: "oklch(0.21 0.006 285.885)",
    },
    sidebarForeground: {
        light: "oklch(0.141 0.005 285.823)",
        dark: "oklch(0.985 0 0)",
    },
    sidebarPrimary: {
        light: "oklch(0.21 0.006 285.885)",
        dark: "oklch(0.488 0.243 264.376)",
    },
    sidebarPrimaryForeground: {
        light: "oklch(0.985 0 0)",
        dark: "oklch(0.985 0 0)",
    },
    sidebarAccent: {
        light: "oklch(0.967 0.001 286.375)",
        dark: "oklch(0.274 0.006 286.033)",
    },
    sidebarAccentForeground: {
        light: "oklch(0.21 0.006 285.885)",
        dark: "oklch(0.985 0 0)",
    },
    sidebarBorder: {
        light: "oklch(0.92 0.004 286.32)",
        dark: "oklch(0.274 0.006 286.033)",
    },
    sidebarRing: {
        light: "oklch(0.871 0.006 286.286)",
        dark: "oklch(0.442 0.017 285.786)",
    },
}
