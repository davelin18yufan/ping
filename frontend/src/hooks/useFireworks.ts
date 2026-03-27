/**
 * useFireworks — launches a canvas-based firework particle burst.
 *
 * Renders 4 staggered shell explosions of 36 particles each onto the provided
 * canvas ref. Particles use Euler integration with gravity for a natural arc.
 * Colors are pre-defined rgba gold values (Canvas 2D cannot parse oklch()).
 *
 * Respects prefers-reduced-motion: returns early without drawing anything.
 *
 * @param canvasRef - ref to the <canvas> element to draw on
 * @param active    - starts the fireworks when true; cleaned up when false
 */

import { useEffect } from "react"

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    alpha: number
    radius: number
    color: string
}

// Gold palette approximating --ritual-celebrate (oklch 0.85 0.18 85)
const COLORS = [
    "230, 180, 50", // bright gold
    "240, 200, 80", // warm yellow-gold
    "220, 160, 40", // orange-gold
    "250, 215, 110", // pale champagne
    "235, 170, 55", // mid gold
]

const GRAVITY = 0.06
const PARTICLE_COUNT = 36

function explode(x: number, y: number, particles: Particle[]) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT
        const speed = 1.8 + Math.random() * 3.5
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            alpha: 1,
            radius: 1.8 + Math.random() * 2,
            color,
        })
    }
}

export function useFireworks(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    active: boolean
) {
    useEffect(() => {
        if (!active) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return

        // Capture as non-nullable so TypeScript doesn't lose the narrowing in closures
        const context = ctx
        const w = canvas.width
        const h = canvas.height

        let particles: Particle[] = []
        let animId: number

        // 4 shells at staggered positions and delays
        const shells = [
            { x: w * 0.3, y: h * 0.35, delay: 0 },
            { x: w * 0.68, y: h * 0.28, delay: 220 },
            { x: w * 0.5, y: h * 0.45, delay: 480 },
            { x: w * 0.2, y: h * 0.32, delay: 680 },
        ]
        const timers = shells.map(({ x, y, delay }) =>
            setTimeout(() => explode(x, y, particles), delay)
        )

        function tick() {
            context.clearRect(0, 0, w, h)
            particles = particles.filter((p) => p.alpha > 0.03)

            for (const p of particles) {
                p.x += p.vx
                p.y += p.vy
                p.vy += GRAVITY
                p.vx *= 0.99
                p.alpha *= 0.965

                context.beginPath()
                context.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                context.fillStyle = `rgba(${p.color}, ${p.alpha})`
                context.fill()
            }

            animId = requestAnimationFrame(tick)
        }

        animId = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(animId)
            timers.forEach(clearTimeout)
        }
    }, [active])
}
