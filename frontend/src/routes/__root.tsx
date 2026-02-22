import type { QueryClient } from "@tanstack/react-query"

import { TanStackDevtools } from "@tanstack/react-devtools"
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { useEffect } from "react"

import type { AuthSession } from "@/lib/auth"

import AppHeader from "@components/shared/AppHeader"
import { AestheticModeProvider, useAestheticMode } from "@/contexts/aesthetic-mode-context"
import { useSessionGuard } from "@/hooks/useSessionGuard"

import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools"
import * as TanstackQuery from "@/integrations/tanstack-query/root-provider"
import StoreDevtools from "@/lib/demo-store-devtools"
import appCss from "@css/styles.css?url"

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
 * Dynamically adds .minimal class to <html> element based on aesthetic mode
 */
function HtmlClassManager() {
    const { mode } = useAestheticMode()

    useEffect(() => {
        if (mode === "minimal") {
            document.documentElement.classList.add("minimal")
        } else {
            document.documentElement.classList.remove("minimal")
        }
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
                        StoreDevtools,
                        TanStackQueryDevtools,
                    ]}
                />
            </AestheticModeProvider>
        </TanstackQuery.Provider>
    )
}
