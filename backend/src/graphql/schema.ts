/**
 * GraphQL Schema Definition
 *
 * Defines the GraphQL type system for the Ping API.
 * Uses GraphQL Yoga's createSchema for type-safe schema building.
 */

import { createSchema } from "graphql-yoga"
import { userResolvers, authResolvers, friendsResolvers } from "./resolvers"

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
        },
        Mutation: {
            ...authResolvers.Mutation,
            ...friendsResolvers.Mutation,
        },
    },
})
