/**
 * FriendSearchInput — debounced user search with inline results list
 *
 * - Uses .glass-input--search with Search icon absolutely positioned left
 * - Inline results appear below input (not a dropdown)
 * - Results animate in: translateY(-4px) opacity(0) -> translateY(0) opacity(1), stagger 40ms
 * - Loading: SoundWaveLoader size="sm" on right of input
 * - Empty state (query >= 2 chars, 0 results): UserX icon + "No users found for '...'"
 * - < 2 chars: no results area rendered
 */

import { Search, UserX } from "lucide-react"

import { SoundWaveLoader } from "@/components/shared/SoundWaveLoader"
import { useSearchUsers } from "@/hooks/useSearchUsers"
import "@/styles/components/friends.css"
import { UserCard } from "./UserCard"

interface SearchUser {
    id: string
    name: string
    email: string
    image: string | null
}

interface FriendSearchInputProps {
    onResultSelect?: (user: SearchUser) => void
}

export function FriendSearchInput({ onResultSelect }: FriendSearchInputProps) {
    const { query, setQuery, results, loading } = useSearchUsers()

    const showResults = query.trim().length >= 2
    const isEmpty = showResults && !loading && results.length === 0

    return (
        <div className="friend-search">
            {/* Input wrapper */}
            <div className="friend-search__input-wrapper">
                <Search size={16} className="friend-search__icon" aria-hidden="true" />
                <input
                    type="search"
                    className="glass-input glass-input--search friend-search__input"
                    placeholder="Search users..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search users"
                    autoComplete="off"
                />
                {loading && (
                    <div className="friend-search__loader">
                        <SoundWaveLoader size="sm" />
                    </div>
                )}
            </div>

            {/* Inline results */}
            {showResults && (
                <div
                    className="friend-search__results"
                    data-testid="search-results"
                    role="list"
                    aria-label="Search results"
                >
                    {isEmpty ? (
                        <div className="friend-search__empty" role="status" aria-live="polite">
                            <UserX size={20} aria-hidden="true" />
                            <span>No users found for &quot;{query}&quot;</span>
                        </div>
                    ) : (
                        results.map((user, index) => (
                            <div
                                key={user.id}
                                className="friend-search__result-item"
                                style={{ animationDelay: `${index * 40}ms` }}
                                role="listitem"
                                onClick={() => onResultSelect?.(user)}
                            >
                                <UserCard user={user} friendshipStatus="NONE" />
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
