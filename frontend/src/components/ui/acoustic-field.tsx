/**
 * Acoustic Field - Interactive Sound Wave Background
 *
 * Theme: Sound waves and frequency - perfect for messaging app
 * Interaction: Mouse position creates resonance effect on vertical lines
 * Performance: Optimized with useMemo, GPU acceleration, and spring physics
 */

import { motion, useMotionValue, useTransform } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"

interface AcousticFieldProps {
    /** Number of columns (default: 30) */
    cols?: number
    /** Number of rows (default: 30) */
    rows?: number
    /** Mouse influence radius in pixels (default: 180) */
    influenceRadius?: number
    /** Maximum line height multiplier (default: 25) */
    maxScale?: number
}

export function AcousticField({
    cols = 30,
    rows = 30,
    influenceRadius = 150,
    maxScale = 25,
}: AcousticFieldProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Check if user prefers reduced motion
    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Generate grid positions (memoized for performance)
    const lines = useMemo(() => {
        const result = []
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                result.push({
                    id: `${row}-${col}`,
                    x: (col / (cols - 1)) * 100, // Percentage
                    y: (row / (rows - 1)) * 100, // Percentage
                    // Pixel positions for distance calculation
                    pxX: (col / (cols - 1)) * containerSize.width,
                    pxY: (row / (rows - 1)) * containerSize.height,
                    // Random base amplitude for breathing effect (higher variation)
                    baseAmplitude: 0.6 + Math.random() * 0.8,
                })
            }
        }
        return result
    }, [cols, rows, containerSize])

    // Track container size
    useEffect(() => {
        if (!containerRef.current) return

        const updateSize = () => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            setContainerSize({ width: rect.width, height: rect.height })
        }

        updateSize()
        window.addEventListener("resize", updateSize)
        return () => window.removeEventListener("resize", updateSize)
    }, [])

    // Track mouse position (disabled if user prefers reduced motion)
    useEffect(() => {
        if (prefersReducedMotion) return

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            mouseX.set(e.clientX - rect.left)
            mouseY.set(e.clientY - rect.top)
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [mouseX, mouseY, prefersReducedMotion])

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden"
            style={{
                background: "var(--background)",
                pointerEvents: "none",
                zIndex: 0,
            }}
        >
            {lines.map((line) => (
                <AcousticLine
                    key={line.id}
                    x={line.x}
                    y={line.y}
                    pxX={line.pxX}
                    pxY={line.pxY}
                    baseAmplitude={line.baseAmplitude}
                    mouseX={mouseX}
                    mouseY={mouseY}
                    influenceRadius={influenceRadius}
                    maxScale={maxScale}
                    prefersReducedMotion={prefersReducedMotion}
                />
            ))}
        </div>
    )
}

interface AcousticLineProps {
    x: number // Percentage (0-100)
    y: number // Percentage (0-100)
    pxX: number // Pixel position X
    pxY: number // Pixel position Y
    baseAmplitude: number
    mouseX: ReturnType<typeof useMotionValue<number>>
    mouseY: ReturnType<typeof useMotionValue<number>>
    influenceRadius: number
    maxScale: number
    prefersReducedMotion: boolean
}

function AcousticLine({
    x,
    y,
    pxX,
    pxY,
    baseAmplitude,
    mouseX,
    mouseY,
    influenceRadius,
    maxScale,
    prefersReducedMotion,
}: AcousticLineProps) {
    // Calculate distance from mouse to line
    const distance = useTransform([mouseX, mouseY], ([mx, my]) => {
        const dx = (mx as number) - pxX
        const dy = (my as number) - pxY
        return Math.sqrt(dx * dx + dy * dy)
    })

    // Calculate influence (0-1) based on distance
    const influence = useTransform(distance, (d) => {
        if (d > influenceRadius) return 0
        // Gentler exponential falloff for better resonance visibility
        const normalized = 1 - d / influenceRadius
        return Math.pow(normalized, 1.5)
    })

    // Calculate final scale with spring physics
    const scale = useTransform(influence, (inf) => {
        return 1.15 + inf * maxScale
    })

    // Sound wave displacement: horizontal jitter when mouse is near (sudden disruption)
    const waveDisplacement = useTransform(influence, (inf) => {
        if (inf < 0.3) return 0
        // Each line displaces differently based on baseAmplitude
        return (baseAmplitude - 1) * 6 * inf
    })

    // Sound wave modulation: compression/rarefaction effect (like sound wave propagation)
    const waveCompression = useTransform(influence, (inf) => {
        if (inf < 0.2) return 1
        // Some lines compress (< 1), some expand (> 1), based on baseAmplitude
        const direction = baseAmplitude > 1 ? 1 : -1
        return 1 + direction * inf * 0.6
    })

    return (
        <motion.div
            className="absolute"
            style={{
                left: `${x}%`,
                top: `${y}%`,
                width: "1px",
                height: "8px", // Further increased for better visibility
                background: `linear-gradient(to bottom, var(--glow-primary), var(--glow-secondary))`,
                opacity: prefersReducedMotion ? 0.35 : 0.65, // Higher base for light mode
                transformOrigin: "center",
                scaleY: prefersReducedMotion ? 1 : scale,
                scaleX: prefersReducedMotion ? 1 : waveCompression,
                x: prefersReducedMotion ? 0 : waveDisplacement,
                willChange: "transform, opacity",
            }}
            animate={
                prefersReducedMotion
                    ? undefined
                    : {
                          // Enhanced breathing with higher amplitude for light mode visibility
                          opacity: [0.65, 0.65 + baseAmplitude * 0.5, 0.65],
                      }
            }
            transition={{
                opacity: {
                    duration: 2.5 + Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                },
            }}
        />
    )
}
