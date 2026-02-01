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

import { requireGuest } from "@/middleware/auth.middleware"
import "@/styles/auth-login.css"

export const Route = createFileRoute("/auth/")({
    // Redirect logged-in users to home (route-level protection)
    beforeLoad: requireGuest,
    component: LoginPage,
})

function LoginPage() {
    const navigate = useNavigate()

    // No need for useSession() check - requireGuest middleware ensures user is not logged in

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

                <LoginForm onSuccess={() => navigate({ to: "/" })} />
            </div>
        </div>
    )
}
