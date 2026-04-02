/**
 * FriendsPage — two-pane layout matching /chats structure.
 *
 * Layout:
 *   ┌────────────────┬────────────────────────────────┐
 *   │  Sidebar       │  Main (empty state)             │
 *   │  ~280px        │  flex: 1                        │
 *   │  friends list  │  "Select a friend to message"   │
 *   └────────────────┴────────────────────────────────┘
 *
 * Sidebar sections:
 *   Header: "Friends" title + [+] Add Friend button → AddFriendModal
 *   Search: filters existing friends list (name + email)
 *   Filters: All [count] / Pending [badge]
 *   List: FriendItem rows (All) or PendingRequestCard rows (Pending)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { UserPlus, Users } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useDeferredValue, useMemo, useState, useTransition } from "react"

import { AddFriendModal } from "@/components/friends/AddFriendModal"
import { FriendItem } from "@/components/friends/FriendItem"
import { PendingRequestCard } from "@/components/friends/PendingRequestCard"
import { SearchInput } from "@/components/ui/SearchInput"
import { GET_OR_CREATE_CONVERSATION_MUTATION } from "@/graphql/options/conversations"
import {
    friendsListQueryOptions,
    pendingRequestsQueryOptions,
    sentRequestsQueryOptions,
} from "@/graphql/options/friends"
import { graphqlFetch } from "@/lib/graphql-client"
import { cn } from "@/lib/utils"
import { uiStore } from "@/stores/uiStore"
import type { Conversation } from "@/types/conversations"
import type { FriendshipStatus } from "@/types/friends"

type FriendFilter = "all" | "pending"

// Motion variants for list item enter/exit — opacity only (no y-translation avoids layout shift)
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1]
const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.18, ease: EASE } },
    exit: { opacity: 0, transition: { duration: 0.12, ease: EASE } },
}

export function FriendsPage() {
    const { data: friends = [] } = useQuery(friendsListQueryOptions)
    const { data: pendingRequests = [] } = useQuery(pendingRequestsQueryOptions)
    const { data: sentRequests = [] } = useQuery(sentRequestsQueryOptions)

    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [searchQuery, setSearchQuery] = useState("")
    // useDeferredValue: search input updates instantly; filtering runs at idle time
    const deferredSearch = useDeferredValue(searchQuery)
    const [activeFilter, setActiveFilter] = useState<FriendFilter>("all")
    // startTransition: filter switches are non-urgent — keep old tab visible while React prepares the new one
    const [, startFilterTransition] = useTransition()
    const [showAddFriend, setShowAddFriend] = useState(false)
    const [loadingDMForId, setLoadingDMForId] = useState<string | null>(null)

    const startDMMutation = useMutation({
        mutationFn: (userId: string) =>
            graphqlFetch<{ getOrCreateConversation: Conversation }>(
                GET_OR_CREATE_CONVERSATION_MUTATION,
                { userId }
            ),
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            const conversationId = data.getOrCreateConversation.id
            uiStore.setState((s) => ({ ...s, activeConversationId: conversationId }))
            void navigate({
                to: "/chats/$conversationId",
                params: { conversationId },
                viewTransition: false,
            })
            setLoadingDMForId(null)
        },
        onError: () => setLoadingDMForId(null),
    })

    const handleMessage = useCallback(
        (userId: string) => {
            if (startDMMutation.isPending) return
            setLoadingDMForId(userId)
            void startDMMutation.mutate(userId)
        },
        [startDMMutation]
    )

    /**
     * friendshipStatusMap — passed to AddFriendModal so UserCard search results
     * reflect current friendship state (already friends, pending sent, etc.)
     */
    const friendshipStatusMap = useMemo<Map<string, FriendshipStatus>>(() => {
        const map = new Map<string, FriendshipStatus>()
        for (const friend of friends) map.set(friend.id, "ACCEPTED")
        for (const req of pendingRequests) map.set(req.sender.id, "PENDING_RECEIVED")
        for (const req of sentRequests) map.set(req.receiver.id, "PENDING_SENT")
        return map
    }, [friends, pendingRequests, sentRequests])

    /** Friends filtered by search query — runs deferred to avoid blocking input */
    const filteredFriends = useMemo(() => {
        if (!deferredSearch.trim()) return friends
        const q = deferredSearch.toLowerCase()
        return friends.filter(
            (f) => f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)
        )
    }, [friends, deferredSearch])

    const filteredPendingRequests = useMemo(() => {
        if (!deferredSearch.trim()) return pendingRequests
        const q = deferredSearch.toLowerCase()
        return pendingRequests.filter(
            (f) =>
                f.sender.name.toLowerCase().includes(q) || f.sender.email.toLowerCase().includes(q)
        )
    }, [pendingRequests, deferredSearch])

    return (
        <>
            <div className="friends-layout">
                {/* ── Sidebar ──────────────────────────────────── */}
                <aside className="friends-layout__sidebar glass-card" aria-label="Friends">
                    {/* Header */}
                    <div className="friends-layout__sidebar-header">
                        <h1 className="friends-layout__sidebar-title">Friends</h1>
                        <button
                            type="button"
                            className="glass-button friends-layout__new-btn"
                            onClick={() => setShowAddFriend(true)}
                            aria-label="Add friend"
                            title="Add friend"
                        >
                            <UserPlus size={16} aria-hidden="true" />
                        </button>
                    </div>

                    {/* Search bar — filters existing friends list */}
                    <div className="friends-layout__search-wrapper">
                        <SearchInput
                            wrapperClassName="friends-layout__search-input-row"
                            iconClassName="friends-layout__search-icon"
                            inputClassName="friends-layout__search-input"
                            clearClassName="friends-layout__search-clear"
                            placeholder="Search friends…"
                            aria-label="Search friends"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            onClear={() => setSearchQuery("")}
                        />
                    </div>

                    {/* Filter chips */}
                    <div
                        className="friends-layout__filters"
                        role="group"
                        aria-label="Filter friends"
                    >
                        <button
                            type="button"
                            className={cn(
                                "friends-filter-chip",
                                activeFilter === "all" && "friends-filter-chip--active"
                            )}
                            onClick={() => startFilterTransition(() => setActiveFilter("all"))}
                            aria-pressed={activeFilter === "all"}
                        >
                            All
                            {filteredFriends.length > 0 && (
                                <span className="friends-layout__count">
                                    {filteredFriends.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            className={cn(
                                "friends-filter-chip",
                                activeFilter === "pending" && "friends-filter-chip--active"
                            )}
                            onClick={() => {
                                setSearchQuery("")
                                startFilterTransition(() => setActiveFilter("pending"))
                            }}
                            aria-pressed={activeFilter === "pending"}
                        >
                            Pending
                            {filteredPendingRequests.length > 0 && (
                                <span className="friends-layout__badge">
                                    {filteredPendingRequests.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Scrollable list */}
                    <div className="friends-layout__sidebar-list">
                        {/*
                         * Outer AnimatePresence keys on activeFilter.
                         * mode="wait": old tab fully exits before new tab enters —
                         * only one tab's DOM exists at a time, preventing height reflow.
                         * startTransition above keeps the old tab visible while React prepares the new one.
                         */}
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={activeFilter}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.12, ease: EASE }}
                                className="friends-layout__sidebar-list-tab"
                            >
                                {activeFilter === "pending" ? (
                                    // Pending requests view
                                    filteredPendingRequests.length === 0 ? (
                                        <div className="friends-layout__list-empty">
                                            <p>No pending requests</p>
                                        </div>
                                    ) : (
                                        // Inner AnimatePresence handles individual card add/remove within the tab
                                        <AnimatePresence initial={false}>
                                            {filteredPendingRequests.map((request) => (
                                                <motion.div
                                                    key={request.id}
                                                    variants={itemVariants}
                                                    initial="hidden"
                                                    animate="show"
                                                    exit="exit"
                                                >
                                                    <PendingRequestCard
                                                        request={request}
                                                        onAccepted={() => {}}
                                                        onRejected={() => {}}
                                                    />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    )
                                ) : // Friends list view
                                filteredFriends.length === 0 ? (
                                    <div className="friends-layout__list-empty">
                                        {searchQuery.trim() ? (
                                            <p>No friends match &quot;{searchQuery}&quot;</p>
                                        ) : (
                                            <>
                                                <Users size={32} aria-hidden="true" />
                                                <p>No friends yet</p>
                                                <p className="friends-layout__list-empty-hint">
                                                    Click + to find friends
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    // Inner AnimatePresence handles individual item add/remove (e.g. new friend added)
                                    <AnimatePresence initial={false}>
                                        {filteredFriends.map((friend) => (
                                            <motion.div
                                                key={friend.id}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="show"
                                                exit="exit"
                                            >
                                                <FriendItem
                                                    friend={friend}
                                                    onMessage={handleMessage}
                                                    isLoading={loadingDMForId === friend.id}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </aside>

                {/* ── Main Content ─────────────────────────────── */}
                <main className="friends-layout__main">
                    <div className="friends-layout__empty-state">
                        <Users size={40} aria-hidden="true" />
                        <h2>Your Friends</h2>
                        <p>
                            Select a friend to send a message, or click&nbsp;+ to add new friends.
                        </p>
                    </div>
                </main>
            </div>

            <AddFriendModal
                open={showAddFriend}
                onClose={() => setShowAddFriend(false)}
                friendshipStatusMap={friendshipStatusMap}
            />
        </>
    )
}
