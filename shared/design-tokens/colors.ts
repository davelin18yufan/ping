import type { ColorTokens } from "./types"

/**
 * Design System Color Tokens - Ping UI/UX Redesign (macOS Glassmorphism)
 * Uses OKLCH color space for better perceptual uniformity
 *
 * Dark Mode: Steel Frost (macOS-inspired deep steel gray)
 * Light Mode: Kyoto Sunrise (Warm milky tones, preserving previous direction)
 */
export const colors: ColorTokens = {
    // Background layers
    background: {
        light: "oklch(0.96 0.010 70)", // Warm milky white
        dark: "oklch(0.18 0.005 240)", // Deep steel gray (macOS inspired)
    },
    foreground: {
        light: "oklch(0.25 0.01 280)", // Sumicha (Ink tea)
        dark: "oklch(0.95 0 0)", // Almost white, slightly warm
    },

    // Surface layers
    card: {
        light: "oklch(0.94 0.012 65)", // Milky tea card
        dark: "oklch(0.24 0.008 240)", // Lighter steel gray
    },
    cardForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.95 0 0)",
    },
    popover: {
        light: "oklch(0.96 0.010 70)",
        dark: "oklch(0.28 0.010 240)", // Even lighter (hover state)
    },
    popoverForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.95 0 0)",
    },

    // Brand colors
    primary: {
        light: "oklch(0.58 0.16 250)", // Soft blue (less saturated than dark)
        dark: "oklch(0.60 0.18 250)", // macOS Messages blue
    },
    primaryForeground: {
        light: "oklch(0.98 0 0)",
        dark: "oklch(0.98 0 0)",
    },
    secondary: {
        light: "oklch(0.92 0.010 70)", // Shironezumi
        dark: "oklch(0.24 0.008 240)",
    },
    secondaryForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.95 0 0)",
    },

    // Accent colors
    muted: {
        light: "oklch(0.94 0.012 65)",
        dark: "oklch(0.24 0.008 240)",
    },
    mutedForeground: {
        light: "oklch(0.50 0.02 270)", // Shinbashi (Teal)
        dark: "oklch(0.65 0.005 240)", // Steel gray text (secondary info)
    },
    accent: {
        light: "oklch(0.65 0.18 50)", // Coral orange (warm, friendly)
        dark: "oklch(0.65 0.15 145)", // macOS FaceTime green (video call button)
    },
    accentForeground: {
        light: "oklch(0.98 0 0)",
        dark: "oklch(0.98 0 0)",
    },

    // Destructive states
    destructive: {
        light: "oklch(0.577 0.245 27.325)",
        dark: "oklch(0.396 0.141 25.723)",
    },
    destructiveForeground: {
        light: "oklch(0.577 0.245 27.325)",
        dark: "oklch(0.637 0.237 25.331)",
    },

    // Borders and inputs
    border: {
        light: "oklch(0.92 0.010 70)",
        dark: "oklch(0.24 0.008 240)",
    },
    input: {
        light: "oklch(0.92 0.010 70)",
        dark: "oklch(0.24 0.008 240)",
    },
    ring: {
        light: "oklch(0.58 0.16 250)", // Match primary
        dark: "oklch(0.60 0.18 250)", // Match primary
    },

    // Glassmorphism
    glassBackground: {
        light: "oklch(0.97 0.008 70 / 0.8)", // 80% opacity warm white
        dark: "oklch(0.22 0.008 240 / 0.7)", // 70% opacity steel gray
    },
    glassBackgroundHover: {
        light: "oklch(0.97 0.008 70 / 0.9)",
        dark: "oklch(0.26 0.008 240 / 0.8)",
    },
    glassBlur: {
        light: "20px",
        dark: "20px",
    },

    // Charts
    chart1: {
        light: "oklch(0.58 0.16 250)", // Soft blue
        dark: "oklch(0.60 0.18 250)", // Messages blue
    },
    chart2: {
        light: "oklch(0.65 0.18 50)", // Coral orange
        dark: "oklch(0.65 0.15 145)", // FaceTime green
    },
    chart3: {
        light: "oklch(0.80 0.12 340)", // Sakura pink
        dark: "oklch(0.70 0.18 200)", // Cyan-blue
    },
    chart4: {
        light: "oklch(0.65 0.015 260)", // Asagi light blue
        dark: "oklch(0.60 0.20 270)", // Apology blue-purple
    },
    chart5: {
        light: "oklch(0.50 0.02 270)", // Shinbashi teal
        dark: "oklch(0.85 0.15 85)", // Celebrate gold
    },

    // Sidebar
    sidebar: {
        light: "oklch(0.94 0.012 65)",
        dark: "oklch(0.18 0.005 240)",
    },
    sidebarForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.95 0 0)",
    },
    sidebarPrimary: {
        light: "oklch(0.58 0.16 250)",
        dark: "oklch(0.60 0.18 250)",
    },
    sidebarPrimaryForeground: {
        light: "oklch(0.98 0 0)",
        dark: "oklch(0.98 0 0)",
    },
    sidebarAccent: {
        light: "oklch(0.92 0.010 70)",
        dark: "oklch(0.24 0.008 240)",
    },
    sidebarAccentForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.95 0 0)",
    },
    sidebarBorder: {
        light: "oklch(0.92 0.010 70)",
        dark: "oklch(0.24 0.008 240)",
    },
    sidebarRing: {
        light: "oklch(0.58 0.16 250)",
        dark: "oklch(0.60 0.18 250)",
    },
}
