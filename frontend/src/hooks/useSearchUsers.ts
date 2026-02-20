/**
 * useSearchUsers — debounced user search hook
 *
 * TanStack Query v5 pattern with debouncing:
 * - Uses useQuery with enabled condition (>= 2 chars)
 * - Manual debouncing via useState + useEffect
 * - Query key includes debounced value for auto-caching
 * - No need for useLazyQuery - enabled does the job
 */

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

import { searchUsersQueryOptions } from "@/queries/friends"
import type { User } from "@/types/friends"

interface UseSearchUsersReturn {
    query: string
    setQuery: (q: string) => void
    results: User[]
    loading: boolean
    error: Error | null
}

export function useSearchUsers(): UseSearchUsersReturn {
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")

    // Debounce query input (300ms delay)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedQuery(query)
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [query])

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
