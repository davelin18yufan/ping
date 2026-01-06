/**
 * GraphQL Schema Definition
 *
 * Defines the GraphQL type system for the Ping API.
 * Uses GraphQL Yoga's createSchema for type-safe schema building.
 */

import { createSchema } from "graphql-yoga";
import { userResolvers } from "./resolvers";

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
    Root Query type - all read operations
    """
    type Query {
      """
      Get the currently authenticated user.
      Requires valid session cookie.
      Returns null if not authenticated.
      """
      me: User
    }

    """
    Root Mutation type - all write operations
    (To be implemented in future features)
    """
    type Mutation {
      _empty: String
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
    },
  },
});
