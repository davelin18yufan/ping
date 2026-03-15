/**
 * ChatRoomPage — dynamic route for a single conversation (/chats/:conversationId)
 *
 * Loader:
 *   - ensureQueryData for the individual conversation (header, participants).
 *   - prefetchInfiniteQuery for message history (bottom-anchored VList).
 *
 * Auth is handled by the parent _protected layout route (beforeLoad).
 * Socket and CSS are initialized by the parent chats layout route.
 */

import { ChatRoom } from "@components/chats/ChatRoom"
import { createFileRoute } from "@tanstack/react-router"

import { conversationQueryOptions, messagesInfiniteOptions } from "@/graphql/options/conversations"

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

    return <ChatRoom conversationId={conversationId} currentUserId={session?.user?.id ?? ""} />
}
