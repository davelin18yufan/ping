/**
 * AppHeader - Capsule Morphing Header
 *
 * Three states:
 * - MINIMAL  (scroll down)  : [● dot]  [spacer]  [avatar+status]                   ~80px
 * - DEFAULT  (top/scroll up): [● Ping] [spacer]  [avatar+status]                  ~220px
 * - EXPANDED (hover/click)  : [● Ping] [spacer]  [avatar+status] + expanded-zone  ~520px
 *
 * expanded-zone (single container, ONE max-width clip):
 *   [name] | [aesthetic-toggle] [theme-toggle] | [sign-out]
 *
 * Controls are ONLY visible inside expanded-zone.
 */

import { LogOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { AestheticModeToggle } from "@/components/shared/AestheticModeToggle"
import { SoundWaveLoader } from "@/components/shared/SoundWaveLoader"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { UserStatusAvatar } from "@/components/shared/UserStatusAvatar"
import { useScrollDirection } from "@/hooks"
import { signOut, useSession } from "@/lib/auth-client"
import "@/styles/components/capsule-header.css"
import "@/styles/components/glass-button.css"

type CapsuleState = "minimal" | "default" | "expanded"

export default function AppHeader() {
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isClickExpanded, setIsClickExpanded] = useState(false)
    const [isNudging, setIsNudging] = useState(false)

    const scrollDirection = useScrollDirection()
    const { data: sessionData, isPending } = useSession()

    const prevIsAuthenticated = useRef<boolean | null>(null)
    const nudgeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    // TODO: Dev fallback — always show header during development
    const user = sessionData?.user || {
        email: "example@gmail.com",
        id: "test",
        name: "Dave Lin",
    }
    const isAuthenticated = !isPending && !!user

    // Nudge animation when auth state changes
    useEffect(() => {
        if (prevIsAuthenticated.current === null) {
            prevIsAuthenticated.current = isAuthenticated
            return
        }
        if (prevIsAuthenticated.current !== isAuthenticated) {
            prevIsAuthenticated.current = isAuthenticated
            setIsNudging(true)
            if (nudgeTimeout.current) clearTimeout(nudgeTimeout.current)
            nudgeTimeout.current = setTimeout(() => setIsNudging(false), 520)
        }
    }, [isAuthenticated])

    useEffect(() => () => {
        if (nudgeTimeout.current) clearTimeout(nudgeTimeout.current)
    }, [])

    const effectiveState: CapsuleState = (() => {
        if (isHovered || isClickExpanded) return "expanded"
        if (scrollDirection === "down") return "minimal"
        return "default"
    })()

    const capsuleClass = [
        "capsule-header",
        effectiveState === "minimal"  ? "capsule-header--minimal"  : "",
        effectiveState === "expanded" ? "capsule-header--expanded" : "",
        isNudging                     ? "capsule-header--nudge"    : "",
    ].filter(Boolean).join(" ")

    const handleSignOut = async () => {
        if (isSigningOut) return
        setIsSigningOut(true)
        try {
            await signOut()
            window.location.href = "/auth"
        } catch {
            setIsSigningOut(false)
        }
    }

    return (
        <header
            className={capsuleClass}
            style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsHovered(false) }}
            aria-label="Application header"
        >
            <div className="capsule-header__inner">

                {/* ── Logo (always visible, left) ── */}
                <button
                    className="capsule-header__logo"
                    onClick={() => setIsClickExpanded((p) => !p)}
                    aria-label="Toggle header"
                    aria-expanded={isClickExpanded}
                >
                    <span className="capsule-header__logo-dot" aria-hidden="true" />
                    <span className="capsule-header__logo-text">Ping</span>
                </button>

                {/* ── Flex spacer ── */}
                <div className="capsule-header__spacer" />

                {/* ── Avatar with status (always visible, right) ── */}
                {isAuthenticated && user && (
                    <div className="capsule-header__avatar">
                        <UserStatusAvatar
                            userId={user.id}
                            userName={user.name ?? user.email}
                            size={26}
                            isInteractive={effectiveState === "expanded"}
                        />
                    </div>
                )}

                {/* ══════════════════════════════════════════════════
                    EXPANDED ZONE — single max-width container.
                    All items inside share ONE overflow clip region.
                    Do NOT add individual max-width to children.
                    ══════════════════════════════════════════════════ */}
                <div
                    className="capsule-header__expanded-zone"
                    aria-hidden={effectiveState !== "expanded"}
                >
                    {/* child 1: user name */}
                    {isAuthenticated && user && (
                        <span className="capsule-header__user-name">
                            {user.name ?? user.email}
                        </span>
                    )}

                    {/* child 2: vertical divider */}
                    <span className="capsule-header__divider" aria-hidden="true" />

                    {/* child 3: controls group */}
                    <div className="capsule-header__controls">
                        <AestheticModeToggle />
                        <ThemeToggle />
                    </div>

                    {/* child 4: sign out */}
                    {isAuthenticated && (
                        <button
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="app-header__sign-out glass-button glass-button--sm"
                            aria-label="Sign out"
                            aria-busy={isSigningOut}
                        >
                            {isSigningOut ? (
                                <SoundWaveLoader size="sm" />
                            ) : (
                                <>
                                    <LogOut size={14} aria-hidden="true" />
                                    <span>Sign out</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

            </div>
        </header>
    )
}
