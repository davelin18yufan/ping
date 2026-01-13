import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'

import {
  routerWithApolloClient,
  ApolloClient,
  InMemoryCache,
} from '@apollo/client-integration-tanstack-start'
import { HttpLink } from '@apollo/client'

import * as Sentry from '@sentry/tanstackstart-react'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  // Configure Apollo Client
  const apolloClient = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri:
        import.meta.env.VITE_GRAPHQL_ENDPOINT ||
        'https://countries.trevorblades.com/',
    }),
  })

  const rqContext = TanstackQuery.getContext()

  const router = createRouter({
    routeTree,
    context: {
      ...routerWithApolloClient.defaultContext,

      ...rqContext,
    },

    defaultPreload: 'intent',
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
