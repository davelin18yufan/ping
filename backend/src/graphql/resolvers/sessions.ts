/**
 * Sessions Resolvers
 *
 * GraphQL resolvers for session management.
 * Implements:
 * - sessions: list all active (non-expired) sessions for the current user
 * - revokeSession: delete a specific session (cannot revoke current session)
 * - revokeAllSessions: delete all sessions except the current one
 */

import { GraphQLError } from "graphql"
import type { GraphQLContext } from "../context"

/**
 * Query Resolvers
 */
const Query = {
    /**
     * Get all active (non-expired) sessions for the current user.
     * Each session includes an isCurrent flag to identify the active session.
     */
    sessions: async (_parent: unknown, _args: Record<string, never>, context: GraphQLContext) => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        const now = new Date()

        const sessions = await context.prisma.session.findMany({
            where: {
                userId: context.userId,
                expires: { gt: now },
            },
            orderBy: { createdAt: "desc" },
        })

        return sessions.map((s) => ({
            id: s.id,
            userAgent: null,
            ipAddress: null,
            createdAt: s.createdAt.toISOString(),
            expiresAt: s.expires.toISOString(),
            isCurrent: s.id === context.sessionId,
        }))
    },
}

/**
 * Mutation Resolvers
 */
const Mutation = {
    /**
     * Revoke a specific session by ID.
     * Prevents revoking the current session (FORBIDDEN).
     * Returns true on success.
     */
    revokeSession: async (
        _parent: unknown,
        args: { sessionId: string },
        context: GraphQLContext
    ) => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        if (args.sessionId === context.sessionId) {
            throw new GraphQLError("Cannot revoke the current session", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const session = await context.prisma.session.findUnique({
            where: { id: args.sessionId },
        })

        if (!session) {
            throw new GraphQLError("Session not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        await context.prisma.session.delete({
            where: { id: args.sessionId },
        })

        return true
    },

    /**
     * Revoke all sessions except the current one.
     * Keeps the current session active.
     * Returns true on success.
     */
    revokeAllSessions: async (
        _parent: unknown,
        _args: Record<string, never>,
        context: GraphQLContext
    ) => {
        if (!context.isAuthenticated || !context.userId) {
            throw new GraphQLError("Not authenticated", {
                extensions: { code: "UNAUTHENTICATED", status: 401 },
            })
        }

        await context.prisma.session.deleteMany({
            where: {
                userId: context.userId,
                id: { not: context.sessionId ?? "" },
            },
        })

        return true
    },
}

/**
 * Export all sessions resolvers
 */
export const sessionsResolvers = {
    Query,
    Mutation,
}
