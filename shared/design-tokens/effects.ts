/**
 * Effect Tokens - Glassmorphism, Blur, Glow
 * Visual effect parameters for consistent styling
 */

export const effects = {
  glass: {
    blur: {
      sm: "10px",
      md: "20px",
      lg: "30px",
      xl: "40px",
    },
    opacity: {
      50: 0.5,
      70: 0.7,
      80: 0.8,
      90: 0.9,
    },
    saturation: {
      sm: "150%",
      md: "180%",
      lg: "200%",
    },
  },
  glow: {
    intensity: {
      sm: "10px",
      md: "20px",
      lg: "30px",
    },
    opacity: {
      primary: 0.6,
      accent: 0.5,
      secondary: 0.4,
    },
  },
} as const

export type GlassBlur = keyof typeof effects.glass.blur
export type GlassOpacity = keyof typeof effects.glass.opacity
export type GlassSaturation = keyof typeof effects.glass.saturation
export type GlowIntensity = keyof typeof effects.glow.intensity
export type GlowOpacity = keyof typeof effects.glow.opacity
