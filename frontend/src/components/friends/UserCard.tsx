/**
 * UserCard — displays a single user with friendship action button
 *
 * Four states:
 * - NONE          : "Add Friend" button (primary tint)
 * - PENDING_SENT  : "Pending" button (amber tint, disabled); CSS :hover shows "Cancel Request"
 * - PENDING_RECEIVED: no action button (shown in PendingRequestCard)
 * - ACCEPTED      : "Friends" label with check icon (no button)
 *
 * When existingRequestId is provided on mount, initial state is PENDING_SENT
 * but the cancel button is rendered as an accessible enabled sibling.
 */

import { Clock, UserCheck, UserPlus, X } from "lucide-react"
import { motion } from "motion/react"
import { useRef, useState } from "react"
import { createPortal } from "react-dom"

import { UserStatusAvatar } from "@/components/shared/UserStatusAvatar"
import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { useFriendActions } from "@/hooks/useFriendActions"
import "@/styles/components/friends.css"

interface UserCardUser {
    id: string
    name: string
    email: string
    image?: string | null
}

interface UserCardProps {
    user: UserCardUser
    friendshipStatus?: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED"
    existingRequestId?: string
    onRequestSent?: () => void
    onRequestCancelled?: () => void
}

export function UserCard({
    user,
    friendshipStatus: initialStatus = "NONE",
    existingRequestId: initialRequestId,
    onRequestSent,
    onRequestCancelled,
}: UserCardProps) {
    const initialComputedStatus = initialRequestId ? "PENDING_SENT" : initialStatus
    const [status, setStatus] = useState<"NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED">(
        initialComputedStatus
    )
    const [requestId, setRequestId] = useState<string | undefined>(initialRequestId)
    const { sendRequest, cancelRequest, loading } = useFriendActions()
    const { isMinimal } = useAestheticMode()

    // Signal Broadcast portal state
    const addButtonRef = useRef<HTMLButtonElement>(null)
    const [signalPos, setSignalPos] = useState<{ x: number; y: number } | null>(null)

    const handleAddFriend = async () => {
        // Capture button position for signal particle origin — skipped in minimal mode
        if (!isMinimal) {
            const rect = addButtonRef.current?.getBoundingClientRect()
            if (rect) {
                setSignalPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
            }
        }
        try {
            const request = await sendRequest(user.id)
            setRequestId(request.id)
            setStatus("PENDING_SENT")
            onRequestSent?.()
        } catch {
            // error is tracked in hook
        }
    }

    const handleCancelRequest = async () => {
        if (!requestId) return
        try {
            await cancelRequest(requestId)
            setStatus("NONE")
            setRequestId(undefined)
            onRequestCancelled?.()
        } catch {
            // error is tracked in hook
        }
    }

    return (
        <>
            <div
                className="glass-card glass-card--compact user-card"
                data-testid={`user-card-${user.id}`}
            >
                {/* Avatar — image or UserStatusAvatar Facehash fallback */}
                {user.image ? (
                    <div className="user-card__avatar">
                        <img src={user.image} alt={user.name} className="user-card__avatar-img" />
                    </div>
                ) : (
                    <UserStatusAvatar
                        userId={user.id}
                        userName={user.name}
                        size={32}
                        showWaveRings={false}
                    />
                )}

                {/* Info */}
                <div className="user-card__info">
                    <span className="user-card__name">{user.name}</span>
                    <span className="user-card__email">{user.email}</span>
                </div>

                {/* Action */}
                <div className="user-card__action">
                    {status === "NONE" && (
                        <button
                            ref={addButtonRef}
                            className="glass-button glass-button--sm user-card__btn user-card__btn--add"
                            onClick={handleAddFriend}
                            disabled={loading}
                            aria-label="Add friend"
                        >
                            <UserPlus size={14} aria-hidden="true" />
                            <span>Add Friend</span>
                        </button>
                    )}

                    {status === "PENDING_SENT" && (
                        <div className="user-card__pending-group">
                            {/* Pending indicator — visually disabled */}
                            <button
                                className="glass-button glass-button--sm user-card__btn user-card__btn--pending"
                                disabled={true}
                                aria-label="Pending"
                                tabIndex={-1}
                            >
                                <Clock size={14} aria-hidden="true" />
                                <span>Pending</span>
                            </button>

                            {/* Cancel button — accessible and enabled */}
                            <button
                                className="glass-button glass-button--sm glass-button--destructive user-card__btn user-card__btn--cancel"
                                onClick={handleCancelRequest}
                                disabled={loading}
                                aria-label="Cancel request"
                            >
                                <X size={14} aria-hidden="true" />
                                <span>Cancel Request</span>
                            </button>
                        </div>
                    )}

                    {status === "ACCEPTED" && (
                        <div className="user-card__friends-badge" aria-label="Friends">
                            <UserCheck size={14} aria-hidden="true" />
                            <span>Friends</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Signal Broadcast portal — decorative particle, aria-hidden */}
            {signalPos &&
                createPortal(
                    <motion.div
                        aria-hidden="true"
                        className="signal-particle"
                        style={{
                            position: "fixed",
                            left: signalPos.x,
                            top: signalPos.y,
                        }}
                        initial={{ y: 0, opacity: 1, scale: 1 }}
                        animate={{
                            y: -(signalPos.y + 100),
                            opacity: 0,
                            scale: 0.3,
                        }}
                        transition={{ duration: 0.65, ease: [0.7, 0, 0.84, 0] }}
                        onAnimationComplete={() => setSignalPos(null)}
                    />,
                    document.body
                )}
        </>
    )
}
