/**
 * FriendsPage — Search, pending requests, and friends list
 *
 * Three sections:
 * 1. Search — FriendSearchInput with inline results
 * 2. Pending Requests — hidden when count = 0, shows PendingRequestCard list
 * 3. Friends List — shows UserCard with ACCEPTED status
 *
 * TanStack Query + Router integration:
 * - Route loader prefetches data before component renders
 * - Component uses useSuspenseQuery (data guaranteed by loader)
 * - No loading/pending states needed in component
 */

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { UserCheck, Users } from "lucide-react"

import { PendingRequestCard } from "@/components/friends/PendingRequestCard"
import { FriendSearchInput } from "@/components/friends/FriendSearchInput"
import { friendsListQueryOptions, pendingRequestsQueryOptions } from "@/queries/friends"
import "@/styles/components/friends.css"

export const Route = createFileRoute("/friends/")({
    // Loader: Prefetch data before component renders
    loader: ({ context: { queryClient } }) =>
        Promise.all([
            queryClient.ensureQueryData(pendingRequestsQueryOptions),
            queryClient.ensureQueryData(friendsListQueryOptions),
        ]),
    component: FriendsPage,
})

export default function FriendsPage() {
    // useSuspenseQuery: Data guaranteed by loader, no isPending needed
    const { data: pendingRequests, refetch: refetchPending } = useSuspenseQuery(
        pendingRequestsQueryOptions
    )
    const { data: friends } = useSuspenseQuery(friendsListQueryOptions)

    const handleRequestResolved = () => {
        void refetchPending()
    }

    return (
        <div className="friends-page">
            {/* Section 1: Search */}
            <section className="glass-card friends-page__section friends-page__section--search">
                <h2 className="friends-page__section-title">Find Friends</h2>
                <FriendSearchInput />
            </section>

            {/* Section 2: Pending Requests — hidden when empty */}
            {pendingRequests.length > 0 && (
                <section
                    className="glass-card friends-page__section friends-page__section--pending"
                    data-testid="pending-requests-section"
                >
                    <h2 className="friends-page__section-title">
                        Friend Requests
                        <span className="friends-page__badge">{pendingRequests.length}</span>
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
                </section>
            )}

            {/* Section 3: Friends List */}
            <section className="glass-card friends-page__section friends-page__section--friends">
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
                                    <div className="user-card__avatar-fallback" aria-hidden="true">
                                        {(friend.name ?? friend.email ?? "?").charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="user-card__info">
                                <span className="user-card__name">{friend.name}</span>
                                <span className="user-card__email">{friend.email}</span>
                            </div>
                            <div className="user-card__action">
                                <div className="user-card__friends-badge" aria-label="Friends">
                                    <UserCheck size={14} aria-hidden="true" />
                                    <span>Friends</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
