/**
 * GroupCreateModal — modal dialog for creating a new group conversation.
 *
 * Flow:
 *   1. User enters a group name.
 *   2. User selects friends from the list (multi-select checkboxes).
 *   3. On submit: createGroupConversation mutation fires.
 *   4. On success: celebration particle burst (ornate mode), then calls onCreated.
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" + aria-labelledby
 *   - Overlay click closes the modal
 *   - Friend rows use role="checkbox" + aria-checked + tabIndex + onKeyDown
 *   - Celebration particles are aria-hidden
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check } from "lucide-react"
import { useState } from "react"

import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { CREATE_GROUP_MUTATION } from "@/graphql/options/conversations"
import { friendsListQueryOptions } from "@/graphql/options/friends"
import { graphqlFetch } from "@/lib/graphql-client"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/conversations"

interface GroupCreateModalProps {
    onClose: () => void
    onCreated: (conversationId: string) => void
}

export function GroupCreateModal({ onClose, onCreated }: GroupCreateModalProps) {
    const { isMinimal } = useAestheticMode()
    const queryClient = useQueryClient()

    const [groupName, setGroupName] = useState("")
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [showCelebration, setShowCelebration] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    const { data: friends = [] } = useQuery(friendsListQueryOptions)

    const createMutation = useMutation({
        mutationFn: ({ name, userIds }: { name: string; userIds: string[] }) =>
            graphqlFetch<{ createGroupConversation: Conversation }>(CREATE_GROUP_MUTATION, {
                name,
                userIds,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            setCreateError(null)
        },
        onError: () => {
            setCreateError("Failed to create group. Please try again.")
        },
    })

    function toggleUser(userId: string) {
        setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        )
    }

    async function handleCreate() {
        const result = await createMutation.mutateAsync({
            name: groupName.trim(),
            userIds: selectedUserIds,
        })
        setShowCelebration(true)
        setTimeout(() => {
            onCreated(result.createGroupConversation.id)
        }, 800)
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-create-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "oklch(0 0 0 / 0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="glass-card glass-card--modal w-full max-w-md relative"
                style={{ overscrollBehavior: "contain" }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="group-create-title" className="text-lg font-semibold mb-4">
                    Create Group
                </h2>

                {/* Group name input */}
                <div className="mb-4">
                    <label htmlFor="group-name" className="text-sm font-medium mb-1 block">
                        Group Name
                    </label>
                    <input
                        id="group-name"
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="glass-input w-full"
                        placeholder="Group name\u2026"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={50}
                    />
                </div>

                {/* Friend picker */}
                <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Select Members</p>
                    <div
                        className="flex flex-col gap-1 max-h-48 overflow-y-auto"
                        style={{ overscrollBehavior: "contain" }}
                    >
                        {friends.map((friend) => {
                            const isSelected = selectedUserIds.includes(friend.id)
                            return (
                                <div
                                    key={friend.id}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer",
                                        "transition-colors",
                                        isSelected
                                            ? "bg-[oklch(from_var(--primary)_l_c_h/0.15)] border border-[oklch(from_var(--primary)_l_c_h/0.3)]"
                                            : "bg-[oklch(from_var(--card)_l_c_h/0.4)] border border-transparent hover:bg-[oklch(from_var(--card)_l_c_h/0.6)]"
                                    )}
                                    onClick={() => toggleUser(friend.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            toggleUser(friend.id)
                                        }
                                    }}
                                    role="checkbox"
                                    aria-checked={isSelected}
                                    tabIndex={0}
                                    aria-label={friend.name}
                                >
                                    <span className="text-sm">{friend.name}</span>
                                    {isSelected && (
                                        <Check
                                            size={14}
                                            aria-hidden="true"
                                            style={{ color: "var(--primary)" }}
                                        />
                                    )}
                                </div>
                            )
                        })}
                        {friends.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No friends yet
                            </p>
                        )}
                    </div>
                </div>

                {/* Celebration particle burst (ornate mode only) */}
                {showCelebration && !isMinimal && (
                    <div
                        className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]"
                        aria-hidden="true"
                    >
                        {Array.from({ length: 8 }).map((_, i) => (
                            <span
                                key={i}
                                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                                style={
                                    {
                                        "--particle-angle": `${i * 45}deg`,
                                        background: `oklch(from var(--ritual-celebrate) l c h)`,
                                        transform: `rotate(var(--particle-angle)) translateY(-3rem)`,
                                        opacity: 0,
                                        animation: `ping-ripple 0.8s var(--ease-out, ease-out) ${i * 0.05}s forwards`,
                                    } as React.CSSProperties
                                }
                            />
                        ))}
                    </div>
                )}

                {/* Error message */}
                {createError && (
                    <p role="alert" className="text-xs mb-2" style={{ color: "var(--destructive)" }}>
                        {createError}
                    </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 justify-end mt-4">
                    <button type="button" className="glass-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="glass-button"
                        style={
                            !groupName.trim() ||
                            selectedUserIds.length === 0 ||
                            createMutation.isPending
                                ? { opacity: 0.5, cursor: "not-allowed" }
                                : {
                                      background: "oklch(from var(--primary) l c h / 0.2)",
                                      borderColor: "oklch(from var(--primary) l c h / 0.4)",
                                  }
                        }
                        disabled={
                            !groupName.trim() ||
                            selectedUserIds.length === 0 ||
                            createMutation.isPending
                        }
                        onClick={() => void handleCreate()}
                    >
                        {createMutation.isPending ? "Creating\u2026" : "Create Group"}
                    </button>
                </div>
            </div>
        </div>
    )
}
