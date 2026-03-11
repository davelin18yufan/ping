/**
 * ChatsPage — Conversation list route (/chats/)
 *
 * Steel Frost Resonance design language:
 *  - Glassmorphism section card matching the friends page aesthetic
 *  - ConversationList with stagger-entry animations
 *  - Real-time updates via useSocket (patches TanStack Query cache in-place)
 *  - GroupCreateModal for creating new group conversations
 *
 * Loader pre-fetches the conversation list server-side so the page
 * renders immediately without a loading spinner on initial navigation.
 *
 * Auth is handled by the parent _protected layout route (beforeLoad).
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useEffect, useState } from "react"

import { ConversationList } from "@/components/chats/ConversationList"
import { GroupCreateModal } from "@/components/chats/GroupCreateModal"
import { useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { conversationsQueryOptions } from "@/graphql/options/conversations"
import { useSocket } from "@/hooks/useSocket"

import "@styles/components/chats.css"

export const Route = createFileRoute("/_protected/chats/")({
    // Prefetch on client-side navigation; skip silently during SSR because
    // graphqlFetch runs server-side without browser cookies (credentials: "include"
    // is a browser-only API). The client's useQuery handles the actual fetch.
    loader: async ({ context: { queryClient } }) => {
        if (import.meta.env.SSR) return
        await queryClient.ensureQueryData(conversationsQueryOptions)
    },
    component: ChatsPage,
})

function ChatsPage() {
    const { data: conversations } = useQuery(conversationsQueryOptions)
    const { mode } = useAestheticMode()
    const navigate = useNavigate()

    // Initialize real-time socket event handlers (idempotent singleton)
    useSocket()

    const [showGroupCreate, setShowGroupCreate] = useState(false)

    // Sync aesthetic mode to data attribute on <html> so CSS selectors work
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.documentElement.dataset.aesthetic = mode
        }
    }, [mode])

    // Access session from route context (set by _protected layout beforeLoad)
    const { session } = Route.useRouteContext()
    const currentUserId = session?.user?.id ?? ""

    function handleConversationSelect(conversationId: string) {
        void navigate({
            to: "/chats/$conversationId",
            params: { conversationId },
        })
    }

    function handleGroupCreated(conversationId: string) {
        setShowGroupCreate(false)
        void navigate({
            to: "/chats/$conversationId",
            params: { conversationId },
        })
    }

    return (
        <div className="chats-page">
            <section className="glass-card chats-page__section">
                <div className="chats-page__header">
                    <h1 className="chats-page__title">Messages</h1>
                    <button
                        type="button"
                        className="glass-button"
                        onClick={() => setShowGroupCreate(true)}
                        aria-label="New group conversation"
                    >
                        <Plus size={18} aria-hidden="true" />
                    </button>
                </div>

                <ConversationList
                    conversations={conversations ?? []}
                    currentUserId={currentUserId}
                    onSelect={handleConversationSelect}
                />
            </section>

            {showGroupCreate && (
                <GroupCreateModal
                    onClose={() => setShowGroupCreate(false)}
                    onCreated={handleGroupCreated}
                />
            )}
        </div>
    )
}
