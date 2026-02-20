/**
 * PendingRequestCard — incoming friend request with accept / reject actions
 *
 * Shows sender info + accept (green) + reject (destructive) buttons.
 * On success: scale(0.96) opacity(0) exit animation over 250ms.
 * Loading: replaces both buttons with SoundWaveLoader.
 */

import { Check, X } from "lucide-react"
import { useState } from "react"

import { SoundWaveLoader } from "@/components/shared/SoundWaveLoader"
import { useFriendActions } from "@/hooks/useFriendActions"
import "@/styles/components/friends.css"

interface PendingRequestSender {
    id: string
    name: string
    image?: string | null
}

interface PendingRequestCardProps {
    request: {
        id: string
        sender: PendingRequestSender
    }
    onAccepted?: () => void
    onRejected?: () => void
}

export function PendingRequestCard({ request, onAccepted, onRejected }: PendingRequestCardProps) {
    const [isExiting, setIsExiting] = useState(false)
    const { acceptRequest, rejectRequest, loading } = useFriendActions()

    const handleAccept = async () => {
        try {
            await acceptRequest(request.id)
            setIsExiting(true)
            setTimeout(() => onAccepted?.(), 250)
        } catch {
            // error tracked in hook
        }
    }

    const handleReject = async () => {
        try {
            await rejectRequest(request.id)
            setIsExiting(true)
            setTimeout(() => onRejected?.(), 250)
        } catch {
            // error tracked in hook
        }
    }

    return (
        <div
            className={`glass-card glass-card--compact pending-request-card${isExiting ? " pending-request-card--exiting" : ""}`}
            data-testid={`pending-request-card-${request.id}`}
        >
            {/* Avatar */}
            <div className="pending-request-card__avatar">
                {request.sender.image ? (
                    <img
                        src={request.sender.image}
                        alt={request.sender.name}
                        className="pending-request-card__avatar-img"
                    />
                ) : (
                    <div
                        className="pending-request-card__avatar-fallback"
                        aria-hidden="true"
                    >
                        {(request.sender.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="pending-request-card__info">
                <span className="pending-request-card__name">{request.sender.name}</span>
                <span className="pending-request-card__subtitle">sent you a friend request</span>
            </div>

            {/* Actions */}
            <div className="pending-request-card__actions">
                {loading ? (
                    <SoundWaveLoader size="sm" />
                ) : (
                    <>
                        <button
                            className="glass-button glass-button--sm pending-request-card__btn pending-request-card__btn--accept"
                            onClick={handleAccept}
                            disabled={loading}
                            aria-label="Accept"
                        >
                            <Check size={14} aria-hidden="true" />
                            <span>Accept</span>
                        </button>
                        <button
                            className="glass-button glass-button--sm glass-button--destructive pending-request-card__btn pending-request-card__btn--reject"
                            onClick={handleReject}
                            disabled={loading}
                            aria-label="Reject"
                        >
                            <X size={14} aria-hidden="true" />
                            <span>Reject</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
