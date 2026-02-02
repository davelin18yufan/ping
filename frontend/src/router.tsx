import { HttpLink } from "@apollo/client"
import {
    ApolloClient,
    InMemoryCache,
    routerWithApolloClient,
} from "@apollo/client-integration-tanstack-start"
import * as Sentry from "@sentry/tanstackstart-react"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import * as TanstackQuery from "./integrations/tanstack-query/root-provider"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"

// Import reusable loading component
import { SoundWaveLoader } from "./components/shared/SoundWaveLoader"

// Create a new router instance
export const getRouter = () => {
    // Configure Apollo Client
    const apolloClient = new ApolloClient({
        cache: new InMemoryCache(),
        link: new HttpLink({
            uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || "https://countries.trevorblades.com/",
        }),
    })

    const rqContext = TanstackQuery.getContext()

    const router = createRouter({
        routeTree,
        context: {
            ...routerWithApolloClient.defaultContext,

            ...rqContext,
        },

        defaultPreload: "intent",

        // Only show loading for slow navigations (>200ms)
        defaultPendingMs: 200,
        // Keep loading visible for at least 500ms to avoid flicker
        defaultPendingMinMs: 500,
        // Custom loading component
        defaultPendingComponent: () => <SoundWaveLoader size="md" />,
    })

    setupRouterSsrQueryIntegration({ router, queryClient: rqContext.queryClient })

    if (!router.isServer) {
        Sentry.init({
            dsn: import.meta.env.VITE_SENTRY_DSN,
            integrations: [],
            tracesSampleRate: 1.0,
            sendDefaultPii: true,
        })
    }

    return routerWithApolloClient(router, apolloClient)
}
