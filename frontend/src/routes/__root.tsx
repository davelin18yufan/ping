import AppHeader from "@components/shared/AppHeader"
import { TanStackDevtools } from "@tanstack/react-devtools"
import type { QueryClient } from "@tanstack/react-query"
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { useEffect } from "react"

import { AestheticModeProvider, useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { useHeartbeat } from "@/hooks/useHeartbeat"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools"
import * as TanstackQuery from "@/integrations/tanstack-query/root-provider"
import type { AuthSession } from "@/lib/auth"
import appCss from "../styles.css?url"

interface PingContext {
    queryClient: QueryClient
    session?: AuthSession | null
}

export const Route = createRootRouteWithContext<PingContext>()({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: "Ping Messenger",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),

    shellComponent: RootDocument,
    component: RootComponent,
})

/**
 * HtmlClassManager
 * Dynamically adds .minimal class to <html> element based on aesthetic mode,
 * and sets data-aesthetic attribute so CSS selectors like [data-aesthetic="minimal"] work.
 */
function HtmlClassManager() {
    const { mode } = useAestheticMode()

    useEffect(() => {
        if (mode === "minimal") {
            document.documentElement.classList.add("minimal")
        } else {
            document.documentElement.classList.remove("minimal")
        }
        document.documentElement.dataset.aesthetic = mode
    }, [mode])

    return null
}

/**
 * SessionGuardMounter
 * Mounts the useSessionGuard hook inside AestheticModeProvider
 * so it has access to React context and is co-located with the app shell.
 */
function SessionGuardMounter() {
    useSessionGuard()
    return null
}

/**
 * HeartbeatMounter
 * Mounts the useHeartbeat hook as a singleton at the root layout.
 * Emits Socket.io "heartbeat" every 30 s and "user:away" on tab hide / unload.
 */
function HeartbeatMounter() {
    useHeartbeat()
    return null
}

/**
 * RootDocument — HTML shell (shellComponent)
 *
 * Renders the static HTML structure only: <html>, <head>, <body>.
 * Must NOT use router context hooks (not available in shellComponent).
 * App-level providers and components live in RootComponent below.
 */
function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <Scripts />
            </body>
        </html>
    )
}

/**
 * RootComponent — application shell (component)
 *
 * Wraps the entire route tree with QueryClientProvider and other
 * app-level providers. Rendered inside RootDocument's {children}.
 * Has full access to router context (queryClient, session, etc.).
 */
function RootComponent() {
    const { queryClient } = Route.useRouteContext()

    return (
        <TanstackQuery.Provider queryClient={queryClient}>
            <AestheticModeProvider>
                <HtmlClassManager />
                <SessionGuardMounter />
                <HeartbeatMounter />
                <AppHeader />
                <Outlet />
                <TanStackDevtools
                    config={{
                        position: "bottom-right",
                    }}
                    plugins={[
                        {
                            name: "Tanstack Router",
                            render: <TanStackRouterDevtoolsPanel />,
                        },
                        TanStackQueryDevtools,
                    ]}
                />
            </AestheticModeProvider>
        </TanstackQuery.Provider>
    )
}
