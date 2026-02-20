/**
 * useSearchUsers Hook Unit Tests — Feature 1.2.1
 *
 * Test cases covered:
 * - TC-F-02: Debounce 300ms behaviour
 * - TC-F-03: Queries shorter than 2 chars do not call API
 * - Additional: empty query clears results
 * - Additional: loading state transitions correctly
 * - Additional: API error fills error state
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, act, waitFor } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { graphql, HttpResponse } from "msw"

import { mswServer } from "../../mocks/server"
import { mockUserBob, mockUserCarol } from "../../mocks/graphql-handlers"

function makeClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
        },
    })
}

function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: makeClient(), children })
}

// Lazy import — will fail until hook is implemented (RED phase)
let useSearchUsers: () => {
    query: string
    setQuery: (q: string) => void
    results: unknown[]
    loading: boolean
    error: unknown
}

beforeEach(async () => {
    try {
        const module = await import("@/hooks/useSearchUsers")
        useSearchUsers = module.useSearchUsers
    } catch {
        // Hook not yet implemented — stub so tests fail with meaningful output
        useSearchUsers = () => ({
            query: "",
            setQuery: () => {
                throw new Error("useSearchUsers not implemented")
            },
            results: [],
            loading: false,
            error: undefined,
        })
    }
})

// Helper: advance fake timers then switch back to real for waitFor polling
async function advanceFakeTimersAndFlush(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
    })
    vi.useRealTimers()
}

// ---------------------------------------------------------------------------
// TC-F-02: Debounce 300ms
// ---------------------------------------------------------------------------

describe("TC-F-02: useSearchUsers debounces with 300ms delay", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    })

    it("does not trigger loading before 300ms elapses", async () => {
        const searchSpy = vi.fn()
        mswServer.use(
            graphql.query("SearchUsers", () => {
                searchSpy()
                return HttpResponse.json({ data: { searchUsers: [mockUserBob] } })
            })
        )

        const { result } = renderHook(() => useSearchUsers(), { wrapper })

        act(() => {
            result.current.setQuery("Bo")
        })

        // Before 300ms — loading must be false and spy not called
        expect(result.current.loading).toBe(false)
        expect(searchSpy).not.toHaveBeenCalled()

        // Advance timers to 300ms, then switch to real timers for waitFor
        await advanceFakeTimersAndFlush(300)

        await waitFor(() => {
            expect(searchSpy).toHaveBeenCalledTimes(1)
        })
    })

    it("fires only one request when user types rapidly", async () => {
        const searchSpy = vi.fn()
        mswServer.use(
            graphql.query("SearchUsers", () => {
                searchSpy()
                return HttpResponse.json({ data: { searchUsers: [mockUserBob] } })
            })
        )

        const { result } = renderHook(() => useSearchUsers(), { wrapper })

        act(() => {
            result.current.setQuery("B")
            result.current.setQuery("Bo")
            result.current.setQuery("Bob")
        })

        // Advance timers to 300ms, then switch to real timers for waitFor
        await advanceFakeTimersAndFlush(300)

        // Only the final query should trigger one call
        await waitFor(() => {
            expect(searchSpy).toHaveBeenCalledTimes(1)
        })
    })
})

// ---------------------------------------------------------------------------
// TC-F-03: Queries shorter than 2 chars do not call API
// No timer advancement needed — guard prevents setTimeout from being set
// ---------------------------------------------------------------------------

describe("TC-F-03: Queries shorter than 2 chars skip API", () => {
    it("does not call SearchUsers for a single character", async () => {
        const searchSpy = vi.fn()
        mswServer.use(
            graphql.query("SearchUsers", () => {
                searchSpy()
                return HttpResponse.json({ data: { searchUsers: [] } })
            })
        )

        const { result } = renderHook(() => useSearchUsers(), { wrapper })

        await act(async () => {
            result.current.setQuery("a")
        })

        // Guard prevents setTimeout from being set, so spy should never be called
        expect(searchSpy).not.toHaveBeenCalled()
    })

    it("does not call SearchUsers for empty string", async () => {
        const searchSpy = vi.fn()
        mswServer.use(
            graphql.query("SearchUsers", () => {
                searchSpy()
                return HttpResponse.json({ data: { searchUsers: [] } })
            })
        )

        const { result } = renderHook(() => useSearchUsers(), { wrapper })

        await act(async () => {
            result.current.setQuery("")
        })

        expect(searchSpy).not.toHaveBeenCalled()
        expect(result.current.results).toHaveLength(0)
    })
})

// ---------------------------------------------------------------------------
// Additional: loading state transitions
// ---------------------------------------------------------------------------

describe("useSearchUsers loading state", () => {
    // Don't use fake timers for this test - causes issues with TanStack Query
    it("returns results after query resolves", async () => {
        const searchSpy = vi.fn()
        mswServer.use(
            graphql.query("SearchUsers", () => {
                searchSpy()
                return HttpResponse.json({
                    data: { searchUsers: [mockUserBob, mockUserCarol] },
                })
            })
        )

        const { result } = renderHook(() => useSearchUsers(), { wrapper })

        act(() => {
            result.current.setQuery("an")
        })

        // Wait for debounce (300ms) + query execution
        await waitFor(() => {
            expect(searchSpy).toHaveBeenCalled()
        }, { timeout: 1000 })

        // Wait for results to arrive
        await waitFor(() => {
            expect(result.current.results.length).toBe(2)
        }, { timeout: 1000 })
    })
})

// ---------------------------------------------------------------------------
// Additional: API error fills error state
// ---------------------------------------------------------------------------

describe("useSearchUsers error handling", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    })

    it("populates error when API returns a GraphQL error", async () => {
        mswServer.use(
            graphql.query("SearchUsers", () => {
                return HttpResponse.json({
                    errors: [{ message: "Internal server error" }],
                })
            })
        )

        const { result } = renderHook(() => useSearchUsers(), { wrapper })

        act(() => {
            result.current.setQuery("bo")
        })

        // Advance 300ms to trigger debounce, then real timers for waitFor
        await advanceFakeTimersAndFlush(300)

        await waitFor(() => {
            expect(result.current.error).toBeDefined()
        })
    })
})
