/**
 * Border radius scale for consistent rounded corners
 * Base radius is 0.625rem (10px) as defined in /frontend/src/styles.css
 */
const baseRadius = "0.625rem" // 10px

export const borderRadius = {
    none: "0",
    sm: `calc(${baseRadius} - 4px)`, // 6px
    md: `calc(${baseRadius} - 2px)`, // 8px
    lg: baseRadius, // 10px
    xl: `calc(${baseRadius} + 4px)`, // 14px
    "2xl": "1rem", // 16px
    "3xl": "1.5rem", // 24px
    full: "9999px",
} as const

/**
 * Numeric border radius values for React Native
 * React Native requires numeric pixel values
 */
export const nativeBorderRadius = {
    none: 0,
    sm: 6,
    md: 8,
    lg: 10,
    xl: 14,
    "2xl": 16,
    "3xl": 24,
    full: 9999,
} as const

export type BorderRadiusKey = keyof typeof borderRadius
export type NativeBorderRadiusKey = keyof typeof nativeBorderRadius
