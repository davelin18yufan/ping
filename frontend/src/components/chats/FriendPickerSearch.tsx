/**
 * FriendPickerSearch — searchable friend multi-select for group flows.
 *
 * Accessibility:
 *   - Real <input type="checkbox"> inside <label> (single hit-target per guideline)
 *   - sr-only checkbox for screen reader announce; label wraps the visual row
 *   - Search input has aria-label; no visible label needed (placeholder explains purpose)
 *   - overscroll-behavior: contain on scroll area
 *   - touch-action: manipulation on rows to prevent double-tap zoom
 *
 * Uses @/components/ui/input for the search field (leftIcon + variant support).
 */

import { Check, Search } from "lucide-react"
import { useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface PickableFriend {
    id: string
    name: string
    image?: string | null
}

interface FriendPickerSearchProps {
    /** Full list of friends the user can pick from */
    friends: PickableFriend[]
    /** IDs currently selected (checked) */
    selectedIds: string[]
    /** Called when a row is toggled */
    onToggle: (id: string) => void
    /** IDs to hide entirely (e.g. already-in-group members) */
    excludeIds?: string[]
    placeholder?: string
    /** Message when the full list is empty (before typing) */
    emptyMessage?: string
}

export function FriendPickerSearch({
    friends,
    selectedIds,
    onToggle,
    excludeIds = [],
    placeholder = "Search friends\u2026",
    emptyMessage = "No friends yet",
}: FriendPickerSearchProps) {
    const [search, setSearch] = useState("")
    const query = search.trim().toLowerCase()

    const filtered = friends.filter(
        (f) => !excludeIds.includes(f.id) && f.name.toLowerCase().includes(query)
    )

    return (
        <div className="flex flex-col gap-2">
            {/* Search field */}
            <Input
                leftIcon={<Search size={14} aria-hidden="true" />}
                placeholder={placeholder}
                value={search}
                onChange={setSearch}
                size="sm"
                type="search"
                autoComplete="off"
                spellCheck={false}
                aria-label="Search friends"
            />

            {/* Filtered friend list */}
            <div
                className="flex flex-col gap-0.5 max-h-48 overflow-y-auto"
                role="group"
                aria-label="Select members"
                style={{ overscrollBehavior: "contain" }}
            >
                {filtered.map((friend) => {
                    const isSelected = selectedIds.includes(friend.id)
                    const checkboxId = `friend-pick-${friend.id}`

                    return (
                        <label
                            key={friend.id}
                            htmlFor={checkboxId}
                            className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer",
                                "transition-colors select-none",
                                // touch-action: manipulation prevents double-tap zoom on mobile
                                "touch-action-manipulation",
                                isSelected
                                    ? "bg-[oklch(from_var(--primary)_l_c_h/0.15)] border border-[oklch(from_var(--primary)_l_c_h/0.3)]"
                                    : "bg-[oklch(from_var(--card)_l_c_h/0.4)] border border-transparent",
                                !isSelected && "hover:bg-[oklch(from_var(--card)_l_c_h/0.6)]"
                            )}
                            style={{ touchAction: "manipulation" }}
                        >
                            {/* Hidden native checkbox — provides free keyboard + screen-reader support */}
                            <input
                                id={checkboxId}
                                type="checkbox"
                                className="sr-only"
                                checked={isSelected}
                                onChange={() => onToggle(friend.id)}
                                aria-label={friend.name}
                            />

                            <span className="text-sm truncate min-w-0 flex-1">{friend.name}</span>

                            {isSelected && (
                                <Check
                                    size={14}
                                    aria-hidden="true"
                                    className="shrink-0 ml-2"
                                    style={{ color: "var(--primary)" }}
                                />
                            )}
                        </label>
                    )
                })}

                {filtered.length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: "var(--muted-foreground)" }}>
                        {query ? "No results found" : emptyMessage}
                    </p>
                )}
            </div>
        </div>
    )
}
