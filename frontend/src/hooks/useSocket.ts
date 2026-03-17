/**
 * useSocket — module-level singleton Socket.io event handler registration
 *
 * Initializes the socket via createSocketClient() on first call, then attaches
 * all server→client event handlers exactly once across the entire app lifetime.
 *
 * Uses a WeakSet as a singleton guard so that reconnection (new socket instance)
 * correctly re-attaches handlers, while the same instance never gets duplicate
 * listeners.
 *
 * Handlers patch TanStack Query cache in-place for zero-latency UI updates:
 *  - message:new        → append to infinite pages + patch conversation list
 *  - presence:changed   → update uiStore.presenceMap
 *  - typing:update      → update uiStore.typingMap
 *  - participant:changed → invalidate affected conversation query
 *  - sync:required      → invalidate messages for each affected conversation
 */

import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { conversationsQueryOptions, messagesInfiniteOptions } from "@/graphql/options/conversations"
import { createSocketClient, getSocketClient } from "@/lib/socket"
import { uiStore } from "@/stores/uiStore"
import type { Conversation, Message, MessagePage } from "@/types/conversations"

// WeakSet guard: tracks which socket instances already have handlers attached.
// Using WeakSet (keyed on the socket object itself) means:
//   - Same instance → skip re-attachment (no duplicate listeners)
//   - New instance after reconnect → not in the set → handlers re-attached correctly
const attachedSockets = new WeakSet<object>()

export function useSocket() {
    const queryClient = useQueryClient()

    useEffect(() => {
        const socket = createSocketClient()

        // Guard: skip if this socket instance already has handlers
        if (attachedSockets.has(socket)) return
        attachedSockets.add(socket)

        // ------------------------------------------------------------------
        // message:new
        // Appends the incoming message to the correct infinite query page and
        // increments unreadCount on the conversation list unless the conversation
        // is currently active (already being viewed by the user).
        // ------------------------------------------------------------------
        socket.on(
            "message:new",
            ({ message, conversationId }: { message: Record<string, unknown>; conversationId: string }) => {
                // Backend sends senderId string; we need sender: ConversationUser
                const conversations = queryClient.getQueryData<Conversation[]>(conversationsQueryOptions.queryKey)
                const conv = conversations?.find((c) => c.id === conversationId)
                const senderId =
                    (message.sender as { id?: string } | undefined)?.id ??
                    (message.senderId as string | undefined) ??
                    ""
                const participant = conv?.participants.find((p) => p.user.id === senderId)

                const enrichedMessage: Message = {
                    id: message.id as string,
                    conversationId: message.conversationId as string,
                    content: message.content as string | null,
                    messageType: message.messageType as Message["messageType"],
                    imageUrl: message.imageUrl as string | null,
                    createdAt: message.createdAt as string,
                    status: message.status as Message["status"],
                    sender: participant?.user ?? {
                        id: senderId,
                        name: "Unknown",
                        email: "",
                        image: null,
                        isOnline: false,
                    },
                }

                // Append to infinite query page
                queryClient.setQueryData(
                    messagesInfiniteOptions(conversationId).queryKey,
                    (old: { pages: MessagePage[]; pageParams: unknown[] } | undefined) => {
                        if (!old) return old
                        const lastPage = old.pages[old.pages.length - 1]
                        return {
                            ...old,
                            pages: [
                                ...old.pages.slice(0, -1),
                                {
                                    ...lastPage,
                                    messages: [...lastPage.messages, enrichedMessage],
                                },
                            ],
                        }
                    }
                )

                // Patch conversation list
                queryClient.setQueryData(
                    conversationsQueryOptions.queryKey,
                    (old: Conversation[] | undefined) => {
                        if (!old) return old
                        return old.map((conv) => {
                            if (conv.id !== conversationId) return conv
                            const isActive = uiStore.state.activeConversationId === conversationId
                            return {
                                ...conv,
                                lastMessage: enrichedMessage,
                                unreadCount: isActive ? conv.unreadCount : conv.unreadCount + 1,
                            }
                        })
                    }
                )
            }
        )

        // ------------------------------------------------------------------
        // presence:changed
        // Updates the presenceMap in uiStore so any component subscribed to
        // that store can reactively show online/offline indicators.
        // ------------------------------------------------------------------
        socket.on(
            "presence:changed",
            ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
                uiStore.setState((s) => ({
                    ...s,
                    presenceMap: { ...s.presenceMap, [userId]: isOnline },
                }))
            }
        )

        // ------------------------------------------------------------------
        // typing:update
        // Maintains a list of display names currently typing per conversation.
        // Adds or removes the username from the typingMap slice for that
        // conversationId, deduplicating additions.
        // ------------------------------------------------------------------
        socket.on(
            "typing:update",
            ({
                conversationId,
                username,
                isTyping,
            }: {
                conversationId: string
                userId: string
                username: string
                isTyping: boolean
            }) => {
                uiStore.setState((s) => {
                    const current = s.typingMap[conversationId] ?? []
                    const next = isTyping
                        ? current.includes(username)
                            ? current
                            : [...current, username]
                        : current.filter((name) => name !== username)
                    return {
                        ...s,
                        typingMap: { ...s.typingMap, [conversationId]: next },
                    }
                })
            }
        )

        // ------------------------------------------------------------------
        // participant:changed
        // A participant joined, left, or was removed. Invalidate the individual
        // conversation query so the participants list refetches fresh data.
        // ------------------------------------------------------------------
        socket.on(
            "participant:changed",
            ({
                conversationId,
            }: {
                conversationId: string
                action: "joined" | "left" | "removed"
                userId: string
            }) => {
                void queryClient.invalidateQueries({
                    queryKey: ["conversation", conversationId],
                })
            }
        )

        // ------------------------------------------------------------------
        // message:read
        // Another client marked messages in a conversation as read.
        // Update every message the reader did NOT send to READ status so
        // the sender sees the correct delivery indicator.
        // ------------------------------------------------------------------
        socket.on(
            "message:read",
            ({
                conversationId,
                readByUserId,
            }: {
                conversationId: string
                readByUserId: string
            }) => {
                queryClient.setQueryData(
                    messagesInfiniteOptions(conversationId).queryKey,
                    (old: { pages: MessagePage[]; pageParams: unknown[] } | undefined) => {
                        if (!old) return old
                        return {
                            ...old,
                            pages: old.pages.map((page) => ({
                                ...page,
                                messages: page.messages.map((msg) =>
                                    msg.sender.id !== readByUserId
                                        ? { ...msg, status: "READ" as const }
                                        : msg
                                ),
                            })),
                        }
                    }
                )
            }
        )

        // ------------------------------------------------------------------
        // sync:required
        // Server detected a gap (e.g. after reconnect). Invalidate messages for
        // every listed conversation so they refetch from the GraphQL API.
        // ------------------------------------------------------------------
        socket.on("sync:required", ({ conversationIds }: { conversationIds: string[] }) => {
            for (const id of conversationIds) {
                void queryClient.invalidateQueries({
                    queryKey: ["messages", id],
                })
            }
        })

        // Do NOT remove listeners on component unmount — the socket is a
        // module-level singleton and its handlers must stay alive for the
        // entire session. Listeners are naturally cleaned up when the socket
        // is disconnected and the instance is garbage-collected.
    }, [queryClient])

    // Return only the existing instance — never create the socket here.
    // createSocketClient() is called exclusively inside useEffect (client-only)
    // to prevent SSR from initiating a WebSocket connection to the backend.
    return getSocketClient()
}
