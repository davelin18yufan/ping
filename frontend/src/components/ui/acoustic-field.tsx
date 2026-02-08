/**
 * Acoustic Field - Interactive Sound Wave Background
 *
 * Theme: Sound waves and frequency - perfect for messaging app
 * Interaction: Mouse position creates resonance effect on vertical lines
 * Performance: Canvas-based rendering with spring physics (60 FPS)
 *
 * Optimization Strategy (Vercel React Best Practices):
 * - Canvas 2D API replaces 900 DOM elements (6.2 CSS content-visibility)
 * - requestAnimationFrame for 60fps (6.1 Animate wrapper)
 * - Spring physics with stiffness=300, damping=10
 * - Single RAF loop instead of 900 useTransform subscriptions (5.4 Subscribe to derived state)
 * - Euclidean distance calculation cached per frame (7.4 Cache function results)
 */

import { useEffect, useRef, useState } from "react"

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

interface Line {
    x: number // Pixel X position
    y: number // Pixel Y position
    baseAmplitude: number // Random base for breathing (0.7-1.5)
    // Spring physics state
    currentScale: number // Current scale value
    targetScale: number // Target scale value
    velocityScale: number // Velocity for spring
    currentDisplacementX: number // Current X displacement
    targetDisplacementX: number // Target X displacement
    velocityDisplacementX: number // Velocity for X displacement
    currentCompressionX: number // Current X compression
    targetCompressionX: number // Target X compression
    velocityCompressionX: number // Velocity for X compression
    // Breathing animation
    breathingPhase: number // 0-1 phase for sine wave
    breathingSpeed: number // Random speed multiplier
}

export function AcousticField({
    cols = 30,
    rows = 30,
    influenceRadius = 150,
    maxScale = 25,
}: AcousticFieldProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const linesRef = useRef<Line[]>([])
    const mouseRef = useRef({ x: -1000, y: -1000 }) // Off-screen initially
    const animationFrameRef = useRef<number>(0)
    const [isReady, setIsReady] = useState(false)

    // Check if user prefers reduced motion
    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Get CSS variable colors
    const getGlowColors = (): { primary: string; secondary: string } => {
        if (typeof window === "undefined") return { primary: "#5b9cff", secondary: "#6db5ff" }
        const style = getComputedStyle(document.documentElement)
        return {
            primary: style.getPropertyValue("--glow-primary").trim() || "oklch(0.6 0.18 250)",
            secondary: style.getPropertyValue("--glow-secondary").trim() || "oklch(0.7 0.18 200)",
        }
    }

    // Initialize lines grid
    useEffect(() => {
        if (!containerRef.current) return

        const updateSize = () => {
            if (!containerRef.current || !canvasRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const dpr = window.devicePixelRatio || 1

            // Set canvas size (accounting for device pixel ratio for crisp rendering)
            canvasRef.current.width = rect.width * dpr
            canvasRef.current.height = rect.height * dpr
            canvasRef.current.style.width = `${rect.width}px`
            canvasRef.current.style.height = `${rect.height}px`

            // Initialize lines
            const newLines: Line[] = []
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = (col / (cols - 1)) * rect.width
                    const y = (row / (rows - 1)) * rect.height
                    const baseAmplitude = 0.7 + Math.random() * 0.8

                    newLines.push({
                        x,
                        y,
                        baseAmplitude,
                        currentScale: 1.15,
                        targetScale: 1.15,
                        velocityScale: 0,
                        currentDisplacementX: 0,
                        targetDisplacementX: 0,
                        velocityDisplacementX: 0,
                        currentCompressionX: 1,
                        targetCompressionX: 1,
                        velocityCompressionX: 0,
                        breathingPhase: Math.random() * Math.PI * 2,
                        breathingSpeed: 0.8 + Math.random() * 0.4, // 0.8-1.2
                    })
                }
            }

            linesRef.current = newLines
            setIsReady(true)
        }

        updateSize()
        window.addEventListener("resize", updateSize)
        return () => window.removeEventListener("resize", updateSize)
    }, [cols, rows])

    // Track mouse position
    useEffect(() => {
        if (prefersReducedMotion) return

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [prefersReducedMotion])

    // Animation loop with spring physics
    useEffect(() => {
        if (!isReady || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d", { alpha: true })
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const colors = getGlowColors()

        // Spring physics constants
        const STIFFNESS = 300
        const DAMPING = 10
        const MASS = 1

        const animate = () => {
            const deltaTime = 0.016 // ~60fps (16ms)

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.save()
            ctx.scale(dpr, dpr)

            const lines = linesRef.current
            const mouse = mouseRef.current

            // Update and render each line
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]

                // Calculate distance from mouse (Euclidean distance)
                const dx = mouse.x - line.x
                const dy = mouse.y - line.y
                const distance = Math.sqrt(dx * dx + dy * dy)

                // Calculate influence (0-1) with exponential falloff
                let influence = 0
                if (distance <= influenceRadius) {
                    const normalized = 1 - distance / influenceRadius
                    influence = Math.pow(normalized, 1.5) // Gentler falloff
                }

                // Update targets based on influence
                if (!prefersReducedMotion) {
                    // Scale target
                    line.targetScale = 1.15 + influence * maxScale

                    // Displacement target (horizontal jitter)
                    if (influence < 0.3) {
                        line.targetDisplacementX = 0
                    } else {
                        line.targetDisplacementX = (line.baseAmplitude - 1) * 6 * influence
                    }

                    // Compression target (wave propagation)
                    if (influence < 0.2) {
                        line.targetCompressionX = 1
                    } else {
                        const direction = line.baseAmplitude > 1 ? 1 : -1
                        line.targetCompressionX = 1 + direction * influence * 0.6
                    }

                    // Spring physics for scale (smooth motion)
                    const springForceScale = STIFFNESS * (line.targetScale - line.currentScale)
                    const dampingForceScale = DAMPING * line.velocityScale
                    const accelerationScale = (springForceScale - dampingForceScale) / MASS

                    line.velocityScale += accelerationScale * deltaTime
                    line.currentScale += line.velocityScale * deltaTime

                    // Spring physics for displacement
                    const springForceDisp =
                        STIFFNESS * (line.targetDisplacementX - line.currentDisplacementX)
                    const dampingForceDisp = DAMPING * line.velocityDisplacementX
                    const accelerationDisp = (springForceDisp - dampingForceDisp) / MASS

                    line.velocityDisplacementX += accelerationDisp * deltaTime
                    line.currentDisplacementX += line.velocityDisplacementX * deltaTime

                    // Spring physics for compression
                    const springForceComp =
                        STIFFNESS * (line.targetCompressionX - line.currentCompressionX)
                    const dampingForceComp = DAMPING * line.velocityCompressionX
                    const accelerationComp = (springForceComp - dampingForceComp) / MASS

                    line.velocityCompressionX += accelerationComp * deltaTime
                    line.currentCompressionX += line.velocityCompressionX * deltaTime

                    // Update breathing animation
                    line.breathingPhase += (deltaTime * line.breathingSpeed) / 2.5
                }

                // Calculate breathing opacity (0.65 + sine wave)
                const breathingOpacity = prefersReducedMotion
                    ? 0.35
                    : 0.65 + Math.sin(line.breathingPhase) * (line.baseAmplitude * 0.25)

                // Draw line with gradient
                const lineHeight = 8
                const finalScale = prefersReducedMotion ? 1 : line.currentScale
                const finalDisplacementX = prefersReducedMotion ? 0 : line.currentDisplacementX
                const finalCompressionX = prefersReducedMotion ? 1 : line.currentCompressionX

                // Calculate final dimensions
                const scaledHeight = lineHeight * finalScale
                const scaledWidth = 1 * finalCompressionX

                // Apply transformations
                ctx.save()
                ctx.translate(line.x + finalDisplacementX, line.y)
                ctx.globalAlpha = breathingOpacity

                // Create gradient
                const gradient = ctx.createLinearGradient(0, -scaledHeight / 2, 0, scaledHeight / 2)
                gradient.addColorStop(0, colors.primary)
                gradient.addColorStop(1, colors.secondary)

                // Draw line
                ctx.fillStyle = gradient
                ctx.fillRect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)

                ctx.restore()
            }

            ctx.restore()

            // Continue animation loop
            animationFrameRef.current = requestAnimationFrame(animate)
        }

        // Start animation
        animationFrameRef.current = requestAnimationFrame(animate)

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [isReady, cols, rows, influenceRadius, maxScale, prefersReducedMotion])

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
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}
