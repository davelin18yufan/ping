/**
 * AddFriendModal — search for users and send friend requests.
 *
 * Sonar Ping Design Language (scoped to this modal):
 *   - Dot-grid background briefly activates on keystroke
 *   - Sonar ring pulses from search zone on each query change (Motion key re-trigger)
 *   - Signal Broadcast: light particle rises from Add Friend button on send (via UserCard)
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" + aria-labelledby on panel
 *   - overscrollBehavior: contain on panel
 *   - Overlay click closes the modal
 *   - Search input receives focus on open (autoFocus — single primary input)
 */

import { UserX, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { SoundWaveLoader } from "@/components/shared/SoundWaveLoader"
import { SearchInput } from "@/components/ui/SearchInput"
import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { useSearchUsers } from "@/hooks/useSearchUsers"
import type { FriendshipStatus } from "@/types/friends"

import { UserCard } from "./UserCard"

interface AddFriendModalProps {
    open: boolean
    onClose: () => void
    /** Maps userId → FriendshipStatus so UserCard shows the correct action state */
    friendshipStatusMap: Map<string, FriendshipStatus>
}

export function AddFriendModal({ open, onClose, friendshipStatusMap }: AddFriendModalProps) {
    const { query, setQuery, results, loading } = useSearchUsers()
    const { isMinimal } = useAestheticMode()

    const showResults = query.trim().length >= 2
    const isEmpty = showResults && !loading && results.length === 0

    // Sonar ring key counter — increments on each query change to remount Motion divs,
    // restarting the ring animation from initial state on every new search.
    const [sonarKey, setSonarKey] = useState(0)

    // Dot-grid background state — briefly activates on keystroke then fades out
    const [bgActive, setBgActive] = useState(false)
    const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isDark =
        typeof document !== "undefined" && document.documentElement.classList.contains("dark")

    // Trigger sonar ring and background flash on each query change
    useEffect(() => {
        if (!showResults || isMinimal) return

        setBgActive(true)
        if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
        bgTimerRef.current = setTimeout(() => setBgActive(false), 800)
        setSonarKey((k) => k + 1)

        return () => {
            if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
        }
    }, [query, showResults, isMinimal])

    // Reset all state when modal closes so it's fresh on next open
    function handleClose() {
        setQuery("")
        setSonarKey(0)
        setBgActive(false)
        onClose()
    }

    function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) handleClose()
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="add-friend-overlay"
                    className="add-friend-modal__overlay"
                    style={{ background: "oklch(0 0 0 / 0.5)", backdropFilter: "blur(4px)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleOverlayClick}
                >
                    {/* Dot-grid background — suppressed in minimal aesthetic mode */}
                    <div
                        className={`add-friend-modal__bg${bgActive ? " add-friend-modal__bg--active" : ""}`}
                        aria-hidden="true"
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-friend-title"
                        className="glass-card glass-card--modal add-friend-modal__panel"
                        style={{ overscrollBehavior: "contain" }}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="add-friend-modal__header">
                            <h2 id="add-friend-title" className="add-friend-modal__title">
                                Find Friends
                            </h2>
                            <button
                                type="button"
                                className="glass-button"
                                style={{ padding: "0.25rem" }}
                                onClick={handleClose}
                                aria-label="Close dialog"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Search zone — sonar rings centered on this zone */}
                        <div className="add-friend-modal__search-zone">
                            <SearchInput
                                wrapperClassName="add-friend-modal__search-row"
                                iconClassName="add-friend-modal__search-icon"
                                inputClassName="add-friend-modal__search-input"
                                clearClassName="add-friend-modal__search-clear"
                                placeholder="Search users…"
                                aria-label="Search users"
                                value={query}
                                onChange={setQuery}
                                onClear={() => setQuery("")}
                                autoFocus
                                suffix={
                                    loading ? (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                paddingRight: "0.25rem",
                                            }}
                                        >
                                            <SoundWaveLoader size="sm" />
                                        </div>
                                    ) : null
                                }
                            />

                            {/*
                             * Sonar rings — Motion-driven circular rings expanding from center.
                             * key={sonarKey}: remounts on each increment → restarts from initial.
                             * Suppressed in minimal aesthetic mode and prefers-reduced-motion (CSS).
                             */}
                            {showResults && sonarKey > 0 && !isMinimal && (
                                <div
                                    key={sonarKey}
                                    aria-hidden="true"
                                    className="add-friend-modal__sonar-rings"
                                >
                                    <motion.div
                                        className="add-friend-modal__sonar-ring"
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
                                                className="add-friend-modal__sonar-ring"
                                                initial={{ scale: 0.8, opacity: 0.55 }}
                                                animate={{ scale: 2.5, opacity: 0 }}
                                                transition={{
                                                    duration: 0.45,
                                                    ease: "easeOut",
                                                    delay: 0.08,
                                                }}
                                            />
                                            <motion.div
                                                className="add-friend-modal__sonar-ring"
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

                        {/* Results list */}
                        {showResults && (
                            <div
                                className="add-friend-modal__results"
                                role="list"
                                aria-label="Search results"
                                aria-live="polite"
                            >
                                {isEmpty ? (
                                    <div className="add-friend-modal__empty" role="status">
                                        <UserX size={20} aria-hidden="true" />
                                        <span>No users found for &quot;{query}&quot;</span>
                                    </div>
                                ) : (
                                    results.map((user, index) => (
                                        <div
                                            key={user.id}
                                            className="add-friend-modal__result-item"
                                            style={{ animationDelay: `${index * 40}ms` }}
                                            role="listitem"
                                        >
                                            <UserCard
                                                user={user}
                                                friendshipStatus={
                                                    friendshipStatusMap.get(user.id) ?? "NONE"
                                                }
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Hint when no query yet */}
                        {!showResults && (
                            <p className="add-friend-modal__hint" aria-live="polite">
                                Type at least 2 characters to search for users.
                            </p>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
