/**
 * FriendItem — single compact row in the friends list sidebar.
 *
 * Mirrors ConversationItem's structure:
 *   [Avatar + online dot] [Name + email] [MessageCircle affordance]
 *
 * The entire row is a <button> that opens a DM conversation.
 * Online status is read from uiStore.presenceMap (Redis-backed via Socket.io).
 * The MessageCircle icon is a decorative affordance (aria-hidden) that
 * appears on hover via CSS — no nested button needed.
 */

import { useStore } from "@tanstack/react-store"
import { Facehash } from "facehash"
import { MessageCircle } from "lucide-react"
import { memo } from "react"

import { uiStore } from "@/stores/uiStore"
import type { User } from "@/types/friends"

interface FriendItemProps {
    friend: User
    onMessage: (userId: string) => void
    /** Show loading state while DM is being created for this user */
    isLoading?: boolean
}

function FriendItemInner({ friend, onMessage, isLoading = false }: FriendItemProps) {
    // Presence from Redis, surfaced via Socket.io into uiStore.presenceMap
    const isOnline = useStore(uiStore, (s) => s.presenceMap[friend.id] ?? false)

    return (
        <button
            type="button"
            className="friend-item"
            onClick={() => onMessage(friend.id)}
            aria-label={`Message ${friend.name}${isOnline ? ", online" : ""}`}
            disabled={isLoading}
        >
            {/* Avatar with online dot overlay */}
            <div className="friend-item__avatar" aria-hidden="true">
                <div className="friend-item__avatar-inner">
                    {friend.image ? (
                        <img
                            src={friend.image}
                            alt=""
                            width={36}
                            height={36}
                            className="friend-item__avatar-img"
                        />
                    ) : (
                        <Facehash
                            name={friend.id}
                            size={36}
                            showInitial={true}
                            interactive={false}
                            enableBlink={false}
                            intensity3d="subtle"
                            variant="gradient"
                        />
                    )}
                </div>
                <span
                    className={`friend-item__status-dot${isOnline ? " friend-item__status-dot--online" : ""}`}
                    aria-hidden="true"
                />
            </div>

            {/* Content */}
            <div className="friend-item__content">
                <span className="friend-item__name">{friend.name}</span>
                <span className="friend-item__sub">{friend.email}</span>
            </div>

            {/* Message affordance — decorative, revealed on parent hover via CSS */}
            <span className="friend-item__action" aria-hidden="true">
                <MessageCircle size={14} />
            </span>
        </button>
    )
}

export const FriendItem = memo(FriendItemInner)
