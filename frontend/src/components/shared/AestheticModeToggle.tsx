/**
 * Aesthetic Mode Toggle Component
 *
 * Allows users to switch between Ornate and Minimal modes
 * Features: Circular ripple reveal View Transition animation from click position
 *
 * Icons:
 * - Sparkles: Ornate mode
 * - Minimize2: Minimal mode
 *
 * Styling:
 * - Uses glass-button from design system
 * - Includes tooltip for accessibility
 * - Keyboard accessible
 *
 * Usage:
 * ```tsx
 * <AestheticModeToggle />
 * ```
 */

import { Minimize2, Sparkles } from "lucide-react"

import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { useViewTransition } from "@/hooks/use-view-transition"
import "@/styles/components/glass-button.css"

export function AestheticModeToggle() {
    const { setMode, isOrnate } = useAestheticMode()
    const transition = useViewTransition()

    /**
     * Toggle aesthetic mode with circular ripple View Transition
     */
    const toggleMode = (event: React.MouseEvent<HTMLButtonElement>) => {
        const newMode = isOrnate ? "minimal" : "ornate"

        // Use View Transition API with ripple effect from click position
        transition.withRipple(event, "aesthetic-toggle", () => {
            setMode(newMode)
        })
    }

    return (
        <button
            onClick={toggleMode}
            className="glass-button glass-button--sm"
            aria-label={`Switch to ${isOrnate ? "minimal" : "ornate"} mode`}
            title={isOrnate ? "Switch to Minimal mode" : "Switch to Ornate mode"}
        >
            {isOrnate ? <Sparkles size={16} /> : <Minimize2 size={16} />}
            <span>{isOrnate ? "Ornate" : "Minimal"}</span>
        </button>
    )
}
