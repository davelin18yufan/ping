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
 * State model (single source of truth in uiStore):
 *   headerExpanded = true   → expanded zone visible
 *   headerExpanded = false  → collapsed
 *
 *   mouseEnter / onFocus    → headerExpanded = true
 *   mouseLeave / onBlur     → headerExpanded = false
 *   logo click              → toggle headerExpanded
 *   scroll down             → minimal (overrides expanded)
 */

import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useStore } from "@tanstack/react-store"
import { LogOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { pendingRequestsQueryOptions } from "@/queries/friends"

import { AestheticModeToggle } from "@/components/shared/AestheticModeToggle"
import { SoundWaveLoader } from "@/components/shared/SoundWaveLoader"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { UserStatusAvatar } from "@/components/shared/UserStatusAvatar"
import { useScrollDirection } from "@/hooks/useScrollDirection"
import { signOut, useSession } from "@/lib/auth-client"

import "@/styles/components/capsule-header.css"
import "@/styles/components/glass-button.css"
import "@/styles/components/friends.css"
import { uiStore } from "@/stores/uiStore"

type CapsuleState = "minimal" | "default" | "expanded"

export default function AppHeader() {
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [isNudging, setIsNudging] = useState(false)
    const isExpanded = useStore(uiStore, (s) => s.headerExpanded)
    const isViewTransitioning = useStore(uiStore, (s) => s.isViewTransitioning)
    const navigate = useNavigate()

    const scrollDirection = useScrollDirection()
    const { data: sessionData, isPending } = useSession()

    // Tracks whether the physical cursor is currently inside the header.
    // Updated unconditionally in onMouseEnter/onMouseLeave (before any guard),
    // so it always reflects real cursor state even during View Transitions.
    const cursorInHeaderRef = useRef(false)
    const prevIsViewTransitioning = useRef(false)

    const prevIsAuthenticated = useRef<boolean | null>(null)
    const nudgeTimeout = useRef<NodeJS.Timeout | null>(null)

    const user = sessionData?.user ?? null
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

    useEffect(
        () => {
            if (nudgeTimeout.current) clearTimeout(nudgeTimeout.current)
        },
        []
    )

    // When a View Transition ends, check whether the cursor actually left the
    // header during the animation (the mouseleave was suppressed by the guard).
    // If the cursor is no longer inside, collapse the header now.
    useEffect(() => {
        if (prevIsViewTransitioning.current && !isViewTransitioning) {
            if (!cursorInHeaderRef.current) {
                uiStore.setState((s) => ({ ...s, headerExpanded: false }))
            }
        }
        prevIsViewTransitioning.current = isViewTransitioning
    }, [isViewTransitioning])

    // scroll-down takes highest priority, then expanded, then default
    const effectiveState: CapsuleState = (() => {
        if (scrollDirection === "down") return "minimal"
        if (isExpanded) return "expanded"
        return "default"
    })()

    const capsuleClass = [
        "capsule-header",
        effectiveState === "minimal" ? "capsule-header--minimal" : "",
        effectiveState === "expanded" ? "capsule-header--expanded" : "",
        isNudging ? "capsule-header--nudge" : "",
    ]
        .filter(Boolean)
        .join(" ")

    const handleSignOut = async () => {
        if (isSigningOut) return
        setIsSigningOut(true)
        try {
            await signOut()
            void navigate({ to: "/auth" })
        } catch {
            setIsSigningOut(false)
        }
    }

    return (
        <header
            className={capsuleClass}
            style={{
                position: "fixed",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 50,
            }}
            onMouseEnter={() => {
                cursorInHeaderRef.current = true
                uiStore.setState((s) => ({ ...s, headerExpanded: true }))
            }}
            onMouseLeave={() => {
                // Always track real cursor state first (before any guard).
                cursorInHeaderRef.current = false
                // Ignore synthetic mouseleave emitted during View Transitions —
                // the useEffect on isViewTransitioning will collapse the header
                // after the transition ends if the cursor truly left.
                if (uiStore.state.isViewTransitioning) return
                uiStore.setState((s) => ({ ...s, headerExpanded: false }))
            }}
            onFocus={() => uiStore.setState((s) => ({ ...s, headerExpanded: true }))}
            onBlur={(e) => {
                // Ignore blur during a View Transition (the transition flag is the
                // authoritative guard; relatedTarget === null is a secondary check).
                if (uiStore.state.isViewTransitioning) return
                if (e.relatedTarget === null) return
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    uiStore.setState((s) => ({ ...s, headerExpanded: false }))
                }
            }}
            aria-label="Application header"
        >
            <div className="capsule-header__inner">
                {/* ── Logo (always visible, left) ── */}
                <button
                    className="capsule-header__logo"
                    onClick={() =>
                        uiStore.setState((s) => ({ ...s, headerExpanded: !s.headerExpanded }))
                    }
                    aria-label="Toggle header"
                    aria-expanded={isExpanded}
                >
                    <span className="capsule-header__logo-dot" aria-hidden="true" />
                    <span className="capsule-header__logo-text">Ping</span>
                </button>

                {/* ── Flex spacer ── */}
                <div className="capsule-header__spacer" />

                {/* ── Avatar with status (always visible, right) ── */}
                {isAuthenticated && user && (
                    <div className="capsule-header__avatar" style={{ position: "relative" }}>
                        <UserStatusAvatar
                            userId={user.id}
                            userName={user.name ?? user.email}
                            size={26}
                            isInteractive={effectiveState === "expanded"}
                        />
                        <PendingFriendRequestBadge />
                    </div>
                )}

                {/* ══════════════════════════════════════════════════
                    EXPANDED ZONE — single max-width container.
                    All items inside share ONE overflow clip region.
                    Do NOT add individual max-width to children.
                    ══════════════════════════════════════════════════ */}
                <div className="capsule-header__expanded-zone">
                    {/* child 1: user name */}
                    {isAuthenticated && user && (
                        <span className="capsule-header__user-name">{user.name ?? user.email}</span>
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
                            className="glass-button glass-button--sm glass-button--destructive"
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

// ---------------------------------------------------------------------------
// PendingFriendRequestBadge — TanStack Query pattern
// Fetches pending friend requests and displays count badge
// Hidden when count = 0 (no empty state)
// ---------------------------------------------------------------------------

function PendingFriendRequestBadge() {
    const { data } = useQuery(pendingRequestsQueryOptions)

    const count = data?.length ?? 0
    if (count === 0) return null

    return (
        <span
            className="friend-request-badge"
            data-testid="friend-request-badge"
            aria-label={`${count} pending friend request${count !== 1 ? "s" : ""}`}
        >
            {count > 99 ? "99+" : count}
        </span>
    )
}
