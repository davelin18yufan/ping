export type ColorMode = "light" | "dark"

export interface ColorToken {
    light: string // OKLCH format
    dark: string // OKLCH format
}

export interface ColorTokens {
    background: ColorToken
    foreground: ColorToken
    card: ColorToken
    cardForeground: ColorToken
    popover: ColorToken
    popoverForeground: ColorToken
    primary: ColorToken
    primaryForeground: ColorToken
    secondary: ColorToken
    secondaryForeground: ColorToken
    muted: ColorToken
    mutedForeground: ColorToken
    accent: ColorToken
    accentForeground: ColorToken
    destructive: ColorToken
    destructiveForeground: ColorToken
    border: ColorToken
    input: ColorToken
    ring: ColorToken
    glassBackground: ColorToken
    glassBackgroundHover: ColorToken
    glassBlur: ColorToken
    chart1: ColorToken
    chart2: ColorToken
    chart3: ColorToken
    chart4: ColorToken
    chart5: ColorToken
    sidebar: ColorToken
    sidebarForeground: ColorToken
    sidebarPrimary: ColorToken
    sidebarPrimaryForeground: ColorToken
    sidebarAccent: ColorToken
    sidebarAccentForeground: ColorToken
    sidebarBorder: ColorToken
    sidebarRing: ColorToken
}
