/**
 * GraphQL DataLoaders
 *
 * Prevents N+1 queries by batching database lookups within a single request.
 * Each request gets a fresh set of loaders (loaders are per-request, not global).
 *
 * Usage in resolvers:
 *   const user = await context.loaders.user.load(userId)
 *   const participants = await context.loaders.participants.load(conversationId)
 *
 * All load() calls within the same event loop tick are batched into
 * a single database query.
 */

import DataLoader from "dataloader"
import type { PrismaClient } from "@generated/prisma/client"
import type { UserRecord, ParticipantRecord, MessageRecord } from "./types"
import { MessageStatusType, FriendshipStatus } from "@generated/prisma/enums"

export type { UserRecord, ParticipantRecord, MessageRecord }

// ---------------------------------------------------------------------------
// User Loader
// ---------------------------------------------------------------------------

/**
 * Create a DataLoader that batches User lookups by ID.
 */
function createUserLoader(prisma: PrismaClient): DataLoader<string, UserRecord | null> {
    return new DataLoader<string, UserRecord | null>(
        async (ids) => {
            const users = await prisma.user.findMany({
                where: { id: { in: ids as string[] } },
                select: {
                    id: true,
                    email: true,
                    emailVerified: true,
                    name: true,
                    image: true,
                    createdAt: true,
                    updatedAt: true,
                },
            })

            const userMap = new Map(users.map((u) => [u.id, u]))

            return ids.map((id) => {
                const u = userMap.get(id)
                if (!u) return null
                return {
                    ...u,
                    emailVerified: u.emailVerified ? u.emailVerified.toISOString() : null,
                    createdAt: u.createdAt.toISOString(),
                    updatedAt: u.updatedAt.toISOString(),
                }
            })
        },
        { cache: true }
    )
}

// ---------------------------------------------------------------------------
// Participants Loader
// ---------------------------------------------------------------------------

/**
 * Create a DataLoader that batches ConversationParticipant lookups by conversationId.
 * Returns all participants for a given conversation.
 */
function createParticipantsLoader(prisma: PrismaClient): DataLoader<string, ParticipantRecord[]> {
    return new DataLoader<string, ParticipantRecord[]>(
        async (conversationIds) => {
            const participants = await prisma.conversationParticipant.findMany({
                where: { conversationId: { in: conversationIds as string[] } },
                select: {
                    userId: true,
                    conversationId: true,
                    role: true,
                    joinedAt: true,
                    lastReadAt: true,
                },
            })

            // Group by conversationId
            const groupMap = new Map<string, ParticipantRecord[]>()
            for (const p of participants) {
                const list = groupMap.get(p.conversationId) ?? []
                list.push({
                    userId: p.userId,
                    conversationId: p.conversationId,
                    role: p.role,
                    joinedAt: p.joinedAt.toISOString(),
                    lastReadAt: p.lastReadAt ? p.lastReadAt.toISOString() : null,
                })
                groupMap.set(p.conversationId, list)
            }

            return conversationIds.map((id) => groupMap.get(id) ?? [])
        },
        { cache: true }
    )
}

// ---------------------------------------------------------------------------
// Last Message Loader
// ---------------------------------------------------------------------------

/**
 * Create a DataLoader that batches last-message lookups by conversationId.
 * Returns the most recent message for each conversation.
 */
function createLastMessageLoader(prisma: PrismaClient): DataLoader<string, MessageRecord | null> {
    return new DataLoader<string, MessageRecord | null>(
        async (conversationIds) => {
            // Fetch the latest message per conversation using a raw window function approach.
            // Since Prisma does not support DISTINCT ON natively, we use findMany with
            // orderBy + take per conversationId via groupBy workaround.
            // Strategy: fetch all messages for these conversations ordered by createdAt DESC,
            // then pick the first per conversationId in JS.
            const messages = await prisma.message.findMany({
                where: { conversationId: { in: conversationIds as string[] } },
                orderBy: { createdAt: "desc" },
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

            // Pick first (most recent) message per conversationId
            const lastMessageMap = new Map<string, MessageRecord>()
            for (const m of messages) {
                if (!lastMessageMap.has(m.conversationId)) {
                    lastMessageMap.set(m.conversationId, {
                        id: m.id,
                        conversationId: m.conversationId,
                        senderId: m.senderId,
                        content: m.content,
                        messageType: m.messageType,
                        imageUrl: m.imageUrl,
                        createdAt: m.createdAt.toISOString(),
                        status: MessageStatusType.SENT,
                    })
                }
            }

            return conversationIds.map((id) => lastMessageMap.get(id) ?? null)
        },
        { cache: true }
    )
}

// ---------------------------------------------------------------------------
// Friendship Status Loader (per-viewer)
// ---------------------------------------------------------------------------

/**
 * Create a DataLoader that checks friendship status between the viewer and other users.
 * Returns true if the viewer has an ACCEPTED friendship with the given userId.
 *
 * This loader is per-viewer — it MUST NOT be shared across different viewers.
 * It is created fresh for each request in buildGraphQLContext with the viewer's userId.
 *
 * @param prisma - Prisma client
 * @param viewerUserId - The ID of the currently authenticated user
 */
function createFriendshipStatusLoader(
    prisma: PrismaClient,
    viewerUserId: string
): DataLoader<string, boolean> {
    return new DataLoader<string, boolean>(
        async (otherUserIds) => {
            const uniqueIds = [...new Set(otherUserIds as string[])]

            // Use a fixed two-branch OR query shape so Prisma 7.4.0+ LRU query
            // compilation cache gets high hit rates (variable-length OR arrays
            // produce distinct query shapes and effectively bypass the cache).
            const friendships = await prisma.friendship.findMany({
                where: {
                    status: FriendshipStatus.ACCEPTED,
                    OR: [
                        { userId1: viewerUserId, userId2: { in: uniqueIds } },
                        { userId2: viewerUserId, userId1: { in: uniqueIds } },
                    ],
                },
                select: { userId1: true, userId2: true },
            })

            // Build a Set of friend IDs for O(1) lookup
            const friendSet = new Set<string>()
            for (const f of friendships) {
                const otherId = f.userId1 === viewerUserId ? f.userId2 : f.userId1
                friendSet.add(otherId)
            }

            return (otherUserIds as string[]).map((id) => friendSet.has(id))
        },
        { cache: true }
    )
}

// ---------------------------------------------------------------------------
// Loaders factory
// ---------------------------------------------------------------------------

export type GraphQLLoaders = {
    user: DataLoader<string, UserRecord | null>
    participants: DataLoader<string, ParticipantRecord[]>
    lastMessage: DataLoader<string, MessageRecord | null>
    friendshipStatus: DataLoader<string, boolean>
}

/**
 * Create a fresh set of DataLoaders for each GraphQL request.
 * Must be called once per request in the context builder.
 *
 * @param prisma - Prisma client
 * @param viewerUserId - Current user ID (null if unauthenticated).
 *   When null, friendshipStatus loader always returns false.
 */
export function createLoaders(prisma: PrismaClient, viewerUserId: string | null): GraphQLLoaders {
    return {
        user: createUserLoader(prisma),
        participants: createParticipantsLoader(prisma),
        lastMessage: createLastMessageLoader(prisma),
        friendshipStatus: viewerUserId
            ? createFriendshipStatusLoader(prisma, viewerUserId)
            : new DataLoader<string, boolean>(async (ids) => ids.map(() => false)),
    }
}
