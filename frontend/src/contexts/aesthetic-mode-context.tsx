/**
 * Aesthetic Mode Context
 *
 * Manages UI aesthetic mode: Ornate (華麗) vs Minimal (簡潔)
 *
 * Ornate Mode (Default):
 * - Full animations (300ms duration)
 * - AcousticField interactive background
 * - Glow effects (20px intensity)
 * - Spring physics animations
 *
 * Minimal Mode:
 * - Fast animations (150ms duration)
 * - No background effects
 * - No glow effects
 * - Linear animations
 *
 * Usage:
 * ```tsx
 * const { mode, setMode, isOrnate, isMinimal } = useAestheticMode()
 * ```
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// ============================================================================
// TYPES
// ============================================================================

export type AestheticMode = "ornate" | "minimal"

export interface AestheticModeContextValue {
    mode: AestheticMode
    setMode: (mode: AestheticMode) => void
    isOrnate: boolean
    isMinimal: boolean
}

// ============================================================================
// CONTEXT
// ============================================================================

const AestheticModeContext = createContext<AestheticModeContextValue | undefined>(undefined)

// ============================================================================
// PROVIDER
// ============================================================================

const STORAGE_KEY = "ping-aesthetic-mode"
const DEFAULT_MODE: AestheticMode = "ornate"

export function AestheticModeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<AestheticMode>(() => {
        // Server-side: return default
        if (typeof window === "undefined") {
            return DEFAULT_MODE
        }

        // Client-side: read from localStorage
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === "ornate" || stored === "minimal") {
            return stored
        }

        return DEFAULT_MODE
    })

    // Sync mode changes to localStorage
    useEffect(() => {
        if (typeof window === "undefined") return

        localStorage.setItem(STORAGE_KEY, mode)
    }, [mode])

    /**
     * Set mode directly (View Transition handled by AestheticModeToggle component)
     * Simply updates state, no transition logic here
     */
    const setMode = (newMode: AestheticMode) => {
        setModeState(newMode)
    }

    // Convenience properties
    const isOrnate = mode === "ornate"
    const isMinimal = mode === "minimal"

    const value: AestheticModeContextValue = {
        mode,
        setMode,
        isOrnate,
        isMinimal,
    }

    return <AestheticModeContext.Provider value={value}>{children}</AestheticModeContext.Provider>
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access Aesthetic Mode state
 *
 * @throws Error if used outside AestheticModeProvider
 */
export function useAestheticMode(): AestheticModeContextValue {
    const context = useContext(AestheticModeContext)

    if (!context) {
        throw new Error("useAestheticMode must be used within AestheticModeProvider")
    }

    return context
}
