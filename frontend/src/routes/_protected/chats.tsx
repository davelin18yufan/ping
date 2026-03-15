/**
 * ChatsLayout — persistent two-pane layout for the /chats subtree.
 *
 * Layout:
 *   ┌─────────────┬──────────────────────────────┐
 *   │  Sidebar    │  Main Content (Outlet)        │
 *   │  280px      │  flex: 1                      │
 *   │  conv list  │  ChatRoom / empty state       │
 *   └─────────────┴──────────────────────────────┘
 *
 * Responsive:
 *   - ≥768px: both panes visible side-by-side
 *   - <768px: sidebar full-width by default; main overlays when
 *     data-has-chat="true" is set on the layout root
 *
 * Real-time:
 *   useSocket() initialised once here — shared by all child routes.
 *   Child routes do NOT call useSocket() separately.
 *
 * Auth is handled by the parent _protected layout route (beforeLoad).
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { useStore } from "@tanstack/react-store"
import { Plus } from "lucide-react"
import { useCallback, useState } from "react"

import { ConversationList } from "@/components/chats/ConversationList"
import { GroupCreateModal } from "@/components/chats/GroupCreateModal"
import { conversationsQueryOptions } from "@/graphql/options/conversations"
import { useSocket } from "@/hooks/useSocket"
import { uiStore } from "@/stores/uiStore"

import "@styles/components/chats.css"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_protected/chats")({
    // Prefetch conversation list for ALL chats routes (sidebar always needs it)
    loader: async ({ context: { queryClient } }) => {
        if (import.meta.env.SSR) return
        await queryClient.ensureQueryData(conversationsQueryOptions)
    },
    component: ChatsLayout,
})

function ChatsLayout() {
    const { data: conversations } = useQuery(conversationsQueryOptions)
    const navigate = useNavigate()

    // Initialize real-time socket event handlers (idempotent singleton)
    useSocket()

    const [showGroupCreate, setShowGroupCreate] = useState(false)

    // Drive mobile pane swap: true when any conversation is open.
    // Reading a single boolean avoids re-rendering ChatsLayout on every
    // conversation switch — only re-renders when going null ↔ non-null.
    const hasActiveConversation = useStore(uiStore, (s) => s.activeConversationId !== null)

    const { session } = Route.useRouteContext()
    const currentUserId = session?.user?.id ?? ""

    const handleConversationSelect = useCallback(
        (conversationId: string) => {
            // Skip if already viewing this conversation — prevents any navigation call
            // (and therefore any view transition) when clicking the active item.
            if (uiStore.state.activeConversationId === conversationId) return

            // Eagerly update active state for instant sidebar highlight + mobile pane swap
            uiStore.setState((s) => ({ ...s, activeConversationId: conversationId }))
            // viewTransition: false — disable shrink/expand animation for in-chat navigation.
            // The global defaultViewTransition:true is still used for all other route changes.
            void navigate({
                to: "/chats/$conversationId",
                params: { conversationId },
                viewTransition: false,
            })
        },
        [navigate]
    )

    const handleConversationDoubleClick = useCallback((conversationId: string) => {
        window.open(`/chats/${conversationId}`, "_blank", "noopener,noreferrer")
    }, [])

    const handleGroupCreated = useCallback(
        (conversationId: string) => {
            setShowGroupCreate(false)
            uiStore.setState((s) => ({ ...s, activeConversationId: conversationId }))
            void navigate({
                to: "/chats/$conversationId",
                params: { conversationId },
                viewTransition: false,
            })
        },
        [navigate]
    )
    return (
        // data-has-chat drives the mobile CSS: sidebar ↔ main pane swap
        <div
            className="chats-layout"
            data-has-chat={hasActiveConversation ? "true" : "false"}
        >
            {/* ── Left Sidebar ──────────────────────────────────── */}
            <aside className="chats-layout__sidebar glass-card" aria-label="Conversations">
                <div className="chats-layout__sidebar-header">
                    <h1 className="chats-layout__sidebar-title">Messages</h1>
                    <Button
                        type="button"
                        className="glass-button chats-layout__new-btn"
                        onClick={() => setShowGroupCreate(true)}
                        aria-label="New group conversation"
                        title="New group"
                    >
                        <Plus size={16} aria-hidden="true" />
                    </Button>
                </div>

                <div className="chats-layout__sidebar-list">
                    <ConversationList
                        conversations={conversations ?? []}
                        currentUserId={currentUserId}
                        onSelect={handleConversationSelect}
                        onDoubleClick={handleConversationDoubleClick}
                    />
                </div>
            </aside>

            {/* ── Main Content ──────────────────────────────────── */}
            <main className="chats-layout__main">
                <Outlet />
            </main>

            {showGroupCreate && (
                <GroupCreateModal
                    onClose={() => setShowGroupCreate(false)}
                    onCreated={handleGroupCreated}
                />
            )}
        </div>
    )
}
