import type { ColorTokens } from "./types"

/**
 * Design System Color Tokens - Ping UI/UX Redesign
 * Uses OKLCH color space for better perceptual uniformity
 *
 * Dark Mode: Noctis Obscuro (Deep, mysterious, avoids Discord aesthetic)
 * Light Mode: Kyoto Whisper (Japanese traditional colors, warm elegance)
 */
export const colors: ColorTokens = {
    // Background layers
    background: {
        light: "oklch(0.97 0.005 80)", // Gofun (Warm ivory white #F5F4F0)
        dark: "oklch(0.12 0.01 270)", // Deep purple-blue (avoids Discord #1E1F22)
    },
    foreground: {
        light: "oklch(0.25 0.01 280)", // Sumicha (Ink tea #3A3A3A)
        dark: "oklch(0.98 0 0)", // Pure white text
    },

    // Surface layers
    card: {
        light: "oklch(0.95 0.008 75)", // Usuneri (Soft practice #F0F0F0)
        dark: "oklch(0.18 0.015 270)", // Secondary surface
    },
    cardForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.98 0 0)",
    },
    popover: {
        light: "oklch(0.97 0.005 80)",
        dark: "oklch(0.24 0.02 270)", // Hover state
    },
    popoverForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.98 0 0)",
    },

    // Brand colors
    primary: {
        light: "oklch(0.55 0.18 247)", // Hanada (Indigo blue #4169B1)
        dark: "oklch(0.65 0.24 293)", // Purple glow (Y2K vibe)
    },
    primaryForeground: {
        light: "oklch(0.98 0 0)",
        dark: "oklch(0.98 0 0)",
    },
    secondary: {
        light: "oklch(0.92 0.010 70)", // Shironezumi (White mouse #D3D3D3)
        dark: "oklch(0.18 0.015 270)",
    },
    secondaryForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.98 0 0)",
    },

    // Accent colors
    muted: {
        light: "oklch(0.95 0.008 75)",
        dark: "oklch(0.18 0.015 270)",
    },
    mutedForeground: {
        light: "oklch(0.50 0.02 270)", // Shinbashi (Teal #5E8C7C)
        dark: "oklch(0.75 0.01 270)", // Secondary text
    },
    accent: {
        light: "oklch(0.60 0.20 140)", // Wakatake (Young bamboo #68BE8D)
        dark: "oklch(0.65 0.18 247)", // Blue electric glow
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
        dark: "oklch(0.18 0.015 270)",
    },
    input: {
        light: "oklch(0.92 0.010 70)",
        dark: "oklch(0.18 0.015 270)",
    },
    ring: {
        light: "oklch(0.55 0.18 247)", // Match primary
        dark: "oklch(0.65 0.24 293)", // Match primary
    },

    // Charts
    chart1: {
        light: "oklch(0.55 0.18 247)", // Hanada blue
        dark: "oklch(0.65 0.24 293)", // Purple glow
    },
    chart2: {
        light: "oklch(0.60 0.20 140)", // Wakatake green
        dark: "oklch(0.65 0.18 247)", // Blue glow
    },
    chart3: {
        light: "oklch(0.80 0.12 340)", // Sakura pink
        dark: "oklch(0.74 0.14 231)", // Cyan glow
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
        light: "oklch(0.95 0.008 75)",
        dark: "oklch(0.12 0.01 270)",
    },
    sidebarForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.98 0 0)",
    },
    sidebarPrimary: {
        light: "oklch(0.55 0.18 247)",
        dark: "oklch(0.65 0.24 293)",
    },
    sidebarPrimaryForeground: {
        light: "oklch(0.98 0 0)",
        dark: "oklch(0.98 0 0)",
    },
    sidebarAccent: {
        light: "oklch(0.92 0.010 70)",
        dark: "oklch(0.18 0.015 270)",
    },
    sidebarAccentForeground: {
        light: "oklch(0.25 0.01 280)",
        dark: "oklch(0.98 0 0)",
    },
    sidebarBorder: {
        light: "oklch(0.92 0.010 70)",
        dark: "oklch(0.18 0.015 270)",
    },
    sidebarRing: {
        light: "oklch(0.55 0.18 247)",
        dark: "oklch(0.65 0.24 293)",
    },
}
