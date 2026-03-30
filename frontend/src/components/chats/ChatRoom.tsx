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
 *
 * Incoming rituals (including Sonic Ping):
 *   Listens for the "ritual:incoming" custom DOM event dispatched by useSocket.
 *   SONIC_PING is routed through the same ritual overlay path as all other rituals.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useStore } from "@tanstack/react-store"
import { ArrowLeft, Info, Trash2, Users } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useState } from "react"

import {
    MARK_READ_MUTATION,
    REPLY_TO_MESSAGE_MUTATION,
    SEND_MESSAGE_MUTATION,
    conversationQueryOptions,
    conversationsQueryOptions,
} from "@/graphql/options/conversations"
import { graphqlFetch } from "@/lib/graphql-client"
import { resolveRitualLabels } from "@/lib/ritualLabels"
import { cn } from "@/lib/utils"
import { chatStore, exitMultiSelect, setReplyToMessage } from "@/stores/chatStore"
import { uiStore } from "@/stores/uiStore"
import type { Conversation, Message } from "@/types/conversations"

import { ChatRoomOverlays } from "./ChatRoomOverlays"
import { ContactAvatar } from "./ContactAvatar"
import { DirectInfoPanel } from "./DirectInfoPanel"
import { GroupInfoPanel } from "./GroupInfoPanel"
import { MessageInput } from "./MessageInput"
import { MessageList } from "./MessageList"
import { PinnedMessageBanner } from "./PinnedMessageBanner"
import { RitualPickerButton } from "./RitualPickerButton"
import { SonicPingButton } from "./SonicPingButton"

interface ChatRoomProps {
    conversationId: string
    currentUserId: string
}

export function ChatRoom({ conversationId, currentUserId }: ChatRoomProps) {
    const queryClient = useQueryClient()

    const [showInfo, setShowInfo] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)

    const isMultiSelectMode = useStore(chatStore, (s) => s.isMultiSelectMode)
    const selectedMessageIds = useStore(chatStore, (s) => s.selectedMessageIds)
    const replyToMessage = useStore(chatStore, (s) => s.replyToMessage)

    const { data: conversation } = useQuery(conversationQueryOptions(conversationId))

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
                    old?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
            )
        },
    })

    // On entering a conversation:
    //  1. Register as active so socket handlers suppress unread increments.
    //  2. Mark existing messages as read immediately.
    //  3. Exit multi-select mode (clear selected messages from previous conversation).
    // All actions share the same [conversationId] trigger — merging into one
    // effect avoids two separate effect runs on every conversation switch.
    useEffect(() => {
        uiStore.setState((s) => ({ ...s, activeConversationId: conversationId }))
        markReadMutation.mutate()
        exitMultiSelect()
        setReplyToMessage(null)
        return () => {
            uiStore.setState((s) => ({ ...s, activeConversationId: null }))
        }
        // markReadMutation ref is stable across renders; only conversationId drives re-runs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId])

    // Subscribe to the active conversation's unreadCount from the list cache.
    // When a conversations refetch (e.g. triggered by sendMutation.onSuccess)
    // overwrites the socket-patched 0 with the DB's stale count, this effect
    // fires markRead again to keep the DB and cache in sync while we are here.
    const { data: liveUnreadCount } = useQuery({
        ...conversationsQueryOptions,
        select: (convs) => convs.find((c) => c.id === conversationId)?.unreadCount ?? 0,
    })

    useEffect(() => {
        if ((liveUnreadCount ?? 0) > 0) {
            markReadMutation.mutate()
        }
        // markReadMutation ref is stable; liveUnreadCount drives re-runs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveUnreadCount])

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

    // Reply-to mutation: fires when chatActionsStore.replyToMessage is set.
    const replyMutation = useMutation({
        mutationKey: ["sendMessage", conversationId],
        mutationFn: ({
            content,
            replyToMessageId,
        }: {
            content: string
            replyToMessageId: string
        }) =>
            graphqlFetch<{ replyToMessage: Message }>(REPLY_TO_MESSAGE_MUTATION, {
                conversationId,
                content,
                replyToMessageId,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
            void queryClient.invalidateQueries({ queryKey: ["conversations"] })
            setReplyToMessage(null)
            setSendError(null)
        },
        onError: () => {
            setSendError("Failed to send reply. Please try again.")
        },
    })

    function handleSend(content: string) {
        if (replyToMessage) {
            replyMutation.mutate({ content, replyToMessageId: replyToMessage.id })
        } else {
            sendMutation.mutate(content)
        }
    }

    const isOneToOne = conversation?.type === "ONE_TO_ONE"
    const isGroup = conversation?.type === "GROUP"
    const resolvedLabels = useMemo(
        () => resolveRitualLabels(conversation?.ritualLabels ?? [], conversation?.type === "GROUP"),
        [conversation]
    )

    const otherParticipant = isOneToOne
        ? conversation?.participants.find((p) => p.user.id !== currentUserId)
        : null

    const displayName = isOneToOne
        ? (otherParticipant?.user.name ?? "Chat")
        : (conversation?.name ?? "Group")

    const conversationType = conversation?.type ?? "ONE_TO_ONE"

    return (
        <div className="chat-room-outer relative flex flex-col" style={{ height: "100%" }}>
            {/* Header */}
            <div
                className={cn(
                    "chat-room__header glass-card flex items-center gap-3 px-4 py-3 shrink-0",
                    "rounded-none border-x-0 border-t-0 z-20"
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
                    {isOneToOne && <SonicPingButton conversationId={conversationId} />}
                    {/* Ritual picker — 1:1 always; group only when allowRituals is enabled */}
                    {(isOneToOne || (isGroup && conversation?.allowRituals)) && (
                        <RitualPickerButton conversationId={conversationId} />
                    )}
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

            {/* Message list area — pinned banner overlays from top without pushing content down.
                  ChatRoomOverlays lives here so its inset:0 only covers the message area,
                  not the header or input bar. */}
            <div className="relative flex-1 min-h-0 flex flex-col">
                {/* Banner is absolute so it overlays messages instead of displacing them */}
                <div className="absolute top-0 left-0 right-0 z-10">
                    <PinnedMessageBanner conversationId={conversationId} />
                </div>

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
                        ritualLabels={resolvedLabels}
                    />
                </motion.div>

                {/* Ritual overlays — scoped to the message area so they don't cover
                      the header or input bar. */}
                <ChatRoomOverlays />
            </div>

            {/* Multi-select toolbar — shown when isMultiSelectMode is true */}
            {isMultiSelectMode && (
                <div className="multi-select-toolbar shrink-0">
                    <span className="multi-select-toolbar__count">
                        已選 {selectedMessageIds.size} 條
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Delete selected — only if all selected are own messages (simplified: show always) */}
                        <button
                            type="button"
                            className="glass-button text-sm"
                            style={{ color: "var(--destructive)" }}
                            aria-label="Delete selected messages"
                        >
                            <Trash2 size={14} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="glass-button text-sm"
                            onClick={exitMultiSelect}
                            aria-label="Cancel multi-select"
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}

            {/* Message input */}
            <div className="shrink-0">
                <MessageInput
                    conversationId={conversationId}
                    onSend={handleSend}
                    disabled={sendMutation.isPending || replyMutation.isPending}
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
