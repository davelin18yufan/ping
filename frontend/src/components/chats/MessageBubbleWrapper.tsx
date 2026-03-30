/**
 * MessageBubbleWrapper — orchestrates all message bubble interactions.
 *
 * Hover: shows action icon cluster (opacity 0.15 → 1)
 * Right-click: opens MessageContextMenu at cursor
 * Reply: sets chatActionsStore.replyToMessage
 * Copy: navigator.clipboard.writeText (silent fail on rejection)
 * Forward: opens ForwardPickerModal
 * Select: toggles message in chatActionsStore.selectedMessageIds
 * Pin/Unpin: fires PIN_MESSAGE_MUTATION or UNPIN_MESSAGE_MUTATION
 * Delete: opens DeleteMessageModal
 *
 * In multi-select mode, a regular click toggles selection instead of
 * opening the context menu.
 *
 * Follows vercel-react-best-practices:
 *   - memo on the component
 *   - useCallback for all handlers
 *   - no inline object props
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
// Hover cluster removed — actions available via right-click context menu only
import { memo, useCallback, useState } from "react"

import { PIN_MESSAGE_MUTATION, UNPIN_MESSAGE_MUTATION } from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import { dispatchScrollToMessage } from "@/lib/utils"
import { chatStore, setReplyToMessage, toggleMessageSelected } from "@/stores/chatStore"
import type { Message } from "@/types/conversations"

import { DeleteMessageModal } from "./DeleteMessageModal"
import { ForwardPickerModal } from "./ForwardPickerModal"
import { MessageBubble } from "./MessageBubble"
import { MessageContextMenu } from "./MessageContextMenu"

interface PinResult {
    id: string
    pinnedAt: string | null
}

interface MessageBubbleWrapperProps {
    message: Message
    isOwn: boolean
    isPending?: boolean
    shouldAnimate?: boolean
    conversationId: string
    currentUserId: string
}

export const MessageBubbleWrapper = memo(function MessageBubbleWrapper({
    message,
    isOwn,
    isPending = false,
    shouldAnimate = false,
    conversationId,
    currentUserId,
}: MessageBubbleWrapperProps) {
    const queryClient = useQueryClient()
    const isMultiSelectMode = useStore(chatStore, (s) => s.isMultiSelectMode)
    const selectedMessageIds = useStore(chatStore, (s) => s.selectedMessageIds)
    const isSelected = selectedMessageIds?.has(message.id) ?? false
    const isPinned = !!message.pinnedAt

    const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showForwardModal, setShowForwardModal] = useState(false)

    // ── Mutations ──────────────────────────────────────────────────────────────

    const pinMutation = useMutation({
        mutationFn: () =>
            graphqlFetch<{ pinMessage: PinResult }>(PIN_MESSAGE_MUTATION, {
                messageId: message.id,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] })
            void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
        },
    })

    const unpinMutation = useMutation({
        mutationFn: () =>
            graphqlFetch<{ unpinMessage: PinResult }>(UNPIN_MESSAGE_MUTATION, {
                messageId: message.id,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] })
            void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
        },
    })

    // ── Action handlers ────────────────────────────────────────────────────────

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
    }, [])

    const handleCloseContextMenu = useCallback(() => {
        setContextMenuPos(null)
    }, [])

    const handleScrollToMessage = useCallback((id: string) => {
        dispatchScrollToMessage(id)
    }, [])

    const handleAction = useCallback(
        (action: { type: string }) => {
            switch (action.type) {
                case "reply":
                    setReplyToMessage(message)
                    break
                case "copy":
                    navigator.clipboard.writeText(message.content ?? "").catch(() => {})
                    break
                case "forward":
                    setShowForwardModal(true)
                    break
                case "select":
                    toggleMessageSelected(message.id, conversationId)
                    break
                case "pin":
                    if (isPinned) {
                        unpinMutation.mutate()
                    } else {
                        pinMutation.mutate()
                    }
                    break
                case "delete":
                    setShowDeleteModal(true)
                    break
            }
        },
        [message, conversationId, isPinned, pinMutation, unpinMutation]
    )

    // In multi-select mode, clicking the wrapper toggles selection
    const handleClick = useCallback(() => {
        if (isMultiSelectMode) {
            toggleMessageSelected(message.id, conversationId)
        }
    }, [isMultiSelectMode, message.id, conversationId])

    return (
        <>
            <div
                data-testid={`message-bubble-wrapper-${message.id}`}
                className={[
                    "bubble-wrapper",
                    isOwn ? "bubble-wrapper--own" : "bubble-wrapper--received",
                ]
                    .filter(Boolean)
                    .join(" ")}
                onContextMenu={handleContextMenu}
                onClick={handleClick}
                aria-selected={isMultiSelectMode ? isSelected : undefined}
            >
                <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    isPending={isPending}
                    shouldAnimate={shouldAnimate}
                    currentUserId={currentUserId}
                    onScrollToOriginal={handleScrollToMessage}
                    isSelected={isSelected}
                />
            </div>

            {/* Context menu portal */}
            {contextMenuPos && (
                <MessageContextMenu
                    x={contextMenuPos.x}
                    y={contextMenuPos.y}
                    isPinned={isPinned}
                    onAction={(action) => {
                        handleAction(action)
                        handleCloseContextMenu()
                    }}
                    onClose={handleCloseContextMenu}
                />
            )}

            {/* Delete modal */}
            <DeleteMessageModal
                open={showDeleteModal}
                messageId={message.id}
                conversationId={conversationId}
                isOwn={isOwn}
                onClose={() => setShowDeleteModal(false)}
            />

            {/* Forward modal */}
            <ForwardPickerModal
                open={showForwardModal}
                messageId={message.id}
                currentConversationId={conversationId}
                currentUserId={currentUserId}
                onClose={() => setShowForwardModal(false)}
            />
        </>
    )
})
