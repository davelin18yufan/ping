/**
 * Simple Header Component
 * Global header with Dark/Light Mode toggle
 * Uses design system: glass-card + glass-button
 */

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

import "@/styles/components/glass-button.css"
import "@/styles/components/glass-card.css"

export default function SimpleHeader() {
    const [isDark, setIsDark] = useState(true)

    // Initialize theme from localStorage or system preference
    useEffect(() => {
        const stored = localStorage.getItem("theme")
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

        const shouldBeDark = stored === "dark" || (!stored && prefersDark)
        setIsDark(shouldBeDark)

        if (shouldBeDark) {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
    }, [])

    const toggleTheme = () => {
        const newIsDark = !isDark

        if (newIsDark) {
            document.documentElement.classList.add("dark")
            localStorage.setItem("theme", "dark")
        } else {
            document.documentElement.classList.remove("dark")
            localStorage.setItem("theme", "light")
        }

        setIsDark(newIsDark)
    }

    return (
        <header className="glass-card glass-card--compact fixed top-4 left-4 right-4 z-50 flex items-center justify-between">
            {/* Logo/Title */}
            <div className="flex items-center gap-2">
                <div
                    className="text-2xl font-bold"
                    style={{
                        background:
                            "linear-gradient(135deg, var(--glow-primary), var(--glow-secondary))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    Ping
                </div>
            </div>

            {/* Theme Toggle Button - Using glass-button */}
            <button
                onClick={toggleTheme}
                className="glass-button glass-button--sm"
                aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDark ? "Light" : "Dark"}</span>
            </button>
        </header>
    )
}
