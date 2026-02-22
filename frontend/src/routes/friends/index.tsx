/**
 * FriendsPage — Search, pending requests, and friends list
 *
 * Sonar Ping Design Language:
 * - Unified sonar view: searching collapses pending/friends sections to summary rows
 * - Dot-grid background briefly activates on keystroke
 * - Sonar ring pulses from search zone on each query change
 * - Signal Broadcast: light particle rises from Add Friend button on send
 *
 * Three sections:
 * 1. Search — FriendSearchInput with inline results and sonar zone
 * 2. Pending Requests — collapses to summary row during search
 * 3. Friends List — collapses to summary row during search
 */

import { createFileRoute } from "@tanstack/react-router"
import { UserCheck, Users } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { FriendSearchInput } from "@/components/friends/FriendSearchInput"
import { PendingRequestCard } from "@/components/friends/PendingRequestCard"
// TODO: restore when backend is ready
// import { friendsListQueryOptions, pendingRequestsQueryOptions } from "@/graphql/options/friends"
import "@/styles/components/friends.css"
import { requireAuthServer } from "@/middleware/auth.middleware.server"
import { FriendRequest, FriendshipStatus, User } from "@/types/friends"

// ---------------------------------------------------------------------------
// DUMMY DATA — remove and restore useSuspenseQuery + loader when backend ready
// ---------------------------------------------------------------------------
const DUMMY_PENDING: FriendRequest[] = [
    {
        id: "req-1",
        status: "PENDING",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        sender: { id: "user-2", name: "Bob Wang", email: "bob@ping.dev", image: null },
        receiver: { id: "user-1", name: "Alice Chen", email: "alice@ping.dev", image: null },
    },
    {
        id: "req-2",
        status: "PENDING",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        sender: {
            id: "user-5",
            name: "Eve Martinez",
            email: "eve@ping.dev",
            image: "https://i.pravatar.cc/150?u=eve",
        },
        receiver: { id: "user-1", name: "Alice Chen", email: "alice@ping.dev", image: null },
    },
]

/** Outgoing friend requests (we sent, awaiting response) */
const DUMMY_SENT: FriendRequest[] = [
    {
        id: "req-sent-1",
        status: "PENDING",
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        sender: { id: "user-1", name: "Alice Chen", email: "alice@ping.dev", image: null },
        receiver: { id: "user-8", name: "Henry Ho", email: "henry@ping.dev", image: null },
    },
]

const DUMMY_FRIENDS: User[] = [
    {
        id: "user-3",
        name: "Carol Lin",
        email: "carol@ping.dev",
        image: "https://i.pravatar.cc/150?u=carol",
    },
    { id: "user-4", name: "David Kim", email: "david@ping.dev", image: null },
    {
        id: "user-6",
        name: "Frank Wu",
        email: "frank@ping.dev",
        image: "https://i.pravatar.cc/150?u=frank",
    },
    { id: "user-7", name: "Grace Huang", email: "grace@ping.dev", image: null },
]
// ---------------------------------------------------------------------------

// Default export for test imports (import("@/routes/friends/index").default)
export default FriendsPage

export const Route = createFileRoute("/friends/")({
    // TODO: restore loader when backend is ready:
    // loader: ({ context: { queryClient } }) =>
    //     Promise.all([
    //         queryClient.ensureQueryData(pendingRequestsQueryOptions),
    //         queryClient.ensureQueryData(friendsListQueryOptions),
    //     ]),
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

// Duration of sonar ring CSS animation (must match --sonar-ring-duration tokens)
const SONAR_RING_DURATION_LIGHT = 450
const SONAR_RING_DURATION_DARK = 250

function FriendsPage() {
    // TODO: replace with useSuspenseQuery when backend is ready:
    // const { data: pendingRequests, refetch: refetchPending } = useSuspenseQuery(pendingRequestsQueryOptions)
    // const { data: friends } = useSuspenseQuery(friendsListQueryOptions)
    const pendingRequests = DUMMY_PENDING
    const friends = DUMMY_FRIENDS

    const [searchQuery, setSearchQuery] = useState("")
    const isSearching = searchQuery.trim().length >= 2

    // Sonar ring animation state
    const [sonarActive, setSonarActive] = useState(false)
    const sonarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Dot-grid background state
    const [bgActive, setBgActive] = useState(false)
    const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Detect dark mode for ring duration
    const isDark =
        typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    const ringDuration = isDark ? SONAR_RING_DURATION_DARK : SONAR_RING_DURATION_LIGHT

    // Trigger sonar ring and background flash on each search query change
    useEffect(() => {
        if (!isSearching) return

        // Flash background dot-grid
        setBgActive(true)
        if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
        bgTimerRef.current = setTimeout(() => setBgActive(false), 800)

        // Pulse sonar ring
        setSonarActive(false)
        // Allow re-trigger via RAF
        const rafId = requestAnimationFrame(() => {
            setSonarActive(true)
            sonarTimerRef.current = setTimeout(() => setSonarActive(false), ringDuration + 200)
        })

        return () => {
            cancelAnimationFrame(rafId)
            if (sonarTimerRef.current) clearTimeout(sonarTimerRef.current)
            if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
        }
    }, [searchQuery, isSearching, ringDuration])

    const handleQueryChange = useCallback((q: string) => {
        setSearchQuery(q)
    }, [])

    const handleRequestResolved = () => {
        // TODO: restore when backend is ready: void refetchPending()
    }

    /**
     * Build friendshipStatusMap from dummy data so search results can reflect
     * real friendship states (accepted friends, pending senders, sent requests).
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
        for (const req of DUMMY_SENT) {
            map.set(req.receiver.id, "PENDING_SENT")
        }
        return map
    }, [friends, pendingRequests])

    return (
        <div className="friends-page">
            {/* Subtle dot-grid background — activates on keystroke */}
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
                    {/* Sonar rings — Dark: single ring, Light: 3 staggered rings */}
                    <div
                        aria-hidden="true"
                        className={`friends-page__sonar-ring${sonarActive ? " friends-page__sonar-ring--active" : ""}`}
                    />
                    <div
                        aria-hidden="true"
                        className={`friends-page__sonar-ring${sonarActive ? " friends-page__sonar-ring--active-2" : ""}`}
                    />
                    <div
                        aria-hidden="true"
                        className={`friends-page__sonar-ring${sonarActive ? " friends-page__sonar-ring--active-3" : ""}`}
                    />
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
                                <div className="friends-page__list">
                                    {pendingRequests.map((request) => (
                                        <PendingRequestCard
                                            key={request.id}
                                            request={request}
                                            onAccepted={handleRequestResolved}
                                            onRejected={handleRequestResolved}
                                        />
                                    ))}
                                </div>
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
                        <div className="friends-page__list">
                            {friends.map((friend) => (
                                <div
                                    key={friend.id}
                                    className="glass-card glass-card--compact user-card"
                                >
                                    <div className="user-card__avatar">
                                        {friend.image ? (
                                            <img
                                                src={friend.image}
                                                alt={friend.name}
                                                className="user-card__avatar-img"
                                            />
                                        ) : (
                                            <div
                                                className="user-card__avatar-fallback"
                                                aria-hidden="true"
                                            >
                                                {(friend.name ?? friend.email ?? "?")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                        )}
                                    </div>
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
                            ))}
                        </div>
                    </>
                )}
            </motion.section>
        </div>
    )
}
