/**
 * useFriendActions — friend request CRUD mutations hook
 *
 * TanStack Query v5 pattern with optimistic updates:
 * - Uses useMutation for each action
 * - Optimistic UI via useMutationState (no manual cache manipulation)
 * - Auto-invalidates queries after success
 * - Provides unified loading/error state
 */

import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query"

import type { FriendRequest, Friendship } from "@/types/friends"

import {
    ACCEPT_FRIEND_REQUEST_MUTATION,
    CANCEL_FRIEND_REQUEST_MUTATION,
    REJECT_FRIEND_REQUEST_MUTATION,
    SEND_FRIEND_REQUEST_MUTATION,
} from "@/graphql/options/friends"
import { graphqlFetch } from "@/lib/graphql-client"

interface UseFriendActionsReturn {
    sendRequest: (userId: string) => Promise<FriendRequest>
    acceptRequest: (requestId: string) => Promise<Friendship>
    rejectRequest: (requestId: string) => Promise<boolean>
    cancelRequest: (requestId: string) => Promise<boolean>
    loading: boolean
    error: Error | null
}

export function useFriendActions(): UseFriendActionsReturn {
    const queryClient = useQueryClient()

    // Send friend request mutation
    const sendMutation = useMutation({
        mutationKey: ["friends", "sendRequest"] as const,
        mutationFn: async (userId: string) => {
            const data = await graphqlFetch<{ sendFriendRequest: FriendRequest }>(
                SEND_FRIEND_REQUEST_MUTATION,
                { userId }
            )
            return data.sendFriendRequest
        },
        onSuccess: () => {
            // Invalidate sent requests and search queries
            void queryClient.invalidateQueries({ queryKey: ["friends", "sent"] })
            void queryClient.invalidateQueries({ queryKey: ["friends", "search"] })
        },
    })

    // Accept friend request mutation
    const acceptMutation = useMutation({
        mutationKey: ["friends", "acceptRequest"] as const,
        mutationFn: async (requestId: string) => {
            const data = await graphqlFetch<{ acceptFriendRequest: Friendship }>(
                ACCEPT_FRIEND_REQUEST_MUTATION,
                { requestId }
            )
            return data.acceptFriendRequest
        },
        onSuccess: () => {
            // Invalidate pending requests and friends list
            void queryClient.invalidateQueries({ queryKey: ["friends", "pending"] })
            void queryClient.invalidateQueries({ queryKey: ["friends", "list"] })
        },
    })

    // Reject friend request mutation
    const rejectMutation = useMutation({
        mutationKey: ["friends", "rejectRequest"] as const,
        mutationFn: async (requestId: string) => {
            await graphqlFetch<{ rejectFriendRequest: boolean }>(REJECT_FRIEND_REQUEST_MUTATION, {
                requestId,
            })
            return true
        },
        onSuccess: () => {
            // Invalidate pending requests
            void queryClient.invalidateQueries({ queryKey: ["friends", "pending"] })
        },
    })

    // Cancel friend request mutation
    const cancelMutation = useMutation({
        mutationKey: ["friends", "cancelRequest"] as const,
        mutationFn: async (requestId: string) => {
            await graphqlFetch<{ cancelFriendRequest: boolean }>(CANCEL_FRIEND_REQUEST_MUTATION, {
                requestId,
            })
            return true
        },
        onSuccess: () => {
            // Invalidate sent requests
            void queryClient.invalidateQueries({ queryKey: ["friends", "sent"] })
        },
    })

    // Get pending mutations for optimistic UI (TanStack Query v5 pattern)
    const pendingMutations = useMutationState({
        filters: {
            status: "pending",
            mutationKey: ["friends"], // Matches all friend mutations
        },
    })

    // Combined loading state (any mutation pending)
    const loading =
        sendMutation.isPending ||
        acceptMutation.isPending ||
        rejectMutation.isPending ||
        cancelMutation.isPending ||
        pendingMutations.length > 0

    // Most recent error from any mutation
    const error =
        sendMutation.error ||
        acceptMutation.error ||
        rejectMutation.error ||
        cancelMutation.error ||
        null

    // Wrapper functions for type-safe API
    const sendRequest = async (userId: string): Promise<FriendRequest> => {
        return sendMutation.mutateAsync(userId)
    }

    const acceptRequest = async (requestId: string): Promise<Friendship> => {
        return acceptMutation.mutateAsync(requestId)
    }

    const rejectRequest = async (requestId: string): Promise<boolean> => {
        return rejectMutation.mutateAsync(requestId)
    }

    const cancelRequest = async (requestId: string): Promise<boolean> => {
        return cancelMutation.mutateAsync(requestId)
    }

    return {
        sendRequest,
        acceptRequest,
        rejectRequest,
        cancelRequest,
        loading,
        error,
    }
}
