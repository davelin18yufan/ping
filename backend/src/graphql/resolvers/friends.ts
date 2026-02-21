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
            include: {
                user1: true,
                user2: true,
            },
        })

        return friendships.map((f) => {
            const friend = f.userId1 === context.userId ? f.user2 : f.user1
            return {
                ...friend,
                emailVerified: toISO(friend.emailVerified),
                createdAt: friend.createdAt.toISOString(),
                updatedAt: friend.updatedAt.toISOString(),
            }
        })
    },

    /**
     * Get all PENDING friend requests received by the current user.
     * These are requests where the current user is NOT the requestedBy field.
     */
    pendingFriendRequests: async (
        _parent: unknown,
        _args: Record<string, never>,
        context: GraphQLContext
    ) => {
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
            include: {
                user1: true,
                user2: true,
                requester: true,
            },
        })

        return friendships.map((f) => {
            const sender = f.requester
            const receiver = f.userId1 === f.requestedBy ? f.user2 : f.user1
            return {
                id: f.id,
                status: f.status,
                createdAt: f.createdAt.toISOString(),
                updatedAt: f.updatedAt.toISOString(),
                sender: {
                    ...sender,
                    emailVerified: toISO(sender.emailVerified),
                    createdAt: sender.createdAt.toISOString(),
                    updatedAt: sender.updatedAt.toISOString(),
                },
                receiver: {
                    ...receiver,
                    emailVerified: toISO(receiver.emailVerified),
                    createdAt: receiver.createdAt.toISOString(),
                    updatedAt: receiver.updatedAt.toISOString(),
                },
            }
        })
    },

    /**
     * Get all PENDING friend requests sent by the current user.
     * These are requests where the current user IS the requestedBy field.
     */
    sentFriendRequests: async (
        _parent: unknown,
        _args: Record<string, never>,
        context: GraphQLContext
    ) => {
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
            include: {
                user1: true,
                user2: true,
                requester: true,
            },
        })

        return friendships.map((f) => {
            const sender = f.requester
            const receiver = f.userId1 === f.requestedBy ? f.user2 : f.user1
            return {
                id: f.id,
                status: f.status,
                createdAt: f.createdAt.toISOString(),
                updatedAt: f.updatedAt.toISOString(),
                sender: {
                    ...sender,
                    emailVerified: toISO(sender.emailVerified),
                    createdAt: sender.createdAt.toISOString(),
                    updatedAt: sender.updatedAt.toISOString(),
                },
                receiver: {
                    ...receiver,
                    emailVerified: toISO(receiver.emailVerified),
                    createdAt: receiver.createdAt.toISOString(),
                    updatedAt: receiver.updatedAt.toISOString(),
                },
            }
        })
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
    ) => {
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
            include: {
                user1: true,
                user2: true,
                requester: true,
            },
        })

        const sender = friendship.requester
        const receiver =
            friendship.userId1 === friendship.requestedBy ? friendship.user2 : friendship.user1

        return {
            id: friendship.id,
            status: friendship.status,
            createdAt: friendship.createdAt.toISOString(),
            updatedAt: friendship.updatedAt.toISOString(),
            sender: {
                ...sender,
                emailVerified: toISO(sender.emailVerified),
                createdAt: sender.createdAt.toISOString(),
                updatedAt: sender.updatedAt.toISOString(),
            },
            receiver: {
                ...receiver,
                emailVerified: toISO(receiver.emailVerified),
                createdAt: receiver.createdAt.toISOString(),
                updatedAt: receiver.updatedAt.toISOString(),
            },
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
    ) => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const friendship = await context.prisma.friendship.findUnique({
            where: { id: args.requestId },
            include: { user1: true, user2: true },
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
            include: { user1: true, user2: true },
        })

        const friend = updated.userId1 === context.userId ? updated.user2 : updated.user1

        return {
            id: updated.id,
            since: updated.updatedAt.toISOString(),
            friend: {
                ...friend,
                emailVerified: toISO(friend.emailVerified),
                createdAt: friend.createdAt.toISOString(),
                updatedAt: friend.updatedAt.toISOString(),
            },
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
 * Export all friends resolvers
 */
export const friendsResolvers = {
    Query,
    Mutation,
}
