/**
 * Friends Resolvers
 *
 * GraphQL resolvers for friend search, friend requests, and friend management.
 * Implements:
 * - searchUsers: search users by name or email
 * - sendFriendRequest: create a PENDING friendship record
 * - acceptFriendRequest: receiver accepts a PENDING request
 * - rejectFriendRequest: receiver rejects a PENDING request
 * - cancelFriendRequest: sender cancels a PENDING request
 * - friends: list all ACCEPTED friendships for current user
 * - pendingFriendRequests: list PENDING requests received by current user
 * - sentFriendRequests: list PENDING requests sent by current user
 *
 * DataLoader pattern:
 *   Parent resolvers return raw IDs (senderId, receiverId, friendId).
 *   FriendRequest and Friendship type resolvers use context.loaders.user
 *   to batch-load User objects, preventing N+1 queries.
 */

import { GraphQLError } from "graphql"
import type { GraphQLContext } from "../context"

/**
 * Normalize friendship IDs to ensure userId1 < userId2 (string sort order).
 * This enforces the @@unique([userId1, userId2]) constraint.
 */
function normalizeFriendshipIds(idA: string, idB: string): { userId1: string; userId2: string } {
    return idA < idB ? { userId1: idA, userId2: idB } : { userId1: idB, userId2: idA }
}

/**
 * Serialize a Date (or null/undefined) to ISO string or null.
 */
function toISO(date: Date | null | undefined): string | null {
    return date ? date.toISOString() : null
}

// ---------------------------------------------------------------------------
// Internal shape returned by parent resolvers (before field resolution)
// ---------------------------------------------------------------------------

type FriendRequestParent = {
    id: string
    status: string
    createdAt: string
    updatedAt: string
    senderId: string
    receiverId: string
}

type FriendshipParent = {
    id: string
    since: string
    friendId: string
}

/**
 * Query Resolvers
 */
const Query = {
    /**
     * Search users by name or email.
     * Excludes the current user. Returns at most 20 results.
     * Returns an empty array if query is shorter than 2 characters.
     */
    searchUsers: async (_parent: unknown, args: { query: string }, context: GraphQLContext) => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const { query } = args
        if (query.trim().length < 2) {
            return []
        }

        const users = await context.prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: context.userId } },
                    {
                        OR: [
                            { name: { contains: query, mode: "insensitive" } },
                            { email: { contains: query, mode: "insensitive" } },
                        ],
                    },
                ],
            },
            take: 20,
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return users.map((u) => ({
            ...u,
            emailVerified: toISO(u.emailVerified),
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
        }))
    },

    /**
     * Get all ACCEPTED friends for the current user.
     * Returns the other party in each accepted friendship.
     */
    friends: async (_parent: unknown, _args: Record<string, never>, context: GraphQLContext) => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const friendships = await context.prisma.friendship.findMany({
            where: {
                status: "ACCEPTED",
                OR: [{ userId1: context.userId }, { userId2: context.userId }],
            },
            select: {
                userId1: true,
                userId2: true,
            },
        })

        // Collect the IDs of the other party in each friendship
        const friendIds = friendships.map((f) =>
            f.userId1 === context.userId ? f.userId2 : f.userId1
        )

        // Batch-load all friend User records in a single query via DataLoader
        const users = await Promise.all(friendIds.map((id) => context.loaders.user.load(id)))

        return users.filter(Boolean)
    },

    /**
     * Get all PENDING friend requests received by the current user.
     * These are requests where the current user is NOT the requestedBy field.
     */
    pendingFriendRequests: async (
        _parent: unknown,
        _args: Record<string, never>,
        context: GraphQLContext
    ): Promise<FriendRequestParent[]> => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const friendships = await context.prisma.friendship.findMany({
            where: {
                status: "PENDING",
                requestedBy: { not: context.userId },
                OR: [{ userId1: context.userId }, { userId2: context.userId }],
            },
            select: {
                id: true,
                status: true,
                requestedBy: true,
                userId1: true,
                userId2: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return friendships.map((f) => ({
            id: f.id,
            status: f.status,
            createdAt: f.createdAt.toISOString(),
            updatedAt: f.updatedAt.toISOString(),
            senderId: f.requestedBy,
            receiverId: f.userId1 === f.requestedBy ? f.userId2 : f.userId1,
        }))
    },

    /**
     * Get all PENDING friend requests sent by the current user.
     * These are requests where the current user IS the requestedBy field.
     */
    sentFriendRequests: async (
        _parent: unknown,
        _args: Record<string, never>,
        context: GraphQLContext
    ): Promise<FriendRequestParent[]> => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const friendships = await context.prisma.friendship.findMany({
            where: {
                status: "PENDING",
                requestedBy: context.userId,
            },
            select: {
                id: true,
                status: true,
                requestedBy: true,
                userId1: true,
                userId2: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return friendships.map((f) => ({
            id: f.id,
            status: f.status,
            createdAt: f.createdAt.toISOString(),
            updatedAt: f.updatedAt.toISOString(),
            senderId: f.requestedBy,
            receiverId: f.userId1 === f.requestedBy ? f.userId2 : f.userId1,
        }))
    },
}

/**
 * Mutation Resolvers
 */
const Mutation = {
    /**
     * Send a friend request to another user.
     * Guards against self-requests (400) and duplicate requests (409).
     */
    sendFriendRequest: async (
        _parent: unknown,
        args: { userId: string },
        context: GraphQLContext
    ): Promise<FriendRequestParent> => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const { userId: targetUserId } = args

        if (targetUserId === context.userId) {
            throw new GraphQLError("Cannot send friend request to yourself", {
                extensions: { code: "BAD_REQUEST", status: 400 },
            })
        }

        const { userId1, userId2 } = normalizeFriendshipIds(context.userId, targetUserId)

        const existing = await context.prisma.friendship.findUnique({
            where: { userId1_userId2: { userId1, userId2 } },
        })

        if (existing) {
            throw new GraphQLError("Friend request already exists", {
                extensions: { code: "CONFLICT", status: 409 },
            })
        }

        const friendship = await context.prisma.friendship.create({
            data: {
                userId1,
                userId2,
                status: "PENDING",
                requestedBy: context.userId,
            },
            select: {
                id: true,
                status: true,
                requestedBy: true,
                userId1: true,
                userId2: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return {
            id: friendship.id,
            status: friendship.status,
            createdAt: friendship.createdAt.toISOString(),
            updatedAt: friendship.updatedAt.toISOString(),
            senderId: friendship.requestedBy,
            receiverId:
                friendship.userId1 === friendship.requestedBy
                    ? friendship.userId2
                    : friendship.userId1,
        }
    },

    /**
     * Accept a pending friend request.
     * Only the receiver (not the requester) may accept.
     * Returns a Friendship object with the friend and the acceptance timestamp.
     */
    acceptFriendRequest: async (
        _parent: unknown,
        args: { requestId: string },
        context: GraphQLContext
    ): Promise<FriendshipParent> => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const friendship = await context.prisma.friendship.findUnique({
            where: { id: args.requestId },
            select: { id: true, requestedBy: true, userId1: true, userId2: true },
        })

        if (!friendship) {
            throw new GraphQLError("Friend request not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        if (friendship.requestedBy === context.userId) {
            throw new GraphQLError("Cannot accept your own friend request", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const updated = await context.prisma.friendship.update({
            where: { id: args.requestId },
            data: { status: "ACCEPTED" },
            select: { id: true, userId1: true, userId2: true, updatedAt: true },
        })

        return {
            id: updated.id,
            since: updated.updatedAt.toISOString(),
            friendId: updated.userId1 === context.userId ? updated.userId2 : updated.userId1,
        }
    },

    /**
     * Reject a pending friend request.
     * Only the receiver (not the requester) may reject.
     * Sets status to REJECTED and returns true.
     */
    rejectFriendRequest: async (
        _parent: unknown,
        args: { requestId: string },
        context: GraphQLContext
    ) => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const friendship = await context.prisma.friendship.findUnique({
            where: { id: args.requestId },
            select: { requestedBy: true },
        })

        if (!friendship) {
            throw new GraphQLError("Friend request not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        if (friendship.requestedBy === context.userId) {
            throw new GraphQLError("Cannot reject your own friend request", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        await context.prisma.friendship.update({
            where: { id: args.requestId },
            data: { status: "REJECTED" },
        })

        return true
    },

    /**
     * Cancel a pending friend request.
     * Only the original sender (requestedBy) may cancel.
     * Deletes the record and returns true.
     */
    cancelFriendRequest: async (
        _parent: unknown,
        args: { requestId: string },
        context: GraphQLContext
    ) => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const friendship = await context.prisma.friendship.findUnique({
            where: { id: args.requestId },
            select: { requestedBy: true },
        })

        if (!friendship) {
            throw new GraphQLError("Friend request not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        if (friendship.requestedBy !== context.userId) {
            throw new GraphQLError("Only the sender can cancel a friend request", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        await context.prisma.friendship.delete({
            where: { id: args.requestId },
        })

        return true
    },
}

/**
 * Type Resolvers for FriendRequest
 *
 * These field resolvers use DataLoader to batch-load User objects.
 * Without DataLoader, resolving N FriendRequests would fire N separate
 * user queries. DataLoader coalesces all load() calls in one event loop
 * tick into a single SELECT ... WHERE id IN (...).
 */
const FriendRequest = {
    sender: (parent: FriendRequestParent, _args: unknown, context: GraphQLContext) =>
        context.loaders.user.load(parent.senderId),

    receiver: (parent: FriendRequestParent, _args: unknown, context: GraphQLContext) =>
        context.loaders.user.load(parent.receiverId),
}

/**
 * Type Resolvers for Friendship
 */
const Friendship = {
    friend: (parent: FriendshipParent, _args: unknown, context: GraphQLContext) =>
        context.loaders.user.load(parent.friendId),
}

/**
 * Export all friends resolvers
 */
export const friendsResolvers = {
    Query,
    Mutation,
    FriendRequest,
    Friendship,
}
