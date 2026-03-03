/**
 * ChatRoom — three-zone layout for a single conversation.
 *
 * Zones:
 *   1. Sticky header (back button, display name, online status, group info)
 *   2. Scrollable MessageList (flex-1)
 *   3. Fixed MessageInput (flex-shrink-0)
 *
 * On mount:   sets uiStore.activeConversationId so Socket handlers skip unread counting.
 * On unmount: clears activeConversationId.
 *
 * GroupInfoPanel is lazy-rendered via local state and AnimatePresence exit.
 */

import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Users } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { useEffect, useState } from "react"

import { SEND_MESSAGE_MUTATION, conversationQueryOptions } from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import { cn } from "@/lib/utils"
import { uiStore } from "@/stores/uiStore"
import type { Conversation, Message } from "@/types/conversations"

import { GroupInfoPanel } from "./GroupInfoPanel"
import { MessageInput } from "./MessageInput"
import { MessageList } from "./MessageList"

// ============================================================================
// Types
// ============================================================================

interface ChatRoomProps {
    conversationId: string
    currentUserId: string
}

// ============================================================================
// Component
// ============================================================================

export function ChatRoom({ conversationId, currentUserId }: ChatRoomProps) {
    const navigate = useNavigate()

    const [showGroupInfo, setShowGroupInfo] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)

    const { data: conversation } = useQuery(conversationQueryOptions(conversationId))

    // Register this conversation as the currently-active one so
    // Socket handlers suppress unread badge increments while we are viewing it.
    useEffect(() => {
        uiStore.setState((s) => ({ ...s, activeConversationId: conversationId }))
        return () => {
            uiStore.setState((s) => ({ ...s, activeConversationId: null }))
        }
    }, [conversationId])

    // -------------------------------------------------------------------------
    // Send message mutation (mutationKey powers useMutationState in MessageList)
    // -------------------------------------------------------------------------
    const sendMutation = useMutation({
        mutationKey: ["sendMessage", conversationId],
        mutationFn: (content: string) =>
            graphqlFetch<{ sendMessage: Message }>(SEND_MESSAGE_MUTATION, {
                conversationId,
                content,
            }),
        onSuccess: () => {
            setSendError(null)
        },
        onError: () => {
            setSendError("訊息傳送失敗，請稍後再試。")
        },
    })

    // -------------------------------------------------------------------------
    // Display name helpers
    // -------------------------------------------------------------------------
    const isOneToOne = conversation?.type === "ONE_TO_ONE"

    const otherParticipant = isOneToOne
        ? conversation?.participants.find((p) => p.user.id !== currentUserId)
        : null

    const displayName = isOneToOne
        ? (otherParticipant?.user.name ?? "對話")
        : (conversation?.name ?? "群組")

    const conversationType = conversation?.type ?? "ONE_TO_ONE"

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
            {/* Header */}
            <div
                className={cn(
                    "glass-card flex items-center gap-3 px-4 py-3 flex-shrink-0",
                    "rounded-none border-x-0 border-t-0"
                )}
            >
                <button
                    type="button"
                    onClick={() => void navigate({ to: "/chats" })}
                    aria-label="Back to conversations"
                    className="glass-button glass-button--icon"
                >
                    <ArrowLeft size={18} aria-hidden="true" />
                </button>

                <div className="flex-1 flex flex-col min-w-0">
                    <h2 className="font-semibold text-sm truncate min-w-0">{displayName}</h2>
                    {isOneToOne && otherParticipant && (
                        <span className="text-xs text-muted-foreground">
                            {otherParticipant.user.isOnline ? "線上" : "離線"}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {conversation?.type === "GROUP" && (
                        <button
                            type="button"
                            onClick={() => setShowGroupInfo(true)}
                            aria-label="Group info"
                            className="glass-button glass-button--icon"
                        >
                            <Users size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {/* Error toast (send failure) */}
            {sendError && (
                <div
                    role="alert"
                    className="mx-4 mt-2 px-3 py-2 rounded-lg text-xs"
                    style={{
                        background: "oklch(from var(--destructive) l c h / 0.12)",
                        color: "var(--destructive-foreground, var(--foreground))",
                        border: "1px solid oklch(from var(--destructive) l c h / 0.3)",
                    }}
                >
                    {sendError}
                </div>
            )}

            {/* Message list */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <MessageList
                    conversationId={conversationId}
                    currentUserId={currentUserId}
                    conversationType={conversationType}
                />
            </div>

            {/* Message input */}
            <div className="flex-shrink-0">
                <MessageInput
                    conversationId={conversationId}
                    onSend={(content) => sendMutation.mutate(content)}
                    disabled={sendMutation.isPending}
                />
            </div>

            {/* Group info slide-in panel */}
            <AnimatePresence>
                {showGroupInfo && conversation && (
                    <GroupInfoPanel
                        key="group-info-panel"
                        conversation={conversation as Conversation}
                        currentUserId={currentUserId}
                        onClose={() => setShowGroupInfo(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
