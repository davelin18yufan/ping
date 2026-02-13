/**
 * Animation Tokens - Timing and Easing
 * Centralized animation durations and easing functions
 */

export const animations = {
  duration: {
    instant: "0ms",
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
    slower: "600ms",
  },
  easing: {
    in: "cubic-bezier(0.7, 0, 0.84, 0)",
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  spring: {
    stiffness: {
      slow: 150,
      normal: 300,
      fast: 500,
    },
    damping: {
      low: 10,
      normal: 20,
      high: 30,
    },
  },
} as const

export type AnimationDuration = keyof typeof animations.duration
export type AnimationEasing = keyof typeof animations.easing
export type SpringStiffness = keyof typeof animations.spring.stiffness
export type SpringDamping = keyof typeof animations.spring.damping
