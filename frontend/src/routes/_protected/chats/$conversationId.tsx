/**
 * ChatRoomPage — dynamic route for a single conversation (/chats/:conversationId)
 *
 * Loader:
 *   - ensureQueryData for the individual conversation (header, participants).
 *   - prefetchInfiniteQuery for message history (bottom-anchored VList).
 *
 * Auth is handled by the parent _protected layout route (beforeLoad).
 *
 * Renders the full-screen ChatRoom component with conversationId and currentUserId.
 */

import { createFileRoute } from "@tanstack/react-router"

import { ChatRoom } from "@/components/chats/ChatRoom"
import { conversationQueryOptions, messagesInfiniteOptions } from "@/graphql/options/conversations"
import { useSocket } from "@/hooks/useSocket"

import "@styles/components/chats.css"

export const Route = createFileRoute("/_protected/chats/$conversationId")({
    loader: async ({ context: { queryClient }, params }) => {
        if (import.meta.env.SSR) return
        await Promise.all([
            queryClient.ensureQueryData(conversationQueryOptions(params.conversationId)),
            queryClient.prefetchInfiniteQuery(messagesInfiniteOptions(params.conversationId)),
        ])
    },
    component: ChatRoomPage,
})

function ChatRoomPage() {
    const { conversationId } = Route.useParams()
    const { session } = Route.useRouteContext()

    // Initialize real-time socket event handlers (idempotent singleton)
    useSocket()

    return <ChatRoom conversationId={conversationId} currentUserId={session?.user?.id ?? ""} />
}
