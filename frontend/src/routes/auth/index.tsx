/**
 * Login Page - OAuth Authentication
 *
 * Features:
 * - Google/GitHub/Apple OAuth buttons
 * - Dark Mode glassmorphic design
 * - Loading states and error handling
 * - Auto-redirect for logged-in users
 */

import { LoginForm } from "@components/auth/LoginForm"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LogIn } from "lucide-react"
import { useEffect } from "react"

import { SoundWaveLoader } from "@/components/ui/SoundWaveLoader"
import { useSession } from "@/lib/auth-client"
import "@/styles/auth-login.css"

export const Route = createFileRoute("/auth/")({
    component: LoginPage,
})

function LoginPage() {
    const navigate = useNavigate()
    const { data: session, isPending } = useSession()

    // Auto-redirect if already logged in
    useEffect(() => {
        if (session && !isPending) {
            navigate({ to: "/" })
        }
    }, [session, isPending, navigate])

    // Show sound wave loading animation while checking session
    if (!isPending) {
        return <SoundWaveLoader size="lg" />
    }

    // Don't render login form if already logged in
    if (session) {
        return null
    }

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
