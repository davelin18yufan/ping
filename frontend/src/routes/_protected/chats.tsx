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
import { Plus, SlidersHorizontal } from "lucide-react"
import { useCallback, useDeferredValue, useMemo, useTransition, useState } from "react"

import { ConversationList } from "@/components/chats/ConversationList"
import { GroupCreateModal } from "@/components/chats/GroupCreateModal"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/SearchInput"
import { conversationsQueryOptions } from "@/graphql/options/conversations"
import { useSocket } from "@/hooks/useSocket"
import { cn } from "@/lib/utils"

import "@styles/components/chats.css"
import { uiStore } from "@/stores/uiStore"

export const Route = createFileRoute("/_protected/chats")({
    // Prefetch conversation list for ALL chats routes (sidebar always needs it)
    loader: async ({ context: { queryClient } }) => {
        if (import.meta.env.SSR) return
        await queryClient.ensureQueryData(conversationsQueryOptions)
    },
    component: ChatsLayout,
})

type ConversationFilter = "unread" | "group" | "direct" | "pinned"

function ChatsLayout() {
    // placeholderData: keep previous data while refetching (prevents brief empty list
    // when socket events trigger invalidateQueries during an active search session)
    const { data: conversations } = useQuery({
        ...conversationsQueryOptions,
        placeholderData: (prev) => prev,
    })
    const navigate = useNavigate()

    // Initialize real-time socket event handlers (idempotent singleton)
    useSocket()

    const [showGroupCreate, setShowGroupCreate] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilters, setActiveFilters] = useState<Set<ConversationFilter>>(new Set())
    // On narrow sidebars the filter chips are hidden; this toggles the panel open
    const [filterPanelOpen, setFilterPanelOpen] = useState(false)

    // useDeferredValue: input value updates urgently (instant typing feedback);
    // deferredSearchQuery lags behind during busy renders so the expensive
    // filteredConversations memo only re-runs at idle time.
    const deferredSearchQuery = useDeferredValue(searchQuery)

    // startFilterTransition: used only for filter chip toggles (discrete state changes
    // that directly drive the memo, not a derived value like deferredSearchQuery).
    const [, startFilterTransition] = useTransition()

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

    const toggleFilter = useCallback(
        (filter: ConversationFilter) => {
            startFilterTransition(() => {
                setActiveFilters((prev) => {
                    const next = new Set(prev)
                    if (next.has(filter)) next.delete(filter)
                    else next.add(filter)
                    return next
                })
            })
        },
        [startFilterTransition]
    )

    const filteredConversations = useMemo(() => {
        if (!conversations) return []
        return conversations.filter((conv) => {
            // Search: match display name (case-insensitive) or last message content.
            // Uses deferredSearchQuery so the filter only re-runs at idle time while
            // the input itself reflects keystrokes immediately (no perceptible lag).
            if (deferredSearchQuery.trim()) {
                const isGroup = conv.type === "GROUP"
                const other = !isGroup
                    ? conv.participants.find((p) => p.user.id !== currentUserId)
                    : null
                const name = isGroup ? (conv.name ?? "") : (other?.user.name ?? "")
                const preview = conv.lastMessage?.content ?? ""
                const q = deferredSearchQuery.toLowerCase()
                if (!name.toLowerCase().includes(q) && !preview.toLowerCase().includes(q))
                    return false
            }
            // Filters — AND logic: all active filters must pass
            if (activeFilters.has("unread") && conv.unreadCount === 0) return false
            if (activeFilters.has("group") && conv.type !== "GROUP") return false
            if (activeFilters.has("direct") && conv.type !== "ONE_TO_ONE") return false
            if (activeFilters.has("pinned") && conv.pinnedAt === null) return false
            return true
        })
    }, [conversations, deferredSearchQuery, activeFilters, currentUserId])

    return (
        // data-has-chat drives the mobile CSS: sidebar ↔ main pane swap
        <div className="chats-layout" data-has-chat={hasActiveConversation ? "true" : "false"}>
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

                {/* Search bar */}
                <div className="chats-layout__search-wrapper">
                    <SearchInput
                        wrapperClassName="chats-layout__search-input-row"
                        iconClassName="chats-layout__search-icon"
                        inputClassName="chats-layout__search-input"
                        clearClassName="chats-layout__search-clear"
                        placeholder="Search conversations.."
                        aria-label="Search conversations"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onClear={() => setSearchQuery("")}
                    />
                </div>

                {/* Filter toggle button — only visible on narrow sidebars (<280px) via CSS */}
                <div className="chats-layout__filter-toggle-row">
                    <button
                        type="button"
                        className={cn(
                            "chats-layout__filter-toggle",
                            filterPanelOpen && "chats-layout__filter-toggle--open",
                            activeFilters.size > 0 && "chats-layout__filter-toggle--active"
                        )}
                        onClick={() => setFilterPanelOpen((p) => !p)}
                        aria-expanded={filterPanelOpen}
                        aria-controls="chats-filter-panel"
                    >
                        <SlidersHorizontal size={13} aria-hidden="true" />
                        <span>Filters</span>
                        {activeFilters.size > 0 && (
                            <span className="chats-layout__filter-toggle-badge">
                                {activeFilters.size}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filter chips — inline on wide sidebar, collapsible panel on narrow */}
                <div
                    id="chats-filter-panel"
                    className={cn(
                        "chats-layout__filters",
                        filterPanelOpen && "chats-layout__filters--open"
                    )}
                    role="group"
                    aria-label="Filter conversations"
                >
                    {(
                        [
                            { id: "unread", label: "Unread" },
                            { id: "group", label: "Groups" },
                            { id: "direct", label: "Direct" },
                            { id: "pinned", label: "Pinned" },
                        ] as const
                    ).map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            className={cn(
                                "chats-filter-chip",
                                activeFilters.has(id) && "chats-filter-chip--active"
                            )}
                            onClick={() => toggleFilter(id)}
                            aria-pressed={activeFilters.has(id)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="chats-layout__sidebar-list">
                    <ConversationList
                        conversations={filteredConversations}
                        currentUserId={currentUserId}
                        onSelect={handleConversationSelect}
                        onDoubleClick={handleConversationDoubleClick}
                        emptyMessage={
                            searchQuery || activeFilters.size > 0
                                ? "No conversations match your search"
                                : undefined
                        }
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
