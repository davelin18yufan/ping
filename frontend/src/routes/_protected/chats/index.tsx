/**
 * ChatsIndexPage — empty state shown when no conversation is selected.
 *
 * Rendered inside ChatsLayout's <Outlet /> when the user navigates to /chats/
 * without a specific conversationId. The sidebar remains visible on desktop.
 *
 * Auth is handled by the parent _protected layout route (beforeLoad).
 * Conversation prefetch is handled by the parent chats layout loader.
 * Socket is initialized by the parent chats layout (useSocket singleton).
 */

import { createFileRoute } from "@tanstack/react-router"
import { MessageSquareDashed } from "lucide-react"

export const Route = createFileRoute("/_protected/chats/")({
    component: ChatsIndexPage,
})

function ChatsIndexPage() {
    return (
        <div className="chats-layout__empty-state">
            <MessageSquareDashed size={40} aria-hidden="true" className="opacity-30" />
            <h2>No conversation selected</h2>
            <p>Pick a conversation from the sidebar, or start a new one.</p>
        </div>
    )
}
