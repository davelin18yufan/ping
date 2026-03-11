/**
 * Friends route (/friends/)
 *
 * Auth is handled by the parent _protected layout route (beforeLoad).
 */

import { createFileRoute } from "@tanstack/react-router"

import { FriendsPage } from "@/components/friends/FriendsPage"
import {
    friendsListQueryOptions,
    pendingRequestsQueryOptions,
    sentRequestsQueryOptions,
} from "@/graphql/options/friends"

import "@styles/components/friends.css"

export const Route = createFileRoute("/_protected/friends/")({
    loader: async ({ context: { queryClient } }) => {
        if (import.meta.env.SSR) return
        await Promise.all([
            queryClient.ensureQueryData(pendingRequestsQueryOptions),
            queryClient.ensureQueryData(friendsListQueryOptions),
            queryClient.ensureQueryData(sentRequestsQueryOptions),
        ])
    },
    component: FriendsPage,
})
