/**
 * Login Page - OAuth Authentication
 *
 * Features:
 * - Google/GitHub/Apple OAuth buttons
 * - Dark Mode glassmorphic design
 * - Acoustic Field interactive background (sound wave theme)
 * - Route-level auth protection with beforeLoad
 * - Auto-redirect for logged-in users (no loading flicker)
 */

import { LoginForm } from "@components/auth/LoginForm"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LogIn } from "lucide-react"

import { AcousticField } from "@/components/ui/acoustic-field"
import { AnimatedCard } from "@/components/ui/animated-card"
import { requireGuestServer } from "@/middleware/auth.middleware.server"
import "@/styles/auth-login.css"

export const Route = createFileRoute("/auth/")({
    // Redirect logged-in users to home (server-side protection)
    server: { middleware: [requireGuestServer] },
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
    const navigate = useNavigate()
    const search = Route.useSearch()

    // Get redirect URL from search params (set by requireAuth)
    const redirectTo = search.redirect || "/"

    return (
        <div className="login-container">
            {/* Acoustic Field - Interactive sound wave background */}
            <AcousticField cols={40} rows={40} influenceRadius={100} maxScale={30} />

            {/* Animated floating card with depth & spring physics */}
            <AnimatedCard className="login-card" variant="depth" spring="smooth">
                <div className="logo-section">
                    <LogIn className="logo-icon" size={48} strokeWidth={1.5} />
                    <h1 className="logo-text">Ping</h1>
                    <p className="tagline">Instant connection, lasting moments</p>
                </div>

                <LoginForm
                    onSuccess={() =>
                        navigate({
                            to: redirectTo,
                        })
                    }
                />
            </AnimatedCard>
        </div>
    )
}
