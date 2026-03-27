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
import type {
    ParticipantRecord,
    ConversationParent,
    MessageRecord,
    RitualLabelRecord,
    ReplyToRecord,
} from "../types"
import {
    requireAuth,
    getParticipant,
    parseMessageCursor,
    makeMessageCursor,
    asMessageCursor,
} from "./utils"
import { getIO } from "@/socket"
import {
    MessageType,
    ConversationType,
    FriendshipStatus,
    MessageStatusType,
    ParticipantRole,
} from "@generated/prisma/enums"
import type { SortOrder } from "@generated/prisma/internal/prismaNamespace"

type MessageParent = MessageRecord

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Create a ritual message (content: null) and return both the MessageParent
 * and the sender's display name in a single DB round-trip by selecting the
 * sender relation inside message.create.
 * Used by sendSonicPing and sendRitual to avoid a separate user.findUnique call.
 */
async function persistRitualMessage(
    prisma: GraphQLContext["prisma"],
    conversationId: string,
    senderId: string,
    messageType: MessageType
): Promise<{ messageParent: MessageParent; senderName: string | null }> {
    const message = await prisma.message.create({
        data: { conversationId, senderId, content: null, messageType },
        select: {
            id: true,
            conversationId: true,
            senderId: true,
            content: true,
            messageType: true,
            imageUrl: true,
            createdAt: true,
            sender: { select: { name: true } },
        },
    })

    const messageParent: MessageParent = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        messageType: message.messageType,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt.toISOString(),
        status: MessageStatusType.SENT,
        replyToId: null,
        pinnedAt: null,
        deletedAt: null,
        replyTo: null,
    }

    return { messageParent, senderName: message.sender?.name ?? null }
}

// Raw shape returned by Prisma message.findMany select in the messages resolver
type RawMessageRow = {
    id: string
    conversationId: string
    senderId: string
    content: string | null
    messageType: MessageType
    imageUrl: string | null
    createdAt: Date
    replyToId?: string | null
    pinnedAt?: Date | null
    deletedAt?: Date | null
    replyTo?: {
        id: string
        content: string | null
        senderId: string
        deletedAt: Date | null
    } | null
}

function toMessageParent(m: RawMessageRow): MessageParent {
    return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        messageType: m.messageType,
        imageUrl: m.imageUrl,
        createdAt: m.createdAt.toISOString(),
        status: MessageStatusType.SENT,
        replyToId: m.replyToId ?? null,
        pinnedAt: m.pinnedAt ? m.pinnedAt.toISOString() : null,
        deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
        replyTo: m.replyTo
            ? {
                  id: m.replyTo.id,
                  content: m.replyTo.content,
                  senderId: m.replyTo.senderId,
                  deletedAt: m.replyTo.deletedAt ? m.replyTo.deletedAt.toISOString() : null,
              }
            : null,
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

        type RawConvRow = {
            id: string
            type: string
            name: string | null
            pinnedAt: Date | null
            onlyOwnerCanInvite: boolean
            onlyOwnerCanKick: boolean
            onlyOwnerCanEdit: boolean
            allowRituals: boolean
            createdAt: Date
        }

        // Single JOIN + GROUP BY — sorting is done entirely in Postgres so the
        // composite index on Message(conversationId, createdAt DESC) is leveraged.
        // Order: pinned conversations first (pinnedAt DESC among themselves),
        // then non-pinned by latest message time DESC (fallback to conversation createdAt).
        const rows = await context.prisma.$queryRaw<RawConvRow[]>`
            SELECT
                c.id,
                c.type,
                c.name,
                c."pinnedAt",
                c."onlyOwnerCanInvite",
                c."onlyOwnerCanKick",
                c."onlyOwnerCanEdit",
                c."allowRituals",
                c."createdAt"
            FROM "ConversationParticipant" cp
            JOIN "Conversation" c ON c.id = cp."conversationId"
            LEFT JOIN "Message" m ON m."conversationId" = c.id
            WHERE cp."userId" = ${userId}
            GROUP BY c.id
            ORDER BY
                (c."pinnedAt" IS NOT NULL) DESC,
                c."pinnedAt" DESC NULLS LAST,
                COALESCE(MAX(m."createdAt"), c."createdAt") DESC
        `

        // Fetch all ritual labels for these conversations in a single query
        const convIds = rows.map((c) => c.id)
        const ritualLabelsRaw =
            convIds.length > 0
                ? await context.prisma.conversationRitualLabel.findMany({
                      where: { conversationId: { in: convIds } },
                      select: {
                          conversationId: true,
                          ritualType: true,
                          labelOwn: true,
                          labelOther: true,
                      },
                  })
                : []

        const labelsByConvId = new Map<string, RitualLabelRecord[]>()
        for (const label of ritualLabelsRaw) {
            const list = labelsByConvId.get(label.conversationId) ?? []
            list.push({
                ritualType: label.ritualType,
                labelOwn: label.labelOwn,
                labelOther: label.labelOther,
            })
            labelsByConvId.set(label.conversationId, list)
        }

        return rows.map((c) => ({
            id: c.id,
            type: c.type as ConversationType,
            name: c.name,
            pinnedAt: c.pinnedAt ? c.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: c.onlyOwnerCanInvite,
            onlyOwnerCanKick: c.onlyOwnerCanKick,
            onlyOwnerCanEdit: c.onlyOwnerCanEdit,
            allowRituals: c.allowRituals,
            ritualLabels: labelsByConvId.get(c.id) ?? [],
            pinnedMessageId: null, // not included in this raw query
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

        // check current user is in this conversation
        const participant = await getParticipant(context.prisma, args.id, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const conv = await context.prisma.conversation.findUnique({
            where: { id: args.id },
            include: {
                ritualLabels: { select: { ritualType: true, labelOwn: true, labelOther: true } },
            },
        })
        if (!conv) return null

        return {
            id: conv.id,
            type: conv.type,
            name: conv.name,
            pinnedAt: conv.pinnedAt ? conv.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: conv.onlyOwnerCanInvite,
            onlyOwnerCanKick: conv.onlyOwnerCanKick,
            onlyOwnerCanEdit: conv.onlyOwnerCanEdit,
            allowRituals: conv.allowRituals,
            ritualLabels: conv.ritualLabels.map((l) => ({
                ritualType: l.ritualType,
                labelOwn: l.labelOwn,
                labelOther: l.labelOther,
            })),
            pinnedMessageId: conv.pinnedMessageId ?? null,
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

        // check user first
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
        let orderDir: SortOrder = "desc"

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
                replyToId: true,
                pinnedAt: true,
                deletedAt: true,
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        senderId: true,
                        deletedAt: true,
                    },
                },
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

        if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
            throw new GraphQLError("Must be friends to start a conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check for existing ONE_TO_ONE conversation between these two users
        const existing = await context.prisma.conversation.findFirst({
            where: {
                type: ConversationType.ONE_TO_ONE,
                AND: [
                    { participants: { some: { userId: myId } } },
                    { participants: { some: { userId: args.userId } } },
                ],
            },
        })

        if (existing) {
            return {
                id: existing.id,
                type: ConversationType.ONE_TO_ONE,
                name: existing.name,
                pinnedAt: existing.pinnedAt ? existing.pinnedAt.toISOString() : null,
                onlyOwnerCanInvite: existing.onlyOwnerCanInvite,
                onlyOwnerCanKick: existing.onlyOwnerCanKick,
                onlyOwnerCanEdit: existing.onlyOwnerCanEdit,
                allowRituals: existing.allowRituals,
                ritualLabels: [],
                pinnedMessageId: null,
                createdAt: existing.createdAt.toISOString(),
            }
        }

        // Create new conversation with both participants
        const conv = await context.prisma.conversation.create({
            data: {
                type: ConversationType.ONE_TO_ONE,
                participants: {
                    create: [
                        { userId: myId, role: ParticipantRole.MEMBER },
                        { userId: args.userId, role: ParticipantRole.MEMBER },
                    ],
                },
            },
        })

        return {
            id: conv.id,
            type: ConversationType.ONE_TO_ONE,
            name: conv.name,
            pinnedAt: conv.pinnedAt ? conv.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: conv.onlyOwnerCanInvite,
            onlyOwnerCanKick: conv.onlyOwnerCanKick,
            onlyOwnerCanEdit: conv.onlyOwnerCanEdit,
            allowRituals: conv.allowRituals,
            ritualLabels: [],
            pinnedMessageId: null,
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

            if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
                throw new GraphQLError(
                    `User ${targetId} is not your friend. Only friends can be added to a group.`,
                    { extensions: { code: "FORBIDDEN", status: 403 } }
                )
            }
        }

        // Create group conversation
        const conv = await context.prisma.conversation.create({
            data: {
                type: ConversationType.GROUP,
                name: args.name,
                participants: {
                    create: [
                        { userId: myId, role: ParticipantRole.OWNER },
                        ...args.userIds.map((uid) => ({
                            userId: uid,
                            role: ParticipantRole.MEMBER,
                        })),
                    ],
                },
            },
        })

        return {
            id: conv.id,
            type: ConversationType.GROUP,
            name: conv.name,
            pinnedAt: null,
            onlyOwnerCanInvite: conv.onlyOwnerCanInvite,
            onlyOwnerCanKick: conv.onlyOwnerCanKick,
            onlyOwnerCanEdit: conv.onlyOwnerCanEdit,
            allowRituals: conv.allowRituals,
            ritualLabels: [],
            pinnedMessageId: null,
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

        if (conv.type !== ConversationType.GROUP) {
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
        if (conv.onlyOwnerCanInvite && inviterParticipant.role !== ParticipantRole.OWNER) {
            throw new GraphQLError("Only the group owner can invite members", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Check invited user is a friend of the inviter
        const [u1, u2] = myId < args.userId ? [myId, args.userId] : [args.userId, myId]
        const friendship = await context.prisma.friendship.findUnique({
            where: { userId1_userId2: { userId1: u1, userId2: u2 } },
        })

        if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
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
                role: ParticipantRole.MEMBER,
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
            type: ConversationType.GROUP,
            name: conv.name,
            pinnedAt: conv.pinnedAt ? conv.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: conv.onlyOwnerCanInvite,
            onlyOwnerCanKick: conv.onlyOwnerCanKick,
            onlyOwnerCanEdit: conv.onlyOwnerCanEdit,
            allowRituals: conv.allowRituals,
            ritualLabels: [],
            pinnedMessageId: null,
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

        if (!conv || conv.type !== ConversationType.GROUP) {
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
        if (conv.onlyOwnerCanKick && removerParticipant.role !== ParticipantRole.OWNER) {
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
        if (targetParticipant.role === ParticipantRole.OWNER) {
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

        if (!conv || conv.type !== ConversationType.GROUP) {
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

        if (myParticipant.role === ParticipantRole.OWNER) {
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
                    data: { role: ParticipantRole.OWNER },
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
                allowRituals?: boolean | null
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

        if (conv.type !== ConversationType.GROUP) {
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
        if (conv.onlyOwnerCanEdit && myParticipant.role !== ParticipantRole.OWNER) {
            throw new GraphQLError("Only the group owner can edit group settings", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const updateData: {
            name?: string
            onlyOwnerCanInvite?: boolean
            onlyOwnerCanKick?: boolean
            onlyOwnerCanEdit?: boolean
            allowRituals?: boolean
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
        if (args.settings?.allowRituals !== null && args.settings?.allowRituals !== undefined)
            updateData.allowRituals = args.settings.allowRituals

        const updated = await context.prisma.conversation.update({
            where: { id: args.conversationId },
            include: {
                ritualLabels: { select: { ritualType: true, labelOwn: true, labelOther: true } },
            },
            data: updateData,
        })

        return {
            id: updated.id,
            type: ConversationType.GROUP,
            name: updated.name,
            pinnedAt: updated.pinnedAt ? updated.pinnedAt.toISOString() : null,
            onlyOwnerCanInvite: updated.onlyOwnerCanInvite,
            onlyOwnerCanKick: updated.onlyOwnerCanKick,
            onlyOwnerCanEdit: updated.onlyOwnerCanEdit,
            allowRituals: updated.allowRituals,
            ritualLabels: updated.ritualLabels.map((l) => ({
                ritualType: l.ritualType,
                labelOwn: l.labelOwn,
                labelOther: l.labelOther,
            })),
            pinnedMessageId: updated.pinnedMessageId ?? null,
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
                messageType: MessageType.TEXT,
            },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                content: true,
                messageType: true,
                imageUrl: true,
                createdAt: true,
                replyToId: true,
                pinnedAt: true,
                deletedAt: true,
            },
        })

        const messageParent: MessageParent = {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            content: message.content,
            messageType: message.messageType,
            imageUrl: message.imageUrl,
            createdAt: message.createdAt.toISOString(),
            status: MessageStatusType.SENT,
            replyToId: null,
            pinnedAt: null,
            deletedAt: null,
            replyTo: null,
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
     * Send a Sonic Ping ritual message to a conversation.
     * Persists a SONIC_PING type message (no content) and broadcasts via Socket.io:
     *   - message:new       — same payload as sendMessage for real-time message list updates
     *   - sonicPing:incoming — dedicated event carrying senderId and senderName
     */
    sendSonicPing: async (
        _parent: unknown,
        args: { conversationId: string },
        context: GraphQLContext
    ): Promise<MessageParent> => {
        const userId = requireAuth(context)

        const participant = await getParticipant(context.prisma, args.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const { messageParent, senderName } = await persistRitualMessage(
            context.prisma,
            args.conversationId,
            userId,
            MessageType.SONIC_PING
        )

        try {
            const io = getIO()
            io.to(args.conversationId).emit("message:new", {
                message: messageParent,
                conversationId: args.conversationId,
            })
            io.to(args.conversationId).emit("sonicPing:incoming", {
                conversationId: args.conversationId,
                senderId: userId,
                senderName,
            })
        } catch {
            // Non-fatal in test environment
        }

        return messageParent
    },

    /**
     * Send a ritual interaction message to a conversation.
     * Persists as Message with matching messageType (content: null) and
     * broadcasts two Socket.io events to the conversation room:
     *   - message:new    — standard message payload for real-time message list
     *   - ritual:incoming — { conversationId, senderId, senderName, ritualType }
     */
    sendRitual: async (
        _parent: unknown,
        args: { conversationId: string; ritualType: string },
        context: GraphQLContext
    ): Promise<MessageParent> => {
        const userId = requireAuth(context)

        const participant = await getParticipant(context.prisma, args.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // For GROUP conversations, rituals must be explicitly enabled
        const conversation = await context.prisma.conversation.findUnique({
            where: { id: args.conversationId },
            select: { type: true, allowRituals: true },
        })
        if (conversation?.type === ConversationType.GROUP && !conversation.allowRituals) {
            throw new GraphQLError("Rituals are disabled for this group", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Map RitualType string → MessageType enum value
        const messageType = MessageType[args.ritualType as keyof typeof MessageType]
        if (!messageType) {
            throw new GraphQLError(`Invalid ritual type: ${args.ritualType}`, {
                extensions: { code: "BAD_REQUEST", status: 400 },
            })
        }

        const { messageParent, senderName } = await persistRitualMessage(
            context.prisma,
            args.conversationId,
            userId,
            messageType
        )

        try {
            const io = getIO()
            io.to(args.conversationId).emit("message:new", {
                message: messageParent,
                conversationId: args.conversationId,
            })
            io.to(args.conversationId).emit("ritual:incoming", {
                conversationId: args.conversationId,
                senderId: userId,
                senderName,
                ritualType: args.ritualType,
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
     * Set a custom label for one ritual type in a conversation.
     * Participant-only. For GROUP conversations, only OWNER may call this (and only when allowRituals=true).
     */
    setRitualLabel: async (
        _parent: unknown,
        args: {
            conversationId: string
            input: { ritualType: string; labelOwn: string; labelOther: string }
        },
        context: GraphQLContext
    ): Promise<RitualLabelRecord> => {
        const userId = requireAuth(context)

        const membership = await context.prisma.conversationParticipant.findFirst({
            where: { conversationId: args.conversationId, userId },
        })
        if (!membership) {
            throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN", status: 403 } })
        }

        const conversation = await context.prisma.conversation.findUnique({
            where: { id: args.conversationId },
            select: { type: true, allowRituals: true },
        })
        if (!conversation) {
            throw new GraphQLError("Conversation not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        if (conversation.type === ConversationType.GROUP) {
            if (membership.role !== ParticipantRole.OWNER) {
                throw new GraphQLError("Only group owners can set ritual labels", {
                    extensions: { code: "FORBIDDEN", status: 403 },
                })
            }
            if (!conversation.allowRituals) {
                throw new GraphQLError("Rituals are disabled for this group", {
                    extensions: { code: "FORBIDDEN", status: 403 },
                })
            }
        }

        const ritualType = MessageType[args.input.ritualType as keyof typeof MessageType]
        if (!ritualType) {
            throw new GraphQLError(`Invalid ritual type: ${args.input.ritualType}`, {
                extensions: { code: "BAD_REQUEST", status: 400 },
            })
        }

        const label = await context.prisma.conversationRitualLabel.upsert({
            where: {
                conversationId_ritualType: {
                    conversationId: args.conversationId,
                    ritualType,
                },
            },
            create: {
                conversationId: args.conversationId,
                ritualType,
                labelOwn: args.input.labelOwn,
                labelOther: args.input.labelOther,
                updatedBy: userId,
            },
            update: {
                labelOwn: args.input.labelOwn,
                labelOther: args.input.labelOther,
                updatedBy: userId,
            },
        })

        return {
            ritualType: label.ritualType,
            labelOwn: label.labelOwn,
            labelOther: label.labelOther,
        }
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

    // =========================================================================
    // Message Action Mutations (Feature 1.3.3)
    // =========================================================================

    /**
     * Reply to an existing message within a conversation.
     * Security: replyToMessage must belong to the same conversationId (cross-conversation injection guard).
     */
    replyToMessage: async (
        _parent: unknown,
        args: { conversationId: string; content: string; replyToMessageId: string },
        context: GraphQLContext
    ): Promise<MessageParent> => {
        const userId = requireAuth(context)

        // Validate content
        if (!args.content || args.content.trim().length === 0) {
            throw new GraphQLError("Message content cannot be empty", {
                extensions: { code: "BAD_USER_INPUT", status: 400 },
            })
        }
        if (args.content.length > 2000) {
            throw new GraphQLError("Message content exceeds 2000 character limit", {
                extensions: { code: "BAD_USER_INPUT", status: 400 },
            })
        }

        // Verify caller is participant
        const participant = await getParticipant(context.prisma, args.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Verify replyTo message exists
        const replyToMsg = await context.prisma.message.findUnique({
            where: { id: args.replyToMessageId },
            select: { id: true, conversationId: true, content: true, senderId: true, deletedAt: true },
        })

        if (!replyToMsg) {
            throw new GraphQLError("Replied-to message not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        // Cross-conversation injection guard
        if (replyToMsg.conversationId !== args.conversationId) {
            throw new GraphQLError("Replied-to message does not belong to this conversation", {
                extensions: { code: "BAD_USER_INPUT", status: 400 },
            })
        }

        const message = await context.prisma.message.create({
            data: {
                conversationId: args.conversationId,
                senderId: userId,
                content: args.content,
                messageType: MessageType.TEXT,
                replyToId: args.replyToMessageId,
            },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                content: true,
                messageType: true,
                imageUrl: true,
                createdAt: true,
                replyToId: true,
                pinnedAt: true,
                deletedAt: true,
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        senderId: true,
                        deletedAt: true,
                    },
                },
            },
        })

        const messageParent: MessageParent = toMessageParent(message)

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
     * Pin a message within its conversation.
     * Sets message.pinnedAt and conversation.pinnedMessageId.
     * Idempotent: already-pinned messages return existing pinnedAt unchanged.
     */
    pinMessage: async (
        _parent: unknown,
        args: { messageId: string },
        context: GraphQLContext
    ): Promise<MessageParent> => {
        const userId = requireAuth(context)

        // Find message and verify it exists
        const msg = await context.prisma.message.findUnique({
            where: { id: args.messageId },
            select: { id: true, conversationId: true, pinnedAt: true, replyToId: true, deletedAt: true },
        })

        if (!msg) {
            throw new GraphQLError("Message not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        // Verify caller is participant
        const participant = await getParticipant(context.prisma, msg.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Idempotent: if already pinned, return as-is
        if (msg.pinnedAt !== null) {
            const existingMsg = await context.prisma.message.findUnique({
                where: { id: args.messageId },
                select: {
                    id: true,
                    conversationId: true,
                    senderId: true,
                    content: true,
                    messageType: true,
                    imageUrl: true,
                    createdAt: true,
                    replyToId: true,
                    pinnedAt: true,
                    deletedAt: true,
                    replyTo: { select: { id: true, content: true, senderId: true, deletedAt: true } },
                },
            })
            return toMessageParent(existingMsg!)
        }

        // Pin message and update conversation in a transaction
        const [updatedMsg] = await context.prisma.$transaction([
            context.prisma.message.update({
                where: { id: args.messageId },
                data: { pinnedAt: new Date() },
                select: {
                    id: true,
                    conversationId: true,
                    senderId: true,
                    content: true,
                    messageType: true,
                    imageUrl: true,
                    createdAt: true,
                    replyToId: true,
                    pinnedAt: true,
                    deletedAt: true,
                },
            }),
            context.prisma.conversation.update({
                where: { id: msg.conversationId },
                data: { pinnedMessageId: args.messageId },
            }),
        ])

        const messageParent: MessageParent = {
            ...toMessageParent({ ...updatedMsg, replyTo: null }),
        }

        try {
            const io = getIO()
            io.to(msg.conversationId).emit("message:pinned", {
                messageId: args.messageId,
                conversationId: msg.conversationId,
                pinnedAt: messageParent.pinnedAt,
            })
        } catch {
            // Non-fatal in test environment
        }

        return messageParent
    },

    /**
     * Unpin a message from its conversation.
     * Clears message.pinnedAt and conversation.pinnedMessageId.
     * Idempotent: already-unpinned messages return null pinnedAt without error.
     */
    unpinMessage: async (
        _parent: unknown,
        args: { messageId: string },
        context: GraphQLContext
    ): Promise<MessageParent> => {
        const userId = requireAuth(context)

        // Find message
        const msg = await context.prisma.message.findUnique({
            where: { id: args.messageId },
            select: { id: true, conversationId: true, pinnedAt: true },
        })

        if (!msg) {
            throw new GraphQLError("Message not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        // Verify caller is participant
        const participant = await getParticipant(context.prisma, msg.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        // Idempotent: if not pinned, return current state without broadcast
        if (msg.pinnedAt === null) {
            const existingMsg = await context.prisma.message.findUnique({
                where: { id: args.messageId },
                select: {
                    id: true,
                    conversationId: true,
                    senderId: true,
                    content: true,
                    messageType: true,
                    imageUrl: true,
                    createdAt: true,
                    replyToId: true,
                    pinnedAt: true,
                    deletedAt: true,
                    replyTo: { select: { id: true, content: true, senderId: true, deletedAt: true } },
                },
            })
            return toMessageParent(existingMsg!)
        }

        // Unpin message and clear conversation.pinnedMessageId in a transaction
        const [updatedMsg] = await context.prisma.$transaction([
            context.prisma.message.update({
                where: { id: args.messageId },
                data: { pinnedAt: null },
                select: {
                    id: true,
                    conversationId: true,
                    senderId: true,
                    content: true,
                    messageType: true,
                    imageUrl: true,
                    createdAt: true,
                    replyToId: true,
                    pinnedAt: true,
                    deletedAt: true,
                },
            }),
            // Always clear pinnedMessageId — handles both consistent and inconsistent state
            context.prisma.conversation.update({
                where: { id: msg.conversationId },
                data: { pinnedMessageId: null },
            }),
        ])

        const messageParent: MessageParent = toMessageParent({ ...updatedMsg, replyTo: null })

        try {
            const io = getIO()
            io.to(msg.conversationId).emit("message:unpinned", {
                messageId: args.messageId,
                conversationId: msg.conversationId,
            })
        } catch {
            // Non-fatal in test environment
        }

        return messageParent
    },

    /**
     * Delete a message.
     * scope=EVERYONE: sender-only, within 24h. Sets deletedAt and clears content.
     * scope=OWN: stub — returns true (MessageHide table not yet implemented).
     */
    deleteMessage: async (
        _parent: unknown,
        args: { messageId: string; scope: "OWN" | "EVERYONE" },
        context: GraphQLContext
    ): Promise<boolean> => {
        const userId = requireAuth(context)

        const msg = await context.prisma.message.findUnique({
            where: { id: args.messageId },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                createdAt: true,
                deletedAt: true,
            },
        })

        if (!msg) {
            throw new GraphQLError("Message not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        if (args.scope === "EVERYONE") {
            // Only the sender can delete for everyone
            if (msg.senderId !== userId) {
                throw new GraphQLError("Only the message sender can retract for everyone", {
                    extensions: { code: "FORBIDDEN", status: 403 },
                })
            }

            // Already deleted — idempotent
            if (msg.deletedAt !== null) {
                return true
            }

            // 24-hour time limit
            const hoursSinceCreated =
                (Date.now() - msg.createdAt.getTime()) / (1000 * 60 * 60)
            if (hoursSinceCreated > 24) {
                throw new GraphQLError("Cannot retract a message older than 24 hours", {
                    extensions: { code: "FORBIDDEN", status: 403 },
                })
            }

            await context.prisma.message.update({
                where: { id: args.messageId },
                data: { content: null, deletedAt: new Date() },
            })

            try {
                const io = getIO()
                io.to(msg.conversationId).emit("message:deleted", {
                    messageId: args.messageId,
                    conversationId: msg.conversationId,
                    scope: "EVERYONE",
                })
            } catch {
                // Non-fatal in test environment
            }

            return true
        }

        // scope=OWN: stub — MessageHide table not yet implemented
        // Caller must still be a participant in the conversation to prevent data enumeration
        const participant = await getParticipant(context.prisma, msg.conversationId, userId)
        if (!participant) {
            throw new GraphQLError("Not a participant of this conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        return true
    },

    /**
     * Forward a message to another conversation.
     * Creates a new message with the same content. Cannot forward deleted messages.
     */
    forwardMessage: async (
        _parent: unknown,
        args: { messageId: string; targetConversationId: string },
        context: GraphQLContext
    ): Promise<MessageParent> => {
        const userId = requireAuth(context)

        // Load source message
        const srcMsg = await context.prisma.message.findUnique({
            where: { id: args.messageId },
            select: {
                id: true,
                conversationId: true,
                content: true,
                deletedAt: true,
                messageType: true,
            },
        })

        if (!srcMsg) {
            throw new GraphQLError("Message not found", {
                extensions: { code: "NOT_FOUND", status: 404 },
            })
        }

        // Cannot forward deleted messages
        if (srcMsg.deletedAt !== null) {
            throw new GraphQLError("Cannot forward a deleted message", {
                extensions: { code: "BAD_USER_INPUT", status: 400 },
            })
        }

        // Verify caller is participant in the target conversation
        const targetParticipant = await getParticipant(
            context.prisma,
            args.targetConversationId,
            userId
        )
        if (!targetParticipant) {
            throw new GraphQLError("Not a participant of the target conversation", {
                extensions: { code: "FORBIDDEN", status: 403 },
            })
        }

        const newMessage = await context.prisma.message.create({
            data: {
                conversationId: args.targetConversationId,
                senderId: userId,
                content: srcMsg.content,
                messageType: MessageType.TEXT,
            },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                content: true,
                messageType: true,
                imageUrl: true,
                createdAt: true,
                replyToId: true,
                pinnedAt: true,
                deletedAt: true,
            },
        })

        const messageParent: MessageParent = toMessageParent({ ...newMessage, replyTo: null })

        try {
            const io = getIO()
            io.to(args.targetConversationId).emit("message:new", {
                message: messageParent,
                conversationId: args.targetConversationId,
            })
            io.to(args.targetConversationId).emit("message:forwarded", {
                newMessageId: newMessage.id,
                targetConversationId: args.targetConversationId,
            })
        } catch {
            // Non-fatal in test environment
        }

        return messageParent
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

    /**
     * Resolve the pinned message for this conversation.
     * Returns null if no message is pinned.
     */
    pinnedMessage: async (
        parent: ConversationParent,
        _args: unknown,
        context: GraphQLContext
    ): Promise<MessageParent | null> => {
        if (!parent.pinnedMessageId) return null

        const msg = await context.prisma.message.findUnique({
            where: { id: parent.pinnedMessageId },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                content: true,
                messageType: true,
                imageUrl: true,
                createdAt: true,
                replyToId: true,
                pinnedAt: true,
                deletedAt: true,
                replyTo: { select: { id: true, content: true, senderId: true, deletedAt: true } },
            },
        })

        return msg ? toMessageParent(msg) : null
    },

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
        if (parent.type !== ConversationType.GROUP) return null
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

    replyToId: (parent: MessageParent): string | null => parent.replyToId,

    pinnedAt: (parent: MessageParent): string | null => parent.pinnedAt,

    deletedAt: (parent: MessageParent): string | null => parent.deletedAt,

    /**
     * Resolve the replyTo message from the already-loaded nested record.
     * If the nested replyTo was not fetched, fall back to a DB lookup.
     */
    replyTo: async (
        parent: MessageParent,
        _args: unknown,
        context: GraphQLContext
    ): Promise<MessageParent | null> => {
        if (!parent.replyToId) return null

        if (parent.replyTo) {
            // Already loaded inline — build a minimal MessageParent
            return {
                id: parent.replyTo.id,
                conversationId: parent.conversationId,
                senderId: parent.replyTo.senderId,
                content: parent.replyTo.content,
                messageType: MessageType.TEXT,
                imageUrl: null,
                createdAt: "",
                status: MessageStatusType.SENT,
                replyToId: null,
                pinnedAt: null,
                deletedAt: parent.replyTo.deletedAt,
                replyTo: null,
            }
        }

        // Fallback: load from DB
        const msg = await context.prisma.message.findUnique({
            where: { id: parent.replyToId },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                content: true,
                messageType: true,
                imageUrl: true,
                createdAt: true,
                replyToId: true,
                pinnedAt: true,
                deletedAt: true,
            },
        })

        return msg ? toMessageParent({ ...msg, replyTo: null }) : null
    },
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
