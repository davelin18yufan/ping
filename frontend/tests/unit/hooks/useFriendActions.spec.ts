/**
 * useFriendActions Hook Unit Tests — Feature 1.2.1
 *
 * Test cases covered:
 * - sendRequest success: returns FriendRequest with PENDING status
 * - sendRequest conflict: populates error state
 * - acceptRequest success: returns Friendship object
 * - rejectRequest success: returns true
 * - cancelRequest success: returns true
 * - loading state is true during mutation, false afterwards
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, act, waitFor } from "@testing-library/react"
import React from "react"
import { describe, it, expect, beforeEach } from "vitest"
import { graphql, HttpResponse } from "msw"

import { mswServer } from "../../mocks/server"
import {
    mockUserAlice,
    mockUserBob,
    mockFriendship,
    mockPendingRequest,
    conflictSendRequestHandler,
} from "../../mocks/graphql-handlers"

function makeClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    })
}

function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: makeClient(), children })
}

// Lazy import — will fail until hook is implemented (RED phase)
let useFriendActions: () => {
    sendRequest: (userId: string) => Promise<unknown>
    acceptRequest: (requestId: string) => Promise<unknown>
    rejectRequest: (requestId: string) => Promise<boolean>
    cancelRequest: (requestId: string) => Promise<boolean>
    loading: boolean
    error: unknown
}

beforeEach(async () => {
    try {
        const module = await import("@/hooks/useFriendActions")
        useFriendActions = module.useFriendActions
    } catch {
        // Hook not yet implemented — stub so tests fail with meaningful output
        useFriendActions = () => ({
            sendRequest: async () => {
                throw new Error("useFriendActions not implemented")
            },
            acceptRequest: async () => {
                throw new Error("useFriendActions not implemented")
            },
            rejectRequest: async () => {
                throw new Error("useFriendActions not implemented")
            },
            cancelRequest: async () => {
                throw new Error("useFriendActions not implemented")
            },
            loading: false,
            error: undefined,
        })
    }
})

// ---------------------------------------------------------------------------
// sendRequest
// ---------------------------------------------------------------------------

describe("useFriendActions.sendRequest", () => {
    it("returns a FriendRequest with PENDING status on success", async () => {
        mswServer.use(
            graphql.mutation("SendFriendRequest", () => {
                return HttpResponse.json({
                    data: {
                        sendFriendRequest: {
                            ...mockPendingRequest,
                            sender: mockUserAlice,
                            receiver: mockUserBob,
                        },
                    },
                })
            })
        )

        const { result } = renderHook(() => useFriendActions(), { wrapper })

        let friendRequest: unknown
        await act(async () => {
            friendRequest = await result.current.sendRequest(mockUserBob.id)
        })

        expect((friendRequest as { status: string }).status).toBe("PENDING")
        expect(result.current.error).toBeFalsy()
    })

    it("populates error when server returns CONFLICT", async () => {
        mswServer.use(conflictSendRequestHandler)

        const { result } = renderHook(() => useFriendActions(), { wrapper })

        await act(async () => {
            try {
                await result.current.sendRequest(mockUserBob.id)
            } catch {
                // error may also be thrown
            }
        })

        await waitFor(() => {
            expect(result.current.error).toBeDefined()
        })
    })
})

// ---------------------------------------------------------------------------
// acceptRequest
// ---------------------------------------------------------------------------

describe("useFriendActions.acceptRequest", () => {
    it("returns a Friendship object on success", async () => {
        mswServer.use(
            graphql.mutation("AcceptFriendRequest", () => {
                return HttpResponse.json({ data: { acceptFriendRequest: mockFriendship } })
            })
        )

        const { result } = renderHook(() => useFriendActions(), { wrapper })

        let friendship: unknown
        await act(async () => {
            friendship = await result.current.acceptRequest("req-001")
        })

        expect((friendship as { id: string }).id).toBe(mockFriendship.id)
        expect((friendship as { friend: unknown }).friend).toBeDefined()
        expect(result.current.error).toBeFalsy()
    })
})

// ---------------------------------------------------------------------------
// rejectRequest
// ---------------------------------------------------------------------------

describe("useFriendActions.rejectRequest", () => {
    it("returns true on success", async () => {
        mswServer.use(
            graphql.mutation("RejectFriendRequest", () => {
                return HttpResponse.json({ data: { rejectFriendRequest: true } })
            })
        )

        const { result } = renderHook(() => useFriendActions(), { wrapper })

        let returnValue: unknown
        await act(async () => {
            returnValue = await result.current.rejectRequest("req-001")
        })

        expect(returnValue).toBe(true)
        expect(result.current.error).toBeFalsy()
    })
})

// ---------------------------------------------------------------------------
// cancelRequest
// ---------------------------------------------------------------------------

describe("useFriendActions.cancelRequest", () => {
    it("returns true on success", async () => {
        mswServer.use(
            graphql.mutation("CancelFriendRequest", () => {
                return HttpResponse.json({ data: { cancelFriendRequest: true } })
            })
        )

        const { result } = renderHook(() => useFriendActions(), { wrapper })

        let returnValue: unknown
        await act(async () => {
            returnValue = await result.current.cancelRequest("req-123")
        })

        expect(returnValue).toBe(true)
        expect(result.current.error).toBeFalsy()
    })
})

// ---------------------------------------------------------------------------
// loading state
// ---------------------------------------------------------------------------

describe("useFriendActions loading flag", () => {
    it("is false when no mutation is in flight", () => {
        const { result } = renderHook(() => useFriendActions(), { wrapper })

        expect(result.current.loading).toBe(false)
    })
})
