/**
 * Login Page - OAuth Authentication
 *
 * Features:
 * - Google/GitHub/Apple OAuth buttons
 * - Dark Mode glassmorphic design
 * - Acoustic Field interactive background (sound wave theme)
 * - Route-level guest protection with beforeLoad
 * - Auto-redirect for logged-in users (no loading flicker)
 */

import { LoginForm } from "@components/auth/LoginForm"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { LogIn } from "lucide-react"

import { AcousticField } from "@/components/ui/acoustic-field"
import { AnimatedCard } from "@/components/ui/animated-card"
import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { getSession } from "@/lib/getSession"

import "@/styles/auth-login.css"

export const Route = createFileRoute("/auth/")({
    // Redirect already-authenticated users to home
    beforeLoad: async () => {
        const session = await getSession()
        if (session) {
            throw redirect({ to: "/" })
        }
    },
    ssr: "data-only",
    // Validate search params for redirect URL
    validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
        return {
            redirect: typeof search.redirect === "string" ? search.redirect : undefined,
        }
    },
    component: LoginPage,
})

function LoginPage() {
    const search = Route.useSearch()
    const { isOrnate } = useAestheticMode()

    // Get redirect URL from search params (set by _protected beforeLoad)
    const redirectTo = search.redirect ?? "/chats"

    return (
        <div className="login-container">
            {/* Acoustic Field - Interactive sound wave background (Ornate mode only) */}
            {isOrnate && <AcousticField cols={40} rows={40} influenceRadius={100} maxScale={30} />}

            {/* Animated floating card with depth & spring physics */}
            <AnimatedCard className="login-card" variant="depth" spring="smooth">
                <div className="logo-section">
                    <LogIn className="logo-icon" size={48} strokeWidth={1.5} />
                    <h1 className="logo-text">Ping</h1>
                    <p className="tagline">Instant connection, lasting moments</p>
                </div>

                {/* redirectTo drives the OAuth callbackURL so Google redirects back here */}
                <LoginForm redirectTo={redirectTo} />
            </AnimatedCard>
        </div>
    )
}
