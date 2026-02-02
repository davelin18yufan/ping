/**
 * Login Page - OAuth Authentication
 *
 * Features:
 * - Google/GitHub/Apple OAuth buttons
 * - Dark Mode glassmorphic design
 * - Route-level auth protection with beforeLoad
 * - Auto-redirect for logged-in users (no loading flicker)
 */

import { LoginForm } from "@components/auth/LoginForm"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LogIn } from "lucide-react"

import { requireGuestServer } from "@/middleware/auth.middleware.server"
import "@/styles/auth-login.css"

export const Route = createFileRoute("/auth/")({
    // Redirect logged-in users to home (server-side protection)
    server: { middleware: [requireGuestServer] },
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
            {/* Ambient background */}
            <div className="ambient-bg" />

            {/* Floating card */}
            <div className="login-card">
                <div className="logo-section">
                    <div className="logo-glow" />
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
            </div>
        </div>
    )
}
