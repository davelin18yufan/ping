/**
 * Z-Index Scale - Layering System
 * Consistent z-index values to prevent layering conflicts
 */

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  acousticField: -1, // Background layer for AcousticField canvas
} as const

export type ZIndexKey = keyof typeof zIndex
