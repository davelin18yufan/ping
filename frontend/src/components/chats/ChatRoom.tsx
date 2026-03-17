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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Info, Users } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"

import {
    MARK_READ_MUTATION,
    SEND_MESSAGE_MUTATION,
    conversationQueryOptions,
    conversationsQueryOptions,
} from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import { cn } from "@/lib/utils"
import { uiStore } from "@/stores/uiStore"
import type { Conversation, Message } from "@/types/conversations"

import { DirectInfoPanel } from "./DirectInfoPanel"
import { GroupInfoPanel } from "./GroupInfoPanel"
import { MessageInput } from "./MessageInput"
import { ContactAvatar } from "./ContactAvatar"
import { MessageList, type SonicPingEvent } from "./MessageList"
import { SonicPingButton } from "./SonicPingButton"

interface ChatRoomProps {
    conversationId: string
    currentUserId: string
}

export function ChatRoom({ conversationId, currentUserId }: ChatRoomProps) {
    const queryClient = useQueryClient()

    const [showInfo, setShowInfo] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)
    const [sonicPingEvents, setSonicPingEvents] = useState<SonicPingEvent[]>([])

    const { data: conversation } = useQuery(conversationQueryOptions(conversationId))

    // Register this conversation as the currently-active one so
    // Socket handlers suppress unread badge increments while we are viewing it.
    useEffect(() => {
        uiStore.setState((s) => ({ ...s, activeConversationId: conversationId }))
        return () => {
            uiStore.setState((s) => ({ ...s, activeConversationId: null }))
        }
    }, [conversationId])

    // Mark messages as read whenever the active conversation changes.
    const markReadMutation = useMutation({
        mutationFn: () =>
            graphqlFetch<{ markMessagesAsRead: boolean }>(MARK_READ_MUTATION, {
                conversationId,
            }),
        onSuccess: () => {
            // Zero out unread badge for this conversation in the list cache.
            queryClient.setQueryData(
                conversationsQueryOptions.queryKey,
                (old: Conversation[] | undefined) =>
                    old?.map((c) =>
                        c.id === conversationId ? { ...c, unreadCount: 0 } : c
                    )
            )
        },
    })

    useEffect(() => {
        markReadMutation.mutate()
        // Only re-fire when the conversation changes; markReadMutation reference
        // is stable across renders so it is safe to omit from deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId])

    // Reset sonic ping events when the active conversation changes
    useEffect(() => {
        setSonicPingEvents([])
    }, [conversationId])

    // Send message mutation (mutationKey powers useMutationState in MessageList)
    const sendMutation = useMutation({
        mutationKey: ["sendMessage", conversationId],
        mutationFn: (content: string) =>
            graphqlFetch<{ sendMessage: Message }>(SEND_MESSAGE_MUTATION, {
                conversationId,
                content,
            }),
        onSuccess: () => {
            // Invalidate messages so the confirmed message from the server
            // replaces the optimistic bubble — guards against server-side
            // socket events not echoing back to the sender.
            void queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            })
            // Also refresh the conversation list to update lastMessage preview.
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            setSendError(null)
        },
        onError: () => {
            setSendError("Failed to send message. Please try again.")
        },
    })

    const isOneToOne = conversation?.type === "ONE_TO_ONE"

    const otherParticipant = isOneToOne
        ? conversation?.participants.find((p) => p.user.id !== currentUserId)
        : null

    const handlePingSent = () => {
        setSonicPingEvents((prev) => [
            ...prev,
            {
                id: `sonic-ping-${Date.now()}`,
                timestamp: new Date().toISOString(),
                recipientName: otherParticipant?.user.name ?? "them",
            },
        ])
    }

    const displayName = isOneToOne
        ? (otherParticipant?.user.name ?? "Chat")
        : (conversation?.name ?? "Group")

    const conversationType = conversation?.type ?? "ONE_TO_ONE"

    return (
        <div
            className="chat-room-outer relative flex flex-col"
            style={{ height: "100%" }}
        >
            {/* Header */}
            <div
                className={cn(
                    "chat-room__header glass-card flex items-center gap-3 px-4 py-3 shrink-0",
                    "rounded-none border-x-0 border-t-0"
                )}
            >
                <Link
                    to="/chats"
                    aria-label="Back to conversations"
                    className="glass-button glass-button--icon"
                    viewTransition={false}
                >
                    <ArrowLeft size={18} aria-hidden="true" />
                </Link>

                {/* Avatar — shown for both 1:1 and group conversations */}
                {isOneToOne && otherParticipant ? (
                    <ContactAvatar
                        userId={otherParticipant.user.id}
                        name={otherParticipant.user.name ?? displayName}
                        image={otherParticipant.user.image ?? null}
                        isOnline={otherParticipant.user.isOnline}
                        isFriend={otherParticipant.isFriend}
                        size="sm"
                    />
                ) : !isOneToOne ? (
                    <ContactAvatar
                        userId={conversationId}
                        name={displayName}
                        image={null}
                        isOnline={false}
                        isFriend={true}
                        size="sm"
                        isGroup={true}
                    />
                ) : null}

                <div className="flex-1 flex flex-col min-w-0">
                    <h2 className="font-semibold text-sm truncate min-w-0">{displayName}</h2>
                    {isOneToOne && otherParticipant && (
                        <span className="text-xs text-muted-foreground">
                            {otherParticipant.user.isOnline ? "Online" : "Offline"}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Sonic Ping — only for 1:1 conversations */}
                    {isOneToOne && <SonicPingButton conversationId={conversationId} onPingSent={handlePingSent} />}
                    {conversation && (
                        <button
                            type="button"
                            onClick={() => setShowInfo(true)}
                            aria-label={isOneToOne ? "Contact info" : "Group info"}
                            className="glass-button glass-button--icon"
                        >
                            {isOneToOne ? (
                                <Info size={18} aria-hidden="true" />
                            ) : (
                                <Users size={18} aria-hidden="true" />
                            )}
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

            {/* Message list — keyed by conversationId so the list remounts (scroll
                  resets to bottom) when switching conversations, and fades in. */}
            <motion.div
                key={conversationId}
                className="flex-1 min-h-0 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
            >
                <MessageList
                    conversationId={conversationId}
                    currentUserId={currentUserId}
                    conversationType={conversationType}
                    sonicPingEvents={sonicPingEvents}
                />
            </motion.div>

            {/* Message input */}
            <div className="shrink-0">
                <MessageInput
                    conversationId={conversationId}
                    onSend={(content) => sendMutation.mutate(content)}
                    disabled={sendMutation.isPending}
                />
            </div>

            {/* Click-outside backdrop — covers the chat area behind the panel.
                  z-10 puts it below the panel (z-20) but above the message list. */}
            {showInfo && (
                <div
                    className="absolute inset-0 z-10"
                    onClick={() => setShowInfo(false)}
                    aria-hidden="true"
                />
            )}

            {/* Info slide-in panel — GROUP: member management, ONE_TO_ONE: contact info */}
            <AnimatePresence>
                {showInfo && conversation && isOneToOne && otherParticipant && (
                    <DirectInfoPanel
                        key="direct-info-panel"
                        participant={otherParticipant}
                        conversationId={conversationId}
                        onClose={() => setShowInfo(false)}
                    />
                )}
                {showInfo && conversation && !isOneToOne && (
                    <GroupInfoPanel
                        key="group-info-panel"
                        conversation={conversation as Conversation}
                        currentUserId={currentUserId}
                        onClose={() => setShowInfo(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
