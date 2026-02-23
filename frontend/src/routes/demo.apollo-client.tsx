import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/demo/apollo-client")({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">GraphQL Client Demo</h2>
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
                <p className="font-bold">Migrated to TanStack Query</p>
                <p className="text-sm mt-2">
                    This app now uses a fetch-based GraphQL client with TanStack Query for data
                    fetching. Apollo Client has been removed.
                </p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-bold mb-2">New Architecture</h3>
                <ul className="list-disc ml-6 text-sm space-y-1">
                    <li>
                        <code className="bg-gray-200 px-1 rounded">src/lib/graphql-client.ts</code>{" "}
                        — fetch-based client with Better Auth cookies
                    </li>
                    <li>
                        <code className="bg-gray-200 px-1 rounded">
                            src/graphql/options/friends.ts
                        </code>{" "}
                        — TanStack Query queryOptions factories
                    </li>
                    <li>
                        <code className="bg-gray-200 px-1 rounded">
                            src/graphql/operations/friends.ts
                        </code>{" "}
                        — GraphQL operation strings
                    </li>
                </ul>
            </div>
        </div>
    )
}
