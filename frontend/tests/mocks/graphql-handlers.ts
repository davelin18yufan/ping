/**
 * MSW GraphQL Handlers for Feature 1.2.1 — Search & Friend Request
 *
 * Covers:
 * - searchUsers query
 * - friends query
 * - pendingFriendRequests query
 * - sentFriendRequests query
 * - sendFriendRequest mutation
 * - acceptFriendRequest mutation
 * - rejectFriendRequest mutation
 * - cancelFriendRequest mutation
 */

import { graphql, HttpResponse } from "msw"

// ---------------------------------------------------------------------------
// Mock data fixtures
// ---------------------------------------------------------------------------

export const mockUserAlice = {
    id: "user-alice",
    name: "Alice Chen",
    email: "alice@test.com",
    image: null,
}

export const mockUserBob = {
    id: "user-bob",
    name: "Bob Wang",
    email: "bob@test.com",
    image: "https://example.com/bob.jpg",
}

export const mockUserCarol = {
    id: "user-carol",
    name: "Carol Lin",
    email: "carol@test.com",
    image: null,
}

export const mockPendingRequest = {
    id: "req-001",
    status: "PENDING",
    createdAt: "2026-02-16T00:00:00.000Z",
    updatedAt: "2026-02-16T00:00:00.000Z",
    sender: mockUserBob,
    receiver: mockUserAlice,
}

export const mockPendingRequest2 = {
    id: "req-002",
    status: "PENDING",
    createdAt: "2026-02-16T01:00:00.000Z",
    updatedAt: "2026-02-16T01:00:00.000Z",
    sender: mockUserCarol,
    receiver: mockUserAlice,
}

export const mockSentRequest = {
    id: "req-123",
    status: "PENDING",
    createdAt: "2026-02-16T00:00:00.000Z",
    updatedAt: "2026-02-16T00:00:00.000Z",
    sender: mockUserAlice,
    receiver: mockUserBob,
}

export const mockFriendship = {
    id: "friendship-001",
    friend: mockUserBob,
    since: "2026-02-15T00:00:00.000Z",
}

// ---------------------------------------------------------------------------
// Default GraphQL handlers (happy path)
// ---------------------------------------------------------------------------

export const graphqlHandlers = [
    // searchUsers — returns filtered mock users
    graphql.query("SearchUsers", ({ variables }) => {
        const query = (variables.query as string)?.toLowerCase() ?? ""
        const results = [mockUserBob, mockUserCarol].filter(
            (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
        )
        return HttpResponse.json({ data: { searchUsers: results } })
    }),

    // friends — returns accepted friends list
    graphql.query("Friends", () => {
        return HttpResponse.json({ data: { friends: [mockUserBob, mockUserCarol] } })
    }),

    // pendingFriendRequests — returns pending incoming requests
    graphql.query("PendingFriendRequests", () => {
        return HttpResponse.json({
            data: { pendingFriendRequests: [mockPendingRequest, mockPendingRequest2] },
        })
    }),

    // sentFriendRequests — returns pending outgoing requests
    graphql.query("SentFriendRequests", () => {
        return HttpResponse.json({
            data: { sentFriendRequests: [mockSentRequest] },
        })
    }),

    // sendFriendRequest mutation
    graphql.mutation("SendFriendRequest", ({ variables }) => {
        return HttpResponse.json({
            data: {
                sendFriendRequest: {
                    id: "req-new",
                    status: "PENDING",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    sender: mockUserAlice,
                    receiver: { id: variables.userId, name: "Unknown", email: "", image: null },
                },
            },
        })
    }),

    // acceptFriendRequest mutation
    graphql.mutation("AcceptFriendRequest", () => {
        return HttpResponse.json({
            data: { acceptFriendRequest: mockFriendship },
        })
    }),

    // rejectFriendRequest mutation
    graphql.mutation("RejectFriendRequest", () => {
        return HttpResponse.json({ data: { rejectFriendRequest: true } })
    }),

    // cancelFriendRequest mutation
    graphql.mutation("CancelFriendRequest", () => {
        return HttpResponse.json({ data: { cancelFriendRequest: true } })
    }),
]

// ---------------------------------------------------------------------------
// Edge-case override handlers (for individual test use)
// ---------------------------------------------------------------------------

export const emptyFriendsHandler = graphql.query("Friends", () => {
    return HttpResponse.json({ data: { friends: [] } })
})

export const emptyPendingRequestsHandler = graphql.query("PendingFriendRequests", () => {
    return HttpResponse.json({ data: { pendingFriendRequests: [] } })
})

export const emptySentRequestsHandler = graphql.query("SentFriendRequests", () => {
    return HttpResponse.json({ data: { sentFriendRequests: [] } })
})

export const emptySearchResultsHandler = graphql.query("SearchUsers", () => {
    return HttpResponse.json({ data: { searchUsers: [] } })
})

export const conflictSendRequestHandler = graphql.mutation("SendFriendRequest", () => {
    return HttpResponse.json({
        errors: [
            {
                message: "Friend request already sent",
                extensions: { code: "CONFLICT", status: 409 },
            },
        ],
    })
})
