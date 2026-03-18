/**
 * _protected — Pathless layout route for authenticated pages
 *
 * TanStack Router's "_" prefix creates a layout route that wraps child routes
 * without adding a URL segment. URLs remain /chats, /friends, etc.
 *
 * beforeLoad runs ONCE when the user enters this protected area (on initial
 * navigation or when coming from an unauthenticated route), then is cached
 * for the lifetime of the navigation — not re-run on every child route.
 *
 * Session is fetched via createServerFn which:
 * - Runs on the server during SSR (forwards cookie header to backend)
 * - Runs as an RPC call during client-side navigation
 *
 * @see https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#pathless-routes
 * @see https://www.better-auth.com/docs/integrations/tanstack
 */

import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router"

import AppHeader from "@/components/shared/AppHeader"
import { AppNavSidebar } from "@/components/shared/AppNavSidebar"
import { getSession } from "@/lib/getSession"

export const Route = createFileRoute("/_protected")({
    beforeLoad: async ({ location }) => {
        const session = await getSession()

        if (!session) {
            throw redirect({
                to: "/auth",
                search: {
                    redirect: location.pathname,
                },
            })
        }

        return { session }
    },
    component: ProtectedLayout,
})

function ProtectedLayout() {
    // Detect if we are inside a specific chat room (/chats/:conversationId).
    // On mobile (<768px), the nav rail is hidden in this context so the chat
    // room can use the full screen. The CSS [data-in-chat-room] attribute
    // selector handles both the nav visibility and the content padding reset.
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const isInChatRoom = /^\/chats\/.+/.test(pathname)

    return (
        <div data-in-chat-room={isInChatRoom || undefined}>
            <AppHeader />
            <AppNavSidebar />
            <div className="app-nav-content">
                <Outlet />
            </div>
        </div>
    )
}
