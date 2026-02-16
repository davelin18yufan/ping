/**
 * useScrollDirection Hook
 *
 * Returns the current scroll direction to drive the capsule header state:
 * - "top"  : page is at the top (< threshold)
 * - "up"   : user is scrolling upward
 * - "down" : user is scrolling downward
 *
 * Uses requestAnimationFrame throttle to avoid layout thrashing.
 * A 10px threshold prevents jitter from micro-movements.
 */

import { useEffect, useState } from "react"

export type ScrollDirection = "top" | "up" | "down"

const SCROLL_THRESHOLD = 10
const TOP_THRESHOLD = 30

export function useScrollDirection(): ScrollDirection {
    const [direction, setDirection] = useState<ScrollDirection>("top")

    useEffect(() => {
        let lastScrollY = window.scrollY
        let rafId: number | null = null

        const handleScroll = () => {
            if (rafId !== null) return

            rafId = requestAnimationFrame(() => {
                const currentScrollY = window.scrollY
                const delta = currentScrollY - lastScrollY

                if (currentScrollY < TOP_THRESHOLD) {
                    setDirection("top")
                } else if (Math.abs(delta) > SCROLL_THRESHOLD) {
                    setDirection(delta > 0 ? "down" : "up")
                }

                lastScrollY = currentScrollY
                rafId = null
            })
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => {
            window.removeEventListener("scroll", handleScroll)
            if (rafId !== null) cancelAnimationFrame(rafId)
        }
    }, [])

    return direction
}
