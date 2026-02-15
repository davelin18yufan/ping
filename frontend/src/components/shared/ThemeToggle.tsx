/**
 * ThemeToggle Component
 *
 * Icon-only button that toggles between dark and light mode.
 * Uses View Transition circular ripple on click.
 * Reads/writes localStorage "theme" and syncs with document class.
 */

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

import { useViewTransition } from "@/hooks"

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(true)
    const transition = useViewTransition()

    useEffect(() => {
        const stored = localStorage.getItem("theme")
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        const shouldBeDark = stored === "dark" || (!stored && prefersDark)
        setIsDark(shouldBeDark)
        document.documentElement.classList.toggle("dark", shouldBeDark)
    }, [])

    const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        const newIsDark = !isDark
        transition.withRipple(event, "theme-toggle", () => {
            document.documentElement.classList.toggle("dark", newIsDark)
            localStorage.setItem("theme", newIsDark ? "dark" : "light")
            setIsDark(newIsDark)
        })
    }

    return (
        <button
            onClick={handleToggle}
            className="theme-toggle glass-button glass-button--sm"
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
            {isDark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            <span className="theme-toggle__label">{isDark ? "Light" : "Dark"}</span>
        </button>
    )
}
