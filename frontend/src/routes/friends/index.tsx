import { createFileRoute } from "@tanstack/react-router"

import { FriendsPage } from "@/components/friends/FriendsPage"
import {
    friendsListQueryOptions,
    pendingRequestsQueryOptions,
    sentRequestsQueryOptions,
} from "@/graphql/options/friends"
import { requireAuthServer } from "@/middleware/auth.middleware.server"

import "@styles/components/friends.css"

export const Route = createFileRoute("/friends/")({
    loader: ({ context: { queryClient } }) =>
        Promise.all([
            queryClient.ensureQueryData(pendingRequestsQueryOptions),
            queryClient.ensureQueryData(friendsListQueryOptions),
            queryClient.ensureQueryData(sentRequestsQueryOptions),
        ]),
    server: {
        middleware: [requireAuthServer],
    },
    component: FriendsPage,
})
