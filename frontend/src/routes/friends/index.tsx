/**
 * FriendsPage — Search, pending requests, and friends list
 *
 * Sonar Ping Design Language:
 * - Unified sonar view: searching collapses pending/friends sections to summary rows
 * - Dot-grid background briefly activates on keystroke
 * - Sonar ring pulses from search zone on each query change (Motion key re-trigger)
 * - Signal Broadcast: light particle rises from Add Friend button on send
 *
 * Three sections:
 * 1. Search — FriendSearchInput with inline results and sonar zone
 * 2. Pending Requests — collapses to summary row during search
 * 3. Friends List — collapses to summary row during search
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { UserCheck, Users } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { FriendshipStatus } from "@/types/friends"

import { FriendSearchInput } from "@/components/friends/FriendSearchInput"
import { PendingRequestCard } from "@/components/friends/PendingRequestCard"
import { UserStatusAvatar } from "@/components/shared/UserStatusAvatar"
import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import {
    friendsListQueryOptions,
    pendingRequestsQueryOptions,
    sentRequestsQueryOptions,
} from "@/graphql/options/friends"
import { requireAuthServer } from "@/middleware/auth.middleware.server"

import "@styles/components/friends.css"

// Default export for test imports (import("@/routes/friends/index").default)
export default FriendsPage

export const Route = createFileRoute("/friends/")({
    loader: ({ context: { queryClient } }) =>
        Promise.all([
            queryClient.ensureQueryData(pendingRequestsQueryOptions),
            queryClient.ensureQueryData(friendsListQueryOptions),
            queryClient.ensureQueryData(sentRequestsQueryOptions),
        ]),
    server: {
        middleware: [requireAuthServer],
    },
    component: FriendsPage,
})

// Motion variants for section expand/collapse during search
// Cubic bezier must be typed as a 4-tuple for Motion's BezierDefinition
const EASE_IN_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1]

const sectionVariants = {
    expanded: {
        height: "auto",
        opacity: 1,
        transition: { duration: 0.5, ease: EASE_IN_OUT },
    },
    collapsed: {
        height: "3rem",
        opacity: 0.6,
        // overflow is not animatable — handled via style prop directly
        transition: { duration: 0.35, ease: EASE_IN_OUT },
    },
}

// Stagger variants for initial list entry animation (fires once on mount)
const listContainerVariants = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.06 },
    },
}

const listItemVariants = {
    hidden: { opacity: 0, y: -6 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: EASE_IN_OUT },
    },
}

function FriendsPage() {
    const { data: pendingRequests = [] } = useQuery(pendingRequestsQueryOptions)
    const { data: friends = [] } = useQuery(friendsListQueryOptions)
    const { data: sentRequests = [] } = useQuery(sentRequestsQueryOptions)

    const { isMinimal } = useAestheticMode()

    const [searchQuery, setSearchQuery] = useState("")
    const isSearching = searchQuery.trim().length >= 2

    // Sonar ring — key counter triggers Motion remount, restarting animations from initial
    const [sonarKey, setSonarKey] = useState(0)

    // Dot-grid background state
    const [bgActive, setBgActive] = useState(false)
    const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Detect dark mode for ring count (single ring in dark, triple ripple in light)
    const isDark =
        typeof document !== "undefined" && document.documentElement.classList.contains("dark")

    // Trigger sonar ring and background flash on each search query change
    useEffect(() => {
        if (!isSearching || isMinimal) return

        // Flash background dot-grid
        setBgActive(true)
        if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
        bgTimerRef.current = setTimeout(() => setBgActive(false), 800)

        // Increment key — Motion remounts ring divs and restarts from initial
        setSonarKey((k) => k + 1)

        return () => {
            if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
        }
    }, [searchQuery, isSearching, isMinimal])

    const handleQueryChange = useCallback((q: string) => {
        setSearchQuery(q)
    }, [])

    const handleRequestResolved = () => {
        // TODO: restore when backend is ready: void refetchPending()
    }

    /**
     * Build friendshipStatusMap from cached query data so search results reflect
     * real friendship states (accepted friends, incoming pending, sent requests).
     */
    const friendshipStatusMap = useMemo<Map<string, FriendshipStatus>>(() => {
        const map = new Map<string, FriendshipStatus>()
        // Friends are ACCEPTED
        for (const friend of friends) {
            map.set(friend.id, "ACCEPTED")
        }
        // Incoming pending requests (they sent to us) = PENDING_RECEIVED
        for (const req of pendingRequests) {
            map.set(req.sender.id, "PENDING_RECEIVED")
        }
        // Outgoing sent requests (we sent, awaiting response) = PENDING_SENT
        for (const req of sentRequests) {
            map.set(req.receiver.id, "PENDING_SENT")
        }
        return map
    }, [friends, pendingRequests, sentRequests])

    return (
        <div className="friends-page">
            {/* Subtle dot-grid background — activates on keystroke, suppressed in minimal mode */}
            <div
                className={`friends-page__bg${bgActive ? " friends-page__bg--active" : ""}`}
                aria-hidden="true"
            />

            {/* Section 1: Search with sonar zone */}
            <section className="glass-card friends-page__section friends-page__section--search">
                <h2 className="friends-page__section-title">Find Friends</h2>
                <div className="friends-page__search-zone">
                    <FriendSearchInput
                        onQueryChange={handleQueryChange}
                        friendshipStatusMap={friendshipStatusMap}
                    />
                    {/*
                     * Sonar rings — Motion-driven circular rings expanding from search center.
                     * key={sonarKey}: React remounts on each increment → Motion restarts from initial.
                     * Suppressed in minimal aesthetic mode and prefers-reduced-motion (via CSS).
                     */}
                    {isSearching && sonarKey > 0 && !isMinimal && (
                        <div
                            key={sonarKey}
                            aria-hidden="true"
                            className="friends-page__sonar-rings"
                        >
                            <motion.div
                                className="friends-page__sonar-ring"
                                initial={{ scale: 0.8, opacity: 0.75 }}
                                animate={{ scale: 2.5, opacity: 0 }}
                                transition={{
                                    duration: isDark ? 0.25 : 0.45,
                                    ease: "easeOut",
                                }}
                            />
                            {/* Light mode only: two additional staggered rings (Kyoto Sunrise ripple) */}
                            {!isDark && (
                                <>
                                    <motion.div
                                        className="friends-page__sonar-ring"
                                        initial={{ scale: 0.8, opacity: 0.55 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        transition={{
                                            duration: 0.45,
                                            ease: "easeOut",
                                            delay: 0.08,
                                        }}
                                    />
                                    <motion.div
                                        className="friends-page__sonar-ring"
                                        initial={{ scale: 0.8, opacity: 0.35 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        transition={{
                                            duration: 0.45,
                                            ease: "easeOut",
                                            delay: 0.16,
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Section 2: Pending Requests — collapses to summary when searching */}
            <AnimatePresence initial={false}>
                {pendingRequests.length > 0 && (
                    <motion.section
                        key="pending-section"
                        className="glass-card friends-page__section friends-page__section--pending"
                        data-testid="pending-requests-section"
                        variants={sectionVariants}
                        initial="expanded"
                        animate={isSearching ? "collapsed" : "expanded"}
                        style={{ overflow: "hidden" }}
                        tabIndex={isSearching ? 0 : undefined}
                        role={isSearching ? "button" : undefined}
                        aria-label={
                            isSearching
                                ? `Requests (${pendingRequests.length}) — click to expand`
                                : undefined
                        }
                    >
                        {isSearching ? (
                            <p className="friends-page__section-summary">
                                Requests
                                <span className="friends-page__badge">
                                    {pendingRequests.length}
                                </span>
                            </p>
                        ) : (
                            <>
                                <h2 className="friends-page__section-title">
                                    Friend Requests
                                    <span className="friends-page__badge">
                                        {pendingRequests.length}
                                    </span>
                                </h2>
                                <motion.div
                                    className="friends-page__list"
                                    variants={listContainerVariants}
                                    initial="hidden"
                                    animate="show"
                                >
                                    {pendingRequests.map((request) => (
                                        <motion.div key={request.id} variants={listItemVariants}>
                                            <PendingRequestCard
                                                request={request}
                                                onAccepted={handleRequestResolved}
                                                onRejected={handleRequestResolved}
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </>
                        )}
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Section 3: Friends List — collapses to summary when searching */}
            <motion.section
                key="friends-section"
                className="glass-card friends-page__section friends-page__section--friends"
                variants={sectionVariants}
                initial="expanded"
                animate={isSearching ? "collapsed" : "expanded"}
                style={{ overflow: "hidden" }}
                tabIndex={isSearching ? 0 : undefined}
                role={isSearching ? "button" : undefined}
                aria-label={
                    isSearching ? `Friends (${friends.length}) — click to expand` : undefined
                }
            >
                {isSearching ? (
                    <p className="friends-page__section-summary">
                        <Users size={16} aria-hidden="true" />
                        Friends
                        {friends.length > 0 && (
                            <span className="friends-page__count">{friends.length}</span>
                        )}
                    </p>
                ) : (
                    <>
                        <h2 className="friends-page__section-title">
                            <Users size={18} aria-hidden="true" />
                            Friends
                            {friends.length > 0 && (
                                <span className="friends-page__count">{friends.length}</span>
                            )}
                        </h2>
                        <motion.div
                            className="friends-page__list"
                            variants={listContainerVariants}
                            initial="hidden"
                            animate="show"
                        >
                            {friends.map((friend) => (
                                <motion.div key={friend.id} variants={listItemVariants}>
                                    <div className="glass-card glass-card--compact user-card">
                                        {/* Avatar — image or UserStatusAvatar Facehash fallback */}
                                        {friend.image ? (
                                            <div className="user-card__avatar">
                                                <img
                                                    src={friend.image}
                                                    alt={friend.name}
                                                    className="user-card__avatar-img"
                                                />
                                            </div>
                                        ) : (
                                            <UserStatusAvatar
                                                userId={friend.id}
                                                userName={friend.name}
                                                size={32}
                                                showWaveRings={false}
                                            />
                                        )}
                                        <div className="user-card__info">
                                            <span className="user-card__name">{friend.name}</span>
                                            <span className="user-card__email">{friend.email}</span>
                                        </div>
                                        <div className="user-card__action">
                                            <div
                                                className="user-card__friends-badge"
                                                aria-label="Friends"
                                            >
                                                <UserCheck size={14} aria-hidden="true" />
                                                <span>Friends</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </>
                )}
            </motion.section>
        </div>
    )
}
