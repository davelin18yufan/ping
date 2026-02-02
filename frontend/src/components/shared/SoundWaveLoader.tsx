/**
 * SoundWaveLoader Component
 *
 * Y2K-inspired pulsing glow loader with sound wave ripples
 * Matches logo-glow aesthetic for consistent theming
 *
 * @param size - "sm" (button), "md" (inline), "lg" (full-page)
 * @param className - Additional CSS classes
 */

import "@/styles/sound-wave-loader.css"

interface SoundWaveLoaderProps {
    size?: "sm" | "md" | "lg"
    className?: string
}

export function SoundWaveLoader({ size = "md", className = "" }: SoundWaveLoaderProps) {
    const sizeClasses = {
        sm: "sound-wave-loader--sm",
        md: "sound-wave-loader--md",
        lg: "sound-wave-loader--lg",
    }

    return (
        <div
            className={`sound-wave-loader ${sizeClasses[size]} ${className}`}
            role="status"
            aria-label="Loading"
            aria-live="polite"
        >
            {/* Core glows - layered for depth */}
            <div className="sound-wave-loader__glow-container">
                <div className="sound-wave-loader__glow sound-wave-loader__glow--primary" />
                <div className="sound-wave-loader__glow sound-wave-loader__glow--secondary" />
            </div>

            {/* Ripple waves - staggered animation */}
            <div className="sound-wave-loader__ripples">
                <div className="sound-wave-loader__ripple" style={{ animationDelay: "0s" }} />
                <div className="sound-wave-loader__ripple" style={{ animationDelay: "1.2s" }} />
                <div className="sound-wave-loader__ripple" style={{ animationDelay: "2.4s" }} />
            </div>

            {/* Accessible text for screen readers */}
            <span className="sound-wave-loader__sr-only">Loading content, please wait</span>
        </div>
    )
}
