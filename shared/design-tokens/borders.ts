/**
 * Border Tokens
 * Consistent border width scale
 */

export const borders = {
  width: {
    none: "0px",
    thin: "1px",
    normal: "2px",
    thick: "3px",
    heavy: "4px",
  },
} as const

export type BorderWidth = keyof typeof borders.width
