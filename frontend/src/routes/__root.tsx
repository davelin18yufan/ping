import type { ApolloClientIntegration } from "@apollo/client-integration-tanstack-start"
import type { QueryClient } from "@tanstack/react-query"

import { TanStackDevtools } from "@tanstack/react-devtools"
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { useEffect } from "react"

import type { AuthSession } from "@/lib/auth"

import SimpleHeader from "@/components/shared/SimpleHeader"
import { AestheticModeProvider, useAestheticMode } from "@/contexts/aesthetic-mode-context"

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools"
import StoreDevtools from "../lib/demo-store-devtools"
import appCss from "../styles.css?url"

interface PingContext extends ApolloClientIntegration.RouterContext {
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

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <AestheticModeProvider>
                    <HtmlClassManager />
                    <SimpleHeader />
                    {children}
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
                <Scripts />
            </body>
        </html>
    )
}
