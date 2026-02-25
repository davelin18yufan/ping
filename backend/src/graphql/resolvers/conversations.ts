/**
 * Conversations Resolvers
 *
 * GraphQL resolvers for conversation management, group chats, and blacklist.
 * Implements:
 * - conversations: list all conversations for current user
 * - conversation(id): get a single conversation
 * - messages(conversationId, cursor, limit): paginated message history
 * - blacklist: list blocked users
 * - getOrCreateConversation: idempotent 1-on-1 conversation creation
 * - createGroupConversation: create a group with creator as OWNER
 * - inviteToGroup: invite a friend to a group
 * - removeFromGroup: kick a member from a group
 * - leaveGroup: leave a group with optional ownership transfer
 * - updateGroupSettings: update group name and permission settings
 * - pinConversation / unpinConversation: toggle pinned status
 * - sendMessage: send a text message and broadcast via Socket.io
 * - markMessagesAsRead: mark all messages in a conversation as read
 * - blockUser: block a user and remove friendship
 * - unblockUser: remove a block record
 */

import { GraphQLError } from "graphql"
import type { GraphQLContext } from "../context"
import type { ParticipantRecord, ConversationParent, MessageRecord } from "../types"
import {
    requireAuth,
    getParticipant,
    parseMessageCursor,
    makeMessageCursor,
    asMessageCursor,
} from "./utils"
import { getIO } from "@/socket"

type MessageParent = MessageRecord

// Raw shape returned by Prisma message.findMany select in the messages resolver
type RawMessageRow = {
    id: string
    conversationId: string
    senderId: string
    content: string | null
    messageType: string
    imageUrl: string | null
    createdAt: Date
}

function toMessageParent(m: RawMessageRow): MessageParent {
    return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        messageType: m.messageType as "TEXT" | "IMAGE",
        imageUrl: m.imageUrl,
        createdAt: m.createdAt.toISOString(),
        status: "SENT",
    }
}

// ---------------------------------------------------------------------------
// Query Resolvers
// ---------------------------------------------------------------------------

const Query = {
    /**
     * Get all conversations for the current user.
     * Sorted: pinnedAt DESC (pinned first), then by latest message time DESC.
     */
    conversations: async (
        _parent: unknown,
        _args: Record<string, never>,
        context: GraphQLContext
    ): Promise<ConversationParent[]> => {
        const userId = requireAuth(context)

        const participants = await context.prisma.conversationParticipant.findMany({
            where: { userId },
            select: {
                conversationId: true,
                conversation: {
                    select: {
                        id: true,
                        type: true,
                        name: true,
                        pinnedAt: true,
                        onlyOwnerCanInvite: true,
                        onlyOwnerCanKick: true,
                        onlyOwnerCanEdit: true,
                        createdAt: true,
                        messages: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                            select: { createdAt: true },
                        },
                    },
                },
            },
        })

        // Sort: pinned first (by pinnedAt desc), then by last message time desc
        const conversations = participants.map((p) => p.conversation)
        conversations.sort((a, b) => {
            if (a.pinnedAt && !b.pinnedAt) return -1
            if (!a.pinnedAt && b.pinnedAt) return 1
            if (a.pinnedAt && b.pinnedAt) {
                return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime()
            }
            const aTime = a.messages[0]?.createdAt.getTime() ?? a.createdAt.getTime()
            const bTime = b.messages[0]?.createdAt.getTime() ?? b.createdAt.getTime()
            return bTime - aTime
        })

        return conversations.map((c) => ({
            id: c.id,
            type: c.type as "ONE_TO_ONE" | "GROUP",
            name: c.name,
            pinnedAt: c.pinnedAt ? c.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: c.onlyOwnerCanInvite,
            onlyOwnerCanKick: c.onlyOwnerCanKick,
            onlyOwnerCanEdit: c.onlyOwnerCanEdit,
            createdAt: c.createdAt.toISOString(),
        }))
    },

    /**
     * Get a single conversation by ID.
     * Returns FORBIDDEN if the current user is not a participant.
     */
    conversation: async (
        _parent: unknown,
        args: { id: string },
        context: GraphQLContext
    ): Promise<ConversationParent | null> => {
        const userId = requireAuth(context)

        const participant = await getParticipant(context.prisma, args.id, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const conv = await context.prisma.conversation.findUnique({
            where: { id: args.id },
        })
        if (!conv) return null

        return {
            id: conv.id,
            type: conv.type as "ONE_TO_ONE" | "GROUP",
            name: conv.name,
            pinnedAt: conv.pinnedAt ? conv.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: conv.onlyOwnerCanInvite,
            onlyOwnerCanKick: conv.onlyOwnerCanKick,
            onlyOwnerCanEdit: conv.onlyOwnerCanEdit,
            createdAt: conv.createdAt.toISOString(),
        }
    },

    /**
     * Get paginated messages for a conversation.
     *
     * Cursor format: "${ISO timestamp}_${messageId}"
     *
     * Two directions:
     *   before / cursor (scroll up): fetch messages OLDER than the cursor.
     *     Results are ordered newest-first. nextCursor points at the oldest
     *     message so the client can continue scrolling up.
     *
     *   after (reconnect catch-up): fetch messages NEWER than the cursor.
     *     Results are ordered oldest-first so the client can append them in
     *     chronological order. prevCursor points at the newest message for
     *     a subsequent after query.
     *
     * Default limit: 20, Max: 50.
     */
    messages: async (
        _parent: unknown,
        args: {
            conversationId: string
            cursor?: string
            before?: string
            after?: string
            limit?: number
        },
        context: GraphQLContext
    ): Promise<{
        messages: MessageParent[]
        nextCursor: string | null
        prevCursor: string | null
    }> => {
        const userId = requireAuth(context)

        const participant = await getParticipant(context.prisma, args.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const limit = Math.min(args.limit ?? 20, 50)

        // `before` takes precedence over the legacy `cursor` alias
        const beforeCursor = args.before ?? args.cursor ?? null
        const afterCursor = args.after ?? null

        let whereFilter: Record<string, unknown> = { conversationId: args.conversationId }
        let orderDir: "asc" | "desc" = "desc"

        if (afterCursor) {
            // Forward pagination: messages NEWER than the cursor
            const { createdAt, id } = parseMessageCursor(asMessageCursor(afterCursor))
            whereFilter = {
                conversationId: args.conversationId,
                OR: [{ createdAt: { gt: createdAt } }, { createdAt: createdAt, id: { gt: id } }],
            }
            orderDir = "asc"
        } else if (beforeCursor) {
            // Backward pagination: messages OLDER than the cursor
            const { createdAt, id } = parseMessageCursor(asMessageCursor(beforeCursor))
            whereFilter = {
                conversationId: args.conversationId,
                OR: [{ createdAt: { lt: createdAt } }, { createdAt: createdAt, id: { lt: id } }],
            }
        }

        // Fetch limit+1 to determine if there's another page
        const rawMessages = await context.prisma.message.findMany({
            where: whereFilter,
            orderBy: [{ createdAt: orderDir }, { id: orderDir }],
            take: limit + 1,
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                content: true,
                messageType: true,
                imageUrl: true,
                createdAt: true,
            },
        })

        const hasMore = rawMessages.length > limit
        const messages = rawMessages.slice(0, limit)

        if (afterCursor) {
            // Results are ASC: first is oldest, last is newest
            const newestMsg = messages[messages.length - 1]
            return {
                messages: messages.map(toMessageParent),
                nextCursor: null,
                prevCursor:
                    hasMore && newestMsg
                        ? makeMessageCursor(newestMsg.createdAt, newestMsg.id)
                        : null,
            }
        }

        // Results are DESC: first is newest, last is oldest
        const oldestMsg = messages[messages.length - 1]
        const newestMsg = messages[0]
        return {
            messages: messages.map(toMessageParent),
            nextCursor:
                hasMore && oldestMsg ? makeMessageCursor(oldestMsg.createdAt, oldestMsg.id) : null,
            prevCursor: newestMsg ? makeMessageCursor(newestMsg.createdAt, newestMsg.id) : null,
        }
    },

    /**
     * Get all users blocked by the current user.
     */
    blacklist: async (_parent: unknown, _args: Record<string, never>, context: GraphQLContext) => {
        const userId = requireAuth(context)

        const blocks = await context.prisma.blacklist.findMany({
            where: { blockerId: userId },
            select: { blockedId: true },
        })

        const blockedUsers = await Promise.all(
            blocks.map((b) => context.loaders.user.load(b.blockedId))
        )

        return blockedUsers.filter(Boolean)
    },
}

// ---------------------------------------------------------------------------
// Mutation Resolvers
// ---------------------------------------------------------------------------

const Mutation = {
    /**
     * Get or create a 1-on-1 conversation with the specified user.
     * Both users must be ACCEPTED friends. Idempotent.
     */
    getOrCreateConversation: async (
        _parent: unknown,
        args: { userId: string },
        context: GraphQLContext
    ): Promise<ConversationParent> => {
        const myId = requireAuth(context)

        // Verify friendship
        const [u1, u2] = myId < args.userId ? [myId, args.userId] : [args.userId, myId]
        const friendship = await context.prisma.friendship.findUnique({
            where: { userId1_userId2: { userId1: u1, userId2: u2 } },
        })

        if (!friendship || friendship.status !== "ACCEPTED") {
            throw new GraphQLError("Must be friends to start a conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check for existing ONE_TO_ONE conversation between these two users
        const existing = await context.prisma.conversation.findFirst({
            where: {
                type: "ONE_TO_ONE",
                AND: [
                    { participants: { some: { userId: myId } } },
                    { participants: { some: { userId: args.userId } } },
                ],
            },
        })

        if (existing) {
            return {
                id: existing.id,
                type: "ONE_TO_ONE",
                name: existing.name,
                pinnedAt: existing.pinnedAt ? existing.pinnedAt.toISOString() : null,
                onlyOwnerCanInvite: existing.onlyOwnerCanInvite,
                onlyOwnerCanKick: existing.onlyOwnerCanKick,
                onlyOwnerCanEdit: existing.onlyOwnerCanEdit,
                createdAt: existing.createdAt.toISOString(),
            }
        }

        // Create new conversation with both participants
        const conv = await context.prisma.conversation.create({
            data: {
                type: "ONE_TO_ONE",
                participants: {
                    create: [
                        { userId: myId, role: "MEMBER" },
                        { userId: args.userId, role: "MEMBER" },
                    ],
                },
            },
        })

        return {
            id: conv.id,
            type: "ONE_TO_ONE",
            name: conv.name,
            pinnedAt: conv.pinnedAt ? conv.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: conv.onlyOwnerCanInvite,
            onlyOwnerCanKick: conv.onlyOwnerCanKick,
            onlyOwnerCanEdit: conv.onlyOwnerCanEdit,
            createdAt: conv.createdAt.toISOString(),
        }
    },

    /**
     * Create a new group conversation.
     * All userIds must be ACCEPTED friends of the current user (Creator).
     * Creator is assigned OWNER role.
     */
    createGroupConversation: async (
        _parent: unknown,
        args: { name: string; userIds: string[] },
        context: GraphQLContext
    ): Promise<ConversationParent> => {
        const myId = requireAuth(context)

        if (args.userIds.length === 0) {
            throw new GraphQLError("Must invite at least one user to create a group", {
                extensions: { code: "BAD_REQUEST", status: 400 },
            })
        }

        // Verify all invited users are friends of creator
        for (const targetId of args.userIds) {
            const [u1, u2] = myId < targetId ? [myId, targetId] : [targetId, myId]
            const friendship = await context.prisma.friendship.findUnique({
                where: { userId1_userId2: { userId1: u1, userId2: u2 } },
            })

            if (!friendship || friendship.status !== "ACCEPTED") {
                throw new GraphQLError(
                    `User ${targetId} is not your friend. Only friends can be added to a group.`,
                    { extensions: { code: "FORBIDDEN", status: 403 } }
                )
            }
        }

        // Create group conversation
        const conv = await context.prisma.conversation.create({
            data: {
                type: "GROUP",
                name: args.name,
                participants: {
                    create: [
                        { userId: myId, role: "OWNER" },
                        ...args.userIds.map((uid) => ({ userId: uid, role: "MEMBER" as const })),
                    ],
                },
            },
        })

        return {
            id: conv.id,
            type: "GROUP",
            name: conv.name,
            pinnedAt: null,
            onlyOwnerCanInvite: conv.onlyOwnerCanInvite,
            onlyOwnerCanKick: conv.onlyOwnerCanKick,
            onlyOwnerCanEdit: conv.onlyOwnerCanEdit,
            createdAt: conv.createdAt.toISOString(),
        }
    },

    /**
     * Invite a user to a group conversation.
     * The inviting user must be a participant.
     * The invited user must be a friend of the inviting user.
     * Respects onlyOwnerCanInvite setting.
     */
    inviteToGroup: async (
        _parent: unknown,
        args: { conversationId: string; userId: string },
        context: GraphQLContext
    ): Promise<ConversationParent> => {
        const myId = requireAuth(context)

        const conv = await context.prisma.conversation.findUnique({
            where: { id: args.conversationId },
        })

        if (!conv) {
            throw new GraphQLError("Conversation not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        if (conv.type !== "GROUP") {
            throw new GraphQLError("Cannot invite to a non-group conversation", {
                extensions: { code: "BAD_REQUEST", status: 400 },
            })
        }

        // Check if inviter is a participant
        const inviterParticipant = await getParticipant(context.prisma, args.conversationId, myId)
        if (!inviterParticipant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check onlyOwnerCanInvite permission
        if (conv.onlyOwnerCanInvite && inviterParticipant.role !== "OWNER") {
            throw new GraphQLError("Only the group owner can invite members", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check invited user is a friend of the inviter
        const [u1, u2] = myId < args.userId ? [myId, args.userId] : [args.userId, myId]
        const friendship = await context.prisma.friendship.findUnique({
            where: { userId1_userId2: { userId1: u1, userId2: u2 } },
        })

        if (!friendship || friendship.status !== "ACCEPTED") {
            throw new GraphQLError("You can only invite your friends to a group", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check if user is already in the group
        const alreadyIn = await getParticipant(context.prisma, args.conversationId, args.userId)
        if (alreadyIn) {
            throw new GraphQLError("User is already a member of this conversation", {
                extensions: { code: "BAD_REQUEST", status: 400 },
            })
        }

        // Add to group
        await context.prisma.conversationParticipant.create({
            data: {
                conversationId: args.conversationId,
                userId: args.userId,
                role: "MEMBER",
            },
        })

        // Notify via Socket.io
        try {
            const io = getIO()
            io.to(args.conversationId).emit("participant:changed", {
                conversationId: args.conversationId,
                action: "joined",
                userId: args.userId,
            })
        } catch {
            // Socket.io may not be initialized in test environment — non-fatal
        }

        return {
            id: conv.id,
            type: "GROUP",
            name: conv.name,
            pinnedAt: conv.pinnedAt ? conv.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: conv.onlyOwnerCanInvite,
            onlyOwnerCanKick: conv.onlyOwnerCanKick,
            onlyOwnerCanEdit: conv.onlyOwnerCanEdit,
            createdAt: conv.createdAt.toISOString(),
        }
    },

    /**
     * Remove a participant from a group conversation.
     * Cannot remove the OWNER. Respects onlyOwnerCanKick setting.
     */
    removeFromGroup: async (
        _parent: unknown,
        args: { conversationId: string; userId: string },
        context: GraphQLContext
    ): Promise<boolean> => {
        const myId = requireAuth(context)

        const conv = await context.prisma.conversation.findUnique({
            where: { id: args.conversationId },
        })

        if (!conv || conv.type !== "GROUP") {
            throw new GraphQLError("Group conversation not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        // Check if remover is a participant
        const removerParticipant = await getParticipant(context.prisma, args.conversationId, myId)
        if (!removerParticipant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check onlyOwnerCanKick permission
        if (conv.onlyOwnerCanKick && removerParticipant.role !== "OWNER") {
            throw new GraphQLError("Only the group owner can remove members", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check target participant
        const targetParticipant = await getParticipant(
            context.prisma,
            args.conversationId,
            args.userId
        )
        if (!targetParticipant) {
            throw new GraphQLError("Target user is not a participant", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        // Cannot kick the OWNER
        if (targetParticipant.role === "OWNER") {
            throw new GraphQLError("Cannot remove the group owner", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        await context.prisma.conversationParticipant.delete({
            where: {
                conversationId_userId: {
                    conversationId: args.conversationId,
                    userId: args.userId,
                },
            },
        })

        // Notify via Socket.io
        try {
            const io = getIO()
            io.to(args.conversationId).emit("participant:changed", {
                conversationId: args.conversationId,
                action: "removed",
                userId: args.userId,
            })
        } catch {
            // Non-fatal in test environment
        }

        return true
    },

    /**
     * Leave a group conversation.
     * If OWNER with other members: successorUserId required.
     * If OWNER is last member: group dissolved.
     * If MEMBER: direct leave.
     */
    leaveGroup: async (
        _parent: unknown,
        args: { conversationId: string; successorUserId?: string | null },
        context: GraphQLContext
    ): Promise<boolean> => {
        const myId = requireAuth(context)

        const conv = await context.prisma.conversation.findUnique({
            where: { id: args.conversationId },
        })

        if (!conv || conv.type !== "GROUP") {
            throw new GraphQLError("Group conversation not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        const myParticipant = await getParticipant(context.prisma, args.conversationId, myId)
        if (!myParticipant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Count other participants
        const otherCount = await context.prisma.conversationParticipant.count({
            where: {
                conversationId: args.conversationId,
                userId: { not: myId },
            },
        })

        if (myParticipant.role === "OWNER") {
            if (otherCount === 0) {
                // Last member: dissolve the group (cascade deletes participants + messages)
                await context.prisma.conversation.delete({
                    where: { id: args.conversationId },
                })
                return true
            }

            // Owner with other members: must provide successorUserId
            if (!args.successorUserId) {
                throw new GraphQLError("You must choose a successor before leaving the group", {
                    extensions: { code: "BAD_REQUEST", status: 400 },
                })
            }

            // Verify successor is in the group
            const successor = await getParticipant(
                context.prisma,
                args.conversationId,
                args.successorUserId
            )
            if (!successor) {
                throw new GraphQLError("Successor is not a participant of this group", {
                    extensions: { code: "BAD_REQUEST", status: 400 },
                })
            }

            // Transfer ownership and leave in a transaction
            await context.prisma.$transaction([
                context.prisma.conversationParticipant.update({
                    where: {
                        conversationId_userId: {
                            conversationId: args.conversationId,
                            userId: args.successorUserId,
                        },
                    },
                    data: { role: "OWNER" },
                }),
                context.prisma.conversationParticipant.delete({
                    where: {
                        conversationId_userId: {
                            conversationId: args.conversationId,
                            userId: myId,
                        },
                    },
                }),
            ])
        } else {
            // Regular member: just leave
            await context.prisma.conversationParticipant.delete({
                where: {
                    conversationId_userId: {
                        conversationId: args.conversationId,
                        userId: myId,
                    },
                },
            })
        }

        // Notify via Socket.io
        try {
            const io = getIO()
            io.to(args.conversationId).emit("participant:changed", {
                conversationId: args.conversationId,
                action: "left",
                userId: myId,
            })
        } catch {
            // Non-fatal in test environment
        }

        return true
    },

    /**
     * Update group conversation name and/or permission settings.
     * Returns BAD_REQUEST for ONE_TO_ONE conversations.
     * Respects onlyOwnerCanEdit setting.
     */
    updateGroupSettings: async (
        _parent: unknown,
        args: {
            conversationId: string
            name?: string | null
            settings?: {
                onlyOwnerCanInvite?: boolean | null
                onlyOwnerCanKick?: boolean | null
                onlyOwnerCanEdit?: boolean | null
            } | null
        },
        context: GraphQLContext
    ): Promise<ConversationParent> => {
        const myId = requireAuth(context)

        const conv = await context.prisma.conversation.findUnique({
            where: { id: args.conversationId },
        })

        if (!conv) {
            throw new GraphQLError("Conversation not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        if (conv.type !== "GROUP") {
            throw new GraphQLError("Cannot update settings of a non-group conversation", {
                extensions: { code: "BAD_REQUEST", status: 400 },
            })
        }

        const myParticipant = await getParticipant(context.prisma, args.conversationId, myId)
        if (!myParticipant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check edit permission
        if (conv.onlyOwnerCanEdit && myParticipant.role !== "OWNER") {
            throw new GraphQLError("Only the group owner can edit group settings", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const updateData: {
            name?: string
            onlyOwnerCanInvite?: boolean
            onlyOwnerCanKick?: boolean
            onlyOwnerCanEdit?: boolean
        } = {}

        if (args.name !== null && args.name !== undefined) updateData.name = args.name
        if (
            args.settings?.onlyOwnerCanInvite !== null &&
            args.settings?.onlyOwnerCanInvite !== undefined
        )
            updateData.onlyOwnerCanInvite = args.settings.onlyOwnerCanInvite
        if (
            args.settings?.onlyOwnerCanKick !== null &&
            args.settings?.onlyOwnerCanKick !== undefined
        )
            updateData.onlyOwnerCanKick = args.settings.onlyOwnerCanKick
        if (
            args.settings?.onlyOwnerCanEdit !== null &&
            args.settings?.onlyOwnerCanEdit !== undefined
        )
            updateData.onlyOwnerCanEdit = args.settings.onlyOwnerCanEdit

        const updated = await context.prisma.conversation.update({
            where: { id: args.conversationId },
            data: updateData,
        })

        return {
            id: updated.id,
            type: "GROUP",
            name: updated.name,
            pinnedAt: updated.pinnedAt ? updated.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: updated.onlyOwnerCanInvite,
            onlyOwnerCanKick: updated.onlyOwnerCanKick,
            onlyOwnerCanEdit: updated.onlyOwnerCanEdit,
            createdAt: updated.createdAt.toISOString(),
        }
    },

    /**
     * Pin a conversation (sets pinnedAt to now).
     */
    pinConversation: async (
        _parent: unknown,
        args: { conversationId: string },
        context: GraphQLContext
    ): Promise<boolean> => {
        const userId = requireAuth(context)

        const participant = await getParticipant(context.prisma, args.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        await context.prisma.conversation.update({
            where: { id: args.conversationId },
            data: { pinnedAt: new Date() },
        })

        return true
    },

    /**
     * Unpin a conversation (sets pinnedAt to null).
     */
    unpinConversation: async (
        _parent: unknown,
        args: { conversationId: string },
        context: GraphQLContext
    ): Promise<boolean> => {
        const userId = requireAuth(context)

        const participant = await getParticipant(context.prisma, args.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        await context.prisma.conversation.update({
            where: { id: args.conversationId },
            data: { pinnedAt: null },
        })

        return true
    },

    /**
     * Send a text message to a conversation.
     * Broadcasts message:new via Socket.io.
     */
    sendMessage: async (
        _parent: unknown,
        args: { conversationId: string; content: string },
        context: GraphQLContext
    ): Promise<MessageParent> => {
        const userId = requireAuth(context)

        const participant = await getParticipant(context.prisma, args.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const message = await context.prisma.message.create({
            data: {
                conversationId: args.conversationId,
                senderId: userId,
                content: args.content,
                messageType: "TEXT",
            },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                content: true,
                messageType: true,
                imageUrl: true,
                createdAt: true,
            },
        })

        const messageParent: MessageParent = {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            content: message.content,
            messageType: message.messageType as "TEXT" | "IMAGE",
            imageUrl: message.imageUrl,
            createdAt: message.createdAt.toISOString(),
            status: "SENT",
        }

        // Broadcast via Socket.io (non-fatal if not initialized)
        try {
            const io = getIO()
            io.to(args.conversationId).emit("message:new", {
                message: messageParent,
                conversationId: args.conversationId,
            })
        } catch {
            // Non-fatal in test environment
        }

        return messageParent
    },

    /**
     * Mark all messages in a conversation as READ for the current user.
     * Updates lastReadAt for the participant record.
     */
    markMessagesAsRead: async (
        _parent: unknown,
        args: { conversationId: string },
        context: GraphQLContext
    ): Promise<boolean> => {
        const userId = requireAuth(context)

        const participant = await getParticipant(context.prisma, args.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        await context.prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId: args.conversationId,
                    userId,
                },
            },
            data: { lastReadAt: new Date() },
        })

        return true
    },

    /**
     * Block a user. Removes any existing friendship automatically.
     */
    blockUser: async (
        _parent: unknown,
        args: { userId: string },
        context: GraphQLContext
    ): Promise<boolean> => {
        const myId = requireAuth(context)

        if (args.userId === myId) {
            throw new GraphQLError("Cannot block yourself", {
                extensions: { code: "BAD_REQUEST", status: 400 },
            })
        }

        // Create blacklist record (upsert to be idempotent)
        await context.prisma.blacklist.upsert({
            where: { blockerId_blockedId: { blockerId: myId, blockedId: args.userId } },
            create: { blockerId: myId, blockedId: args.userId },
            update: {},
        })

        // Remove friendship if it exists
        const [u1, u2] = myId < args.userId ? [myId, args.userId] : [args.userId, myId]
        await context.prisma.friendship.deleteMany({
            where: { userId1: u1, userId2: u2 },
        })

        return true
    },

    /**
     * Unblock a previously blocked user.
     */
    unblockUser: async (
        _parent: unknown,
        args: { userId: string },
        context: GraphQLContext
    ): Promise<boolean> => {
        const myId = requireAuth(context)

        const block = await context.prisma.blacklist.findUnique({
            where: { blockerId_blockedId: { blockerId: myId, blockedId: args.userId } },
        })

        if (!block) {
            throw new GraphQLError("Block record not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        await context.prisma.blacklist.delete({
            where: { blockerId_blockedId: { blockerId: myId, blockedId: args.userId } },
        })

        return true
    },
}

// ---------------------------------------------------------------------------
// Type-level Resolvers
// ---------------------------------------------------------------------------

/**
 * Conversation type resolvers
 * Uses DataLoaders for participants and lastMessage to prevent N+1 queries.
 */
const Conversation = {
    participants: (parent: ConversationParent, _args: unknown, context: GraphQLContext) =>
        context.loaders.participants.load(parent.id),

    lastMessage: (parent: ConversationParent, _args: unknown, context: GraphQLContext) =>
        context.loaders.lastMessage.load(parent.id),

    unreadCount: async (
        parent: ConversationParent,
        _args: unknown,
        context: GraphQLContext
    ): Promise<number> => {
        if (!context.userId) return 0

        const participant = await context.prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: parent.id,
                    userId: context.userId,
                },
            },
            select: { lastReadAt: true },
        })

        if (!participant) return 0

        if (!participant.lastReadAt) {
            // Never read: count all messages not sent by current user
            return context.prisma.message.count({
                where: {
                    conversationId: parent.id,
                    senderId: { not: context.userId },
                },
            })
        }

        return context.prisma.message.count({
            where: {
                conversationId: parent.id,
                createdAt: { gt: participant.lastReadAt },
                senderId: { not: context.userId },
            },
        })
    },

    settings: (parent: ConversationParent) => {
        if (parent.type !== "GROUP") return null
        return {
            onlyOwnerCanInvite: parent.onlyOwnerCanInvite,
            onlyOwnerCanKick: parent.onlyOwnerCanKick,
            onlyOwnerCanEdit: parent.onlyOwnerCanEdit,
        }
    },
}

/**
 * ConversationParticipant type resolvers
 * Uses DataLoaders for user and isFriend.
 */
const ConversationParticipant = {
    user: (parent: ParticipantRecord, _args: unknown, context: GraphQLContext) =>
        context.loaders.user.load(parent.userId),

    isFriend: (parent: ParticipantRecord, _args: unknown, context: GraphQLContext) => {
        if (!context.userId || parent.userId === context.userId) return false
        return context.loaders.friendshipStatus.load(parent.userId)
    },
}

/**
 * Message type resolvers
 */
const Message = {
    sender: (parent: MessageParent, _args: unknown, context: GraphQLContext) =>
        context.loaders.user.load(parent.senderId),
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const conversationsResolvers = {
    Query,
    Mutation,
    Conversation,
    ConversationParticipant,
    Message,
}
