/**
 * useSearchUsers — debounced user search hook
 *
 * TanStack Query v5 pattern with debouncing:
 * - Uses useQuery with enabled condition (>= 2 chars)
 * - Debouncing via useDebouncedValue hook (300ms)
 * - Query key includes debounced value for auto-caching
 * - No need for useLazyQuery - enabled does the job
 */

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import type { User } from "@/types/friends"

import { searchUsersQueryOptions } from "@/graphql/options/friends"
import { useDebouncedValue } from "@/hooks/useDebounce"

interface UseSearchUsersReturn {
    query: string
    setQuery: (q: string) => void
    results: User[]
    loading: boolean
    error: Error | null
}

export function useSearchUsers(): UseSearchUsersReturn {
    const [query, setQuery] = useState("")

    // ✅ Use reusable debounce hook (300ms delay)
    const debouncedQuery = useDebouncedValue(query, 300)

    // TanStack Query automatically fetches when:
    // 1. debouncedQuery changes
    // 2. enabled condition is true (>= 2 chars)
    const { data, isLoading, error } = useQuery({
        ...searchUsersQueryOptions(debouncedQuery),
        // Override enabled to check debounced value
        enabled: debouncedQuery.trim().length >= 2,
    })

    return {
        query,
        setQuery,
        results: data ?? [],
        loading: isLoading,
        error: error as Error | null,
    }
}
