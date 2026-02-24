/**
 * GraphQL Schema Definition
 *
 * Defines the GraphQL type system for the Ping API.
 * Uses GraphQL Yoga's createSchema for type-safe schema building.
 */

import { createSchema } from "graphql-yoga"
import { userResolvers, authResolvers, friendsResolvers, sessionsResolvers } from "./resolvers"

/**
 * GraphQL Schema
 *
 * Defines all types, queries, mutations, and subscriptions.
 * Currently implements:
 * - User type (matches Prisma User model)
 * - Query.me (get current authenticated user)
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
        Timestamp when email was verified (null if not verified)
        """
        emailVerified: String

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
        },
        Mutation: {
            ...authResolvers.Mutation,
            ...friendsResolvers.Mutation,
            ...sessionsResolvers.Mutation,
        },
        // Type-level resolvers: use DataLoader to prevent N+1 queries
        // when resolving FriendRequest.sender/receiver and Friendship.friend
        FriendRequest: friendsResolvers.FriendRequest,
        Friendship: friendsResolvers.Friendship,
    },
})
