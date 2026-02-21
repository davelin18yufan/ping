/**
 * Shared Types for Friends Feature
 * Used across queries, components, and tests
 */

export interface User {
    id: string
    name: string
    email: string
    image: string | null
}

export interface FriendRequest {
    id: string
    status: "PENDING" | "ACCEPTED" | "REJECTED"
    createdAt: string
    updatedAt: string
    sender: User
    receiver: User
}

export interface Friendship {
    id: string
    friend: User
    since: string
}

export type FriendshipStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED"
