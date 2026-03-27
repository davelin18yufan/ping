/**
 * GraphQL Schema Definition
 *
 * Defines the GraphQL type system for the Ping API.
 * Uses GraphQL Yoga's createSchema for type-safe schema building.
 */

import { createSchema } from "graphql-yoga"
import {
    userResolvers,
    authResolvers,
    friendsResolvers,
    sessionsResolvers,
    conversationsResolvers,
} from "./resolvers"

/**
 * GraphQL Schema
 *
 * Defines all types, queries, mutations, and subscriptions.
 */
export const schema = createSchema({
    typeDefs: /* GraphQL */ `
      """
      User represents an authenticated user in the Ping application.
      Matches the Prisma User model from Better Auth integration.
      """
      type User {
        """
        Unique user ID (UUID)
        """
        id: ID!

        """
        User's email address (unique)
        """
        email: String!

        """
        Whether the email has been verified
        """
        emailVerified: Boolean

        """
        User's display name (optional)
        """
        name: String

        """
        User's profile image URL (optional)
        """
        image: String

        """
        Timestamp when user account was created
        """
        createdAt: String!

        """
        Timestamp when user account was last updated
        """
        updatedAt: String!

        """
        Whether the user is currently online (active tab/app in foreground).
        Computed from Redis key user:online:{id} with 35s TTL.
        Refreshed by client heartbeat every 30s while active.
        """
        isOnline: Boolean!

        """
        Public status message set by the user (null if not set).
        Maximum 80 characters.
        """
        statusMessage: String

        """
        UI preference for the aesthetic mode.
        One of: ornate | minimal. Defaults to ornate.
        """
        aestheticMode: AestheticMode!
      }

      """
      Aesthetic mode enum for UI preference (used by frontend codegen)
      """
      enum AestheticMode {
        ornate
        minimal
      }

      """
      Friendship status enum
      """
      enum FriendshipStatus {
        PENDING
        ACCEPTED
        REJECTED
      }

      """
      FriendRequest represents a pending or resolved friend request.
      """
      type FriendRequest {
        id: ID!
        sender: User!
        receiver: User!
        status: FriendshipStatus!
        createdAt: String!
        updatedAt: String!
      }

      """
      Friendship represents an accepted friendship between two users.
      """
      type Friendship {
        id: ID!
        friend: User!
        since: String!
      }

      """
      Session information for one of the current user's active login sessions.
      """
      type SessionInfo {
        """
        Unique session ID
        """
        id: ID!

        """
        User agent string of the browser/device (null if not captured)
        """
        userAgent: String

        """
        IP address of the client (null if not captured)
        """
        ipAddress: String

        """
        Timestamp when this session was created
        """
        createdAt: String!

        """
        Timestamp when this session expires
        """
        expiresAt: String!

        """
        True if this is the session used by the current request
        """
        isCurrent: Boolean!
      }

      # =============================================
      # Conversation Types
      # =============================================

      """
      Conversation type: direct message or group chat
      """
      enum ConversationType {
        ONE_TO_ONE
        GROUP
      }

      """
      Message content type
      """
      enum MessageType {
        TEXT
        IMAGE
        SONIC_PING
        APOLOGY
        CELEBRATE
        TAUNT
        LONGING
        QUESTION
        REJECTION
      }

      """
      Ritual interaction type — maps 1-to-1 with ritual MessageType values.
      Used as input for the sendRitual mutation.
      """
      enum RitualType {
        APOLOGY
        CELEBRATE
        TAUNT
        LONGING
        QUESTION
        REJECTION
      }

      """
      Message delivery/read status
      """
      enum MessageStatusType {
        SENT
        DELIVERED
        READ
      }

      """
      Participant role within a group conversation
      """
      enum ParticipantRole {
        OWNER
        MEMBER
      }

      """
      Group-specific permission settings
      """
      type GroupSettings {
        onlyOwnerCanInvite: Boolean!
        onlyOwnerCanKick: Boolean!
        onlyOwnerCanEdit: Boolean!
      }

      """
      Custom label for a ritual type within a conversation.
      labelOwn: shown to the sender. labelOther: shown to recipients.
      """
      type RitualLabel {
        ritualType: MessageType!
        labelOwn: String!
        labelOther: String!
      }

      """
      Input for setting a custom ritual label within a conversation.
      """
      input SetRitualLabelInput {
        ritualType: RitualType!
        labelOwn: String!
        labelOther: String!
      }

      """
      A participant in a conversation, with viewer-dependent computed fields
      """
      type ConversationParticipant {
        user: User!
        role: ParticipantRole!
        """
        Whether this participant is a friend of the currently authenticated viewer.
        This is a viewer-dependent computed field.
        """
        isFriend: Boolean!
        joinedAt: String!
      }

      """
      A conversation (1-on-1 or group)
      """
      type Conversation {
        id: ID!
        type: ConversationType!
        """
        Group name — null for ONE_TO_ONE conversations
        """
        name: String
        participants: [ConversationParticipant!]!
        lastMessage: Message
        """
        Number of unread messages for the current viewer
        """
        unreadCount: Int!
        """
        ISO timestamp when this conversation was pinned by the viewer, or null
        """
        pinnedAt: String
        """
        Group permission settings — null for ONE_TO_ONE conversations
        """
        settings: GroupSettings
        """
        Whether rituals are enabled for this conversation (GROUP only; always ignored for ONE_TO_ONE).
        """
        allowRituals: Boolean!
        """
        Custom ritual labels configured for this conversation. Empty if none have been set.
        """
        ritualLabels: [RitualLabel!]!
        """
        The currently pinned message, or null if none is pinned.
        """
        pinnedMessage: Message
        createdAt: String!
      }

      """
      Scope for deleteMessage mutation.
      OWN: soft-delete only for the current user's view.
      EVERYONE: soft-delete for all participants (sender only, within 24 h).
      """
      enum DeleteMessageScope {
        OWN
        EVERYONE
      }

      """
      A chat message
      """
      type Message {
        id: ID!
        conversationId: ID!
        sender: User!
        content: String
        messageType: MessageType!
        imageUrl: String
        createdAt: String!
        status: MessageStatusType!
        """
        The message this is a reply to, if any.
        """
        replyTo: Message
        """
        The ID of the message this is a reply to, if any.
        """
        replyToId: ID
        """
        ISO timestamp when this message was pinned, or null.
        """
        pinnedAt: String
        """
        ISO timestamp when this message was soft-deleted, or null.
        """
        deletedAt: String
      }

      """
      Paginated list of messages with bidirectional cursors.
      - nextCursor: load older messages (scroll up / infinite load)
      - prevCursor: load newer messages (reconnect catch-up / sliding window)
      """
      type MessagePage {
        messages: [Message!]!
        nextCursor: String
        prevCursor: String
      }

      """
      Input for updating the current user's profile
      """
      input UpdateProfileInput {
        """
        New display name (1-50 characters). Omit to leave unchanged.
        """
        name: String

        """
        New avatar image URL. Must be a valid URL. Omit to leave unchanged.
        """
        image: String

        """
        Public status message (0-80 characters).
        Empty string clears the status (stored as null). Omit to leave unchanged.
        """
        statusMessage: String

        """
        UI preference: ornate | minimal. Omit to leave unchanged.
        """
        aestheticMode: AestheticMode
      }

      """
      Input for updating group permission settings
      """
      input GroupSettingsInput {
        onlyOwnerCanInvite: Boolean
        onlyOwnerCanKick: Boolean
        onlyOwnerCanEdit: Boolean
        allowRituals: Boolean
      }

      """
      Root Query type - all read operations
      """
      type Query {
        """
        Get the currently authenticated user.
        Requires valid session cookie.
        Returns null if not authenticated.
        """
        me: User

        """
        Search users by name or email. Returns at most 20 results.
        Returns empty array for queries shorter than 2 characters.
        """
        searchUsers(query: String!): [User!]!

        """
        Get all accepted friends of the current user.
        """
        friends: [User!]!

        """
        Get all pending friend requests received by the current user.
        """
        pendingFriendRequests: [FriendRequest!]!

        """
        Get all pending friend requests sent by the current user.
        """
        sentFriendRequests: [FriendRequest!]!

        """
        Get all active (non-expired) sessions for the current user.
        Requires authentication. Returns UNAUTHENTICATED if not logged in.
        """
        sessions: [SessionInfo!]!

        """
        Get all conversations for the current user.
        Sorted: pinned first, then by latest message time descending.
        """
        conversations: [Conversation!]!

        """
        Get a single conversation by ID.
        Returns FORBIDDEN if the current user is not a participant.
        """
        conversation(id: ID!): Conversation

        """
        Get paginated messages for a conversation.
        Cursor-based pagination. cursor/before: older messages (scroll up). after: newer messages (reconnect catch-up).
        Cursor format: ISO timestamp + underscore + message ID. Default limit 20, max 50.
        """
        messages(conversationId: ID!, cursor: String, before: String, after: String, limit: Int): MessagePage!

        """
        Get all users blocked by the current user.
        """
        blacklist: [User!]!
      }

      """
      Authentication response containing user data and status
      """
      type AuthResponse {
        """
        Authenticated user data
        """
        user: UserInfo

        """
        Success status of authentication
        """
        success: Boolean!

        """
        Human-readable message about authentication result
        """
        message: String

        """
        Session token (for testing purposes only)
        """
        sessionToken: String
      }

      """
      User information returned from authentication
      """
      type UserInfo {
        """
        User ID
        """
        id: ID!

        """
        User email address
        """
        email: String!

        """
        User display name
        """
        displayName: String

        """
        User avatar URL
        """
        avatarUrl: String
      }

      """
      Root Mutation type - all write operations
      """
      type Mutation {
        """
        Update the current user's profile (name and/or avatar image URL).
        Requires authentication.
        Returns the updated User object.
        """
        updateProfile(input: UpdateProfileInput!): User!

        """
        Authenticate with Google OAuth.
        Verifies OAuth code and creates user session.
        Returns authenticated user and session cookie.
        """
        authenticateWithGoogle(code: String!): AuthResponse!

        """
        Send a friend request to another user.
        Returns the created FriendRequest.
        """
        sendFriendRequest(userId: ID!): FriendRequest!

        """
        Accept a received friend request.
        Returns the resulting Friendship.
        """
        acceptFriendRequest(requestId: ID!): Friendship!

        """
        Reject a received friend request.
        Returns true on success.
        """
        rejectFriendRequest(requestId: ID!): Boolean!

        """
        Cancel a sent friend request.
        Returns true on success.
        """
        cancelFriendRequest(requestId: ID!): Boolean!

        """
        Remove an accepted friendship.
        Does NOT create a blacklist entry - use blockUser for that.
        Either party may remove. Returns true on success.
        """
        removeFriend(friendshipId: ID!): Boolean!

        """
        Revoke a specific session by its ID.
        Cannot revoke the currently active session (FORBIDDEN).
        Returns true on success.
        """
        revokeSession(sessionId: ID!): Boolean!

        """
        Revoke all sessions except the current one.
        Returns true on success.
        """
        revokeAllSessions: Boolean!

        # =============================================
        # Conversation Mutations
        # =============================================

        """
        Get an existing 1-on-1 conversation with the specified user, or create one.
        Both users must be ACCEPTED friends.
        Idempotent: returns the existing conversation if one already exists.
        """
        getOrCreateConversation(userId: ID!): Conversation!

        """
        Create a new group conversation.
        All userIds must be ACCEPTED friends of the current user (Creator).
        The Creator automatically becomes OWNER.
        """
        createGroupConversation(name: String!, userIds: [ID!]!): Conversation!

        """
        Invite a user to a group conversation.
        The invited user must be a friend of the inviting user (not necessarily the creator).
        Respects onlyOwnerCanInvite setting.
        """
        inviteToGroup(conversationId: ID!, userId: ID!): Conversation!

        """
        Remove a participant from a group conversation.
        Cannot remove the OWNER. Respects onlyOwnerCanKick setting.
        Removed users can be re-invited later.
        """
        removeFromGroup(conversationId: ID!, userId: ID!): Boolean!

        """
        Leave a group conversation.
        If the current user is OWNER and has other members, successorUserId is required.
        If the current user is OWNER and is the last member, the group is dissolved.
        """
        leaveGroup(conversationId: ID!, successorUserId: ID): Boolean!

        """
        Update group conversation name and/or permission settings.
        Returns BAD_REQUEST for ONE_TO_ONE conversations.
        Respects onlyOwnerCanEdit setting.
        """
        updateGroupSettings(
          conversationId: ID!
          name: String
          settings: GroupSettingsInput
        ): Conversation!

        """
        Pin a conversation (sets pinnedAt to current timestamp).
        Pinned conversations appear at the top of the conversation list.
        """
        pinConversation(conversationId: ID!): Boolean!

        """
        Unpin a conversation (sets pinnedAt to null).
        """
        unpinConversation(conversationId: ID!): Boolean!

        """
        Send a text message to a conversation.
        The current user must be a participant.
        Broadcasts message:new via Socket.io to all room members.
        """
        sendMessage(conversationId: ID!, content: String!): Message!

        """
        Send a Sonic Ping ritual message to a conversation.
        The current user must be a participant.
        Persists a SONIC_PING type message and broadcasts via Socket.io.
        Emits message:new and sonicPing:incoming to the conversation room.
        """
        sendSonicPing(conversationId: ID!): Message!

        """
        Send a ritual interaction message. Persists as Message with matching
        messageType and broadcasts ritual:incoming via Socket.io.
        Emits message:new (same payload as sendMessage) and ritual:incoming
        carrying conversationId, senderId, senderName, and ritualType.
        """
        sendRitual(conversationId: ID!, ritualType: RitualType!): Message!

        """
        Mark all unread messages in a conversation as READ for the current user.
        """
        markMessagesAsRead(conversationId: ID!): Boolean!

        """
        Set a custom label for one ritual type in a conversation.
        Caller must be a participant. For GROUP conversations, only OWNER may call this when allowRituals=true.
        """
        setRitualLabel(conversationId: ID!, input: SetRitualLabelInput!): RitualLabel!

        """
        Block a user. Automatically removes any existing friendship.
        The blocked user is not notified.
        """
        blockUser(userId: ID!): Boolean!

        """
        Unblock a previously blocked user.
        Returns NOT_FOUND if no block record exists.
        """
        unblockUser(userId: ID!): Boolean!

        # =============================================
        # Message Action Mutations (Feature 1.3.3)
        # =============================================

        """
        Reply to a specific message within a conversation.
        The caller must be a participant of conversationId.
        The replyToMessageId must belong to the same conversation (cross-conversation injection guard).
        """
        replyToMessage(conversationId: ID!, content: String!, replyToMessageId: ID!): Message!

        """
        Pin a message within its conversation.
        Sets message.pinnedAt and conversation.pinnedMessageId.
        Idempotent: if already pinned, returns the existing pinnedAt unchanged.
        """
        pinMessage(messageId: ID!): Message!

        """
        Unpin the currently pinned message.
        Clears message.pinnedAt and conversation.pinnedMessageId.
        Idempotent: if already unpinned, returns null pinnedAt without error.
        """
        unpinMessage(messageId: ID!): Message!

        """
        Delete a message.
        scope=EVERYONE: soft-delete for all (sender only, within 24 h). Sets deletedAt.
        scope=OWN: remove only from the current user's view (stub — no MessageHide table yet).
        """
        deleteMessage(messageId: ID!, scope: DeleteMessageScope!): Boolean!

        """
        Forward a message to another conversation.
        Creates a new message with the same content in targetConversationId.
        Cannot forward soft-deleted messages.
        """
        forwardMessage(messageId: ID!, targetConversationId: ID!): Message!
      }

      """
      Root Subscription type - all real-time subscriptions
      (To be implemented in future features)
      """
      type Subscription {
        _empty: String
      }
    `,
    resolvers: {
        Query: {
            ...userResolvers.Query,
            ...friendsResolvers.Query,
            ...sessionsResolvers.Query,
            ...conversationsResolvers.Query,
        },
        Mutation: {
            ...userResolvers.Mutation,
            ...authResolvers.Mutation,
            ...friendsResolvers.Mutation,
            ...sessionsResolvers.Mutation,
            ...conversationsResolvers.Mutation,
        },
        // Type-level resolvers
        User: userResolvers.User,
        // Type-level resolvers: use DataLoader to prevent N+1 queries
        FriendRequest: friendsResolvers.FriendRequest,
        Friendship: friendsResolvers.Friendship,
        Conversation: conversationsResolvers.Conversation,
        ConversationParticipant: conversationsResolvers.ConversationParticipant,
        Message: conversationsResolvers.Message,
    },
})
